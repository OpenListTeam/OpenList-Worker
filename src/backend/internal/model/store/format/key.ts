/**
 * Key 格式适配器
 *
 * 将数据按表拆分，每个实体一条记录：
 * - settings_<key>
 * - users_<id>
 * - storages_<id>
 * - shares_<id>
 * - metas_<id>
 * - plugins_<id>
 *
 * 避免大 JSON，适合频繁读写单条记录的场景。
 *
 * 键名约束：EdgeOne KV 只接受字母、数字和下划线，因此分隔符用 `_`
 * 而不是 `:`，且 id 中的非法字符（如 UUID 的 `-`）需转义。
 *
 * 转义方案无需反向解析：所有读写都是"构造键名"，实体的主键值一律
 * 来自记录 JSON 本身，key 只用作存储地址。
 *
 * ## 全局索引（issue #125）
 *
 * 历史实现每次 load/save 都靠 `list()` 枚举键名，即使 6 张表合并成 1 次
 * 全局 list，Cloudflare 免费版 1000 次/天的 list 配额也只够约 1000 次
 * load/save —— 页面刷新几次就见底（且大库一次 list 还可能要翻多页）。
 *
 * 现在把「当前存活的实体键」写入 `KEY_INDEX_KEY`（见 keycodec）：
 *  - load：1 次 `get` 索引 + N 次 `get` 记录，不再消耗 list；
 *  - save：写记录 → 写新索引 → 按旧索引删除陈旧键，同样不消耗 list；
 *  - 索引缺失（旧部署首次升级 / 索引被删）时回退到 1 次 list 并**补写索引**，
 *    因此升级无需手工迁移，之后也不再重复 list；
 *  - 索引损坏或超过单值上限（EdgeOne KV 1 MB）时不使用它并回退 list，
 *    宁可多耗一次 list，也不能让读取看不到数据。
 *
 * 索引是「成员名单」而非数据本身：记录值仍以实体键为唯一权威。写入顺序
 * 刻意是「先写记录 → 再写索引 → 最后删陈旧键」，任一步失败都不会让
 * 已经成功写入的记录从索引中消失（最坏情况只是残留几个无引用的旧键）。
 */
import type { FormatAdapter, Driver } from "../types"
import { TABLE_NAMES, TABLE_KEY, type TableName } from "../schema"
import { entityKeyOf, tableKeyPrefix, KEY_INDEX_KEY } from "../keycodec"

const INIT_MARK = "openlist_config"

/** 索引文档版本：结构变化时递增，旧版本会按「无索引」回退到 list。 */
const INDEX_VERSION = 1

/**
 * 索引值的字节上限。
 *
 * EdgeOne KV 单个 value 最大 1 MB，Cloudflare 为 25 MiB；取 900 KB 留出
 * 余量。索引里的键名均为 ASCII（keycodec 保证），因此 length 近似等于字节数。
 * 超过上限时放弃索引：大库继续走 list，行为与升级前一致。
 */
const INDEX_MAX_BYTES = 900 * 1024

/**
 * 记录读写的并发度。
 *
 * key 格式一次 load 要逐条 get，默认库就有 100+ 条记录；串行执行在边缘
 * 网络上会把单次请求拖到数秒。并发 12 把往返压缩到约 1/10，同时远低于
 * Workers 的子请求上限。
 */
const IO_CONCURRENCY = 12

/** 超大索引告警只打印一次，避免每次 load/save 刷屏。 */
let oversizeWarned = false

/** 构造表前缀（使用共享键名编码，兼容 EdgeOne KV 字符集约束） */
function tablePrefix(table: string): string {
  return tableKeyPrefix(table)
}

/** 构造完整键名 */
function fullKeyOf(table: string, id: string): string {
  return entityKeyOf(table, id)
}

/**
 * 以受限并发执行异步任务，结果顺序与输入一致。
 *
 * 不使用 `Promise.all(items.map(fn))`：记录数可能上千，一次性并发全部
 * 子请求会撞上平台限制；也不串行，否则每次 load 的耗时随记录数线性增长。
 */
async function runBounded<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(Math.max(1, limit), items.length) },
    async () => {
      while (true) {
        const index = cursor++
        if (index >= items.length) return
        results[index] = await fn(items[index], index)
      }
    },
  )
  await Promise.all(workers)
  return results
}

/**
 * 读取全局索引。
 *
 * 任何「读不到 / 解析失败 / 结构不识别 / 版本不符」都返回 null，由调用方
 * 回退到 list。索引只是加速缓存，绝不能因为它损坏就返回空数据库 ——
 * 那会被上层当成「全新部署」，进而用空库覆盖真实数据。
 */
async function readIndex(driver: Driver, env?: any): Promise<string[] | null> {
  let raw: string | null
  try {
    raw = await driver.get(KEY_INDEX_KEY, env)
  } catch (err) {
    console.warn(
      "[keyFormat] failed to read key index; falling back to list:",
      err,
    )
    return null
  }
  if (!raw) return null

  try {
    const parsed: any = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.v === INDEX_VERSION &&
      Array.isArray(parsed.keys) &&
      parsed.keys.every((k: any) => typeof k === "string" && k.length > 0)
    ) {
      return parsed.keys as string[]
    }
    console.warn(
      "[keyFormat] key index has an unknown shape; falling back to list",
    )
  } catch (err) {
    console.warn(
      "[keyFormat] key index is not valid JSON; falling back to list:",
      err,
    )
  }
  return null
}

/**
 * 写入全局索引。
 *
 * @returns true 表示索引已落盘；false 表示索引过大被跳过（此时会删除旧索引，
 *          否则下一次 load 会读到「缺少新键」的旧索引而看不到新数据）。
 */
async function writeIndex(
  driver: Driver,
  keys: string[],
  env?: any,
): Promise<boolean> {
  const payload = JSON.stringify({ v: INDEX_VERSION, keys })

  if (payload.length > INDEX_MAX_BYTES) {
    if (!oversizeWarned) {
      oversizeWarned = true
      console.warn(
        `[keyFormat] key index is ${payload.length} bytes, over the ` +
          `${INDEX_MAX_BYTES}-byte limit; falling back to list() for this ` +
          `deployment. Reduce record count or use DB_FORMAT=map/sql.`,
      )
    }
    // 关键：旧索引必须删除，否则它会成为一份「永远不会被修正」的过期名单。
    try {
      await driver.delete(KEY_INDEX_KEY, env)
    } catch (err) {
      console.warn("[keyFormat] failed to drop stale key index:", err)
    }
    return false
  }

  await driver.put(KEY_INDEX_KEY, payload, env)
  return true
}

/**
 * 读取当前存活键：优先索引，缺失时回退 list。
 *
 * `fromIndex` 用于决定是否需要补写索引；即使索引存在，返回的键也可能
 * 含已删除实体（删除阶段失败），后续 get 会得到 null 并被跳过。
 */
async function readMembership(
  driver: Driver,
  env?: any,
): Promise<{ keys: string[]; fromIndex: boolean }> {
  const indexed = await readIndex(driver, env)
  if (indexed) return { keys: indexed, fromIndex: true }
  return { keys: await driver.list("", env), fromIndex: false }
}

/**
 * 将一次全局 list 的结果按表前缀分组。
 *
 * 键名统一为 `<table>_<id>`（见 keycodec），因此一次空前缀 list 即可取回
 * 全部表的键，再按前缀分拣 —— 结果与逐表 list 完全一致。排序保证记录顺序
 * 与 KV list 的字典序一致，不因索引建立/迁移而变化。
 *
 * 命名空间中不属于任何表前缀的键（如 INIT_MARK、索引键、其他应用的键）
 * 会被忽略，与旧实现「逐表前缀 list 天然排除它们」的行为一致。
 */
function groupKeysByTable(allKeys: string[]): Record<TableName, string[]> {
  const out = {} as Record<TableName, string[]>
  for (const table of TABLE_NAMES) out[table] = []

  // 去重 + 排序：索引损坏/人工编辑可能产生重复键，重复 get 会返回重复记录。
  for (const key of [...new Set(allKeys)].sort()) {
    for (const table of TABLE_NAMES) {
      if (key.startsWith(tablePrefix(table))) {
        out[table].push(key)
        break
      }
    }
  }
  return out
}

/** 并发读取并解析一批实体记录（空值跳过，损坏记录告警后跳过）。 */
async function fetchRecords(
  keys: string[],
  driver: Driver,
  env?: any,
): Promise<any[]> {
  const raws = await runBounded(keys, IO_CONCURRENCY, (key) =>
    driver.get(key, env),
  )

  const records: any[] = []
  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i]
    if (!raw) continue
    try {
      records.push(JSON.parse(raw))
    } catch (err) {
      console.warn(`[keyFormat] Failed to parse ${keys[i]}:`, err)
    }
  }
  return records
}

export const keyFormat: FormatAdapter = {
  name: "key",

  async load(driver: Driver, env?: any): Promise<any | null> {
    // 检查是否已初始化
    const mark = await driver.get(INIT_MARK, env)
    if (!mark) return null

    const { keys, fromIndex } = await readMembership(driver, env)
    const grouped = groupKeysByTable(keys)

    // 旧部署首次升级 / 索引被删：本次已付出 1 次 list，顺手把索引补上，
    // 后续请求即可只走 get。补写失败不影响本次读取（下次再扫一次）。
    // 只收录实体键：索引键、INIT_MARK 与其他应用的键不进入名单。
    if (!fromIndex) {
      const entityKeys = TABLE_NAMES.flatMap((table) => grouped[table]).sort()
      try {
        await writeIndex(driver, entityKeys, env)
      } catch (err) {
        console.warn(
          "[keyFormat] failed to persist key index; next load will rescan:",
          err,
        )
      }
    }

    const out: Record<string, any> = {}

    for (const table of TABLE_NAMES) {
      out[table] = await fetchRecords(grouped[table], driver, env)
    }

    return out
  },

  async save(data: any, driver: Driver, env?: any): Promise<boolean> {
    // 先写新数据，**最后**清理陈旧键。
    //
    // 稳定性不变量：save 失败不得让「原有数据整体消失」。
    // 历史实现是「先删光所有前缀键，再写新数据」：一旦写入阶段失败（网络抖动、
    // 配额、实例被杀），旧记录已被删除、新记录尚未写入，数据库直接变成空表。
    // 故障注入实测：users 从 1 条变为 0 条 —— 这是数据丢失，不是「保存失败」。
    //
    // 改为先写后删后，失败时的最坏情况是**残留**旧键（可被下一次成功保存清理），
    // 而不会丢数据；正常成功路径的最终状态与原来完全一致。
    // Map 天然去重：同一 id 出现多次时只保留最后一次，key 名也不会重复写。
    const writes = new Map<string, string>()

    for (const table of TABLE_NAMES) {
      const keyCol = TABLE_KEY[table]
      const records = data?.[table] || []

      for (const record of records) {
        const id = String(record?.[keyCol] ?? "")
        if (!id) continue

        writes.set(fullKeyOf(table, id), JSON.stringify(record))
      }
    }

    const liveKeys = new Set(writes.keys())

    // 并发写记录：key 格式的默认库就有 100+ 条，串行写会明显拖慢保存。
    await runBounded([...writes], IO_CONCURRENCY, ([key, value]) =>
      driver.put(key, value, env),
    )

    // 旧成员名单：优先索引；索引缺失（首次保存/旧部署）才扫一次 list。
    const { keys: previousKeys } = await readMembership(driver, env)

    // 先写索引，再删陈旧键。顺序不能反：
    //   - 索引先写：并发读最多看到「新名单 + 旧残留键」，不会看到「旧名单 + 已删除键」；
    //   - 若索引写失败，删除旧索引并抛错，下一次 load 会 list 兜底看到全部新记录。
    try {
      await writeIndex(driver, [...liveKeys].sort(), env)
    } catch (err) {
      try {
        await driver.delete(KEY_INDEX_KEY, env)
      } catch {
        // 删除失败也只能作罢：下一次 load 的索引与记录不一致时仍能读到已有记录，
        // 但新记录可能暂时不可见。此处不应掩盖原始写入错误。
      }
      throw err
    }

    // 清理本快照中已不存在的键（删除的实体 / 改名的键）。
    // 只处理属于已知表前缀的键，避免误删 INIT_MARK、索引键或其他应用的键。
    const stale: string[] = []
    const grouped = groupKeysByTable(previousKeys)
    for (const table of TABLE_NAMES) {
      for (const key of grouped[table]) {
        if (!liveKeys.has(key)) stale.push(key)
      }
    }
    await runBounded(stale, IO_CONCURRENCY, (key) => driver.delete(key, env))

    // 标记已初始化
    await driver.put(INIT_MARK, String(Date.now()), env)
    return true
  },

  async getTable(table: string, driver: Driver, env?: any): Promise<any[]> {
    const prefix = tablePrefix(table)
    const indexed = await readIndex(driver, env)
    // 有索引时直接过滤，不再 list（issue #125 的 list 配额问题）
    const keys = indexed
      ? indexed.filter((key) => key.startsWith(prefix)).sort()
      : await driver.list(prefix, env)

    return fetchRecords(keys, driver, env)
  },

  async saveTable(
    table: string,
    records: any[],
    driver: Driver,
    env?: any,
  ): Promise<void> {
    const keyCol = TABLE_KEY[table as keyof typeof TABLE_KEY]
    const prefix = tablePrefix(table)

    const indexed = await readIndex(driver, env)
    const oldKeys = indexed
      ? indexed.filter((key) => key.startsWith(prefix))
      : await driver.list(prefix, env)

    // 同 save：先写新记录，再删改名前/已删除的旧键，避免失败时整表变空。
    const newKeys = new Set<string>()
    const writes: Array<{ key: string; value: string }> = []
    for (const record of records) {
      const id = String(record?.[keyCol] ?? "")
      if (!id) continue

      const key = fullKeyOf(table, id)
      newKeys.add(key)
      writes.push({ key, value: JSON.stringify(record) })
    }

    await runBounded(writes, IO_CONCURRENCY, (w) =>
      driver.put(w.key, w.value, env),
    )

    // 索引存在时同步替换该表的键；索引缺失就保持缺失，下一次 load 会 list 重建。
    if (indexed) {
      const merged = indexed.filter((key) => !key.startsWith(prefix))
      merged.push(...newKeys)
      await writeIndex(driver, merged.sort(), env)
    }

    await runBounded(
      oldKeys.filter((key) => !newKeys.has(key)),
      IO_CONCURRENCY,
      (key) => driver.delete(key, env),
    )
  },

  async getRecord(
    table: string,
    key: string,
    driver: Driver,
    env?: any,
  ): Promise<any | null> {
    const fullKey = fullKeyOf(table, key)
    const raw = await driver.get(fullKey, env)
    if (!raw) return null

    try {
      return JSON.parse(raw)
    } catch (err) {
      console.warn(`[keyFormat] Failed to parse ${fullKey}:`, err)
      return null
    }
  },

  async saveRecord(
    table: string,
    key: string,
    record: any,
    driver: Driver,
    env?: any,
  ): Promise<void> {
    const fullKey = fullKeyOf(table, key)
    const value = JSON.stringify(record)
    await driver.put(fullKey, value, env)

    // 索引存在时必须同步加入，否则后续 load 会漏掉这条记录。
    const indexed = await readIndex(driver, env)
    if (indexed && !indexed.includes(fullKey)) {
      await writeIndex(driver, [...indexed, fullKey].sort(), env)
    }
  },

  async deleteRecord(
    table: string,
    key: string,
    driver: Driver,
    env?: any,
  ): Promise<void> {
    const fullKey = fullKeyOf(table, key)
    await driver.delete(fullKey, env)

    const indexed = await readIndex(driver, env)
    if (indexed?.includes(fullKey)) {
      await writeIndex(
        driver,
        indexed.filter((k) => k !== fullKey),
        env,
      )
    }
  },
}
