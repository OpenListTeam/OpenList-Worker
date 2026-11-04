/**
 * 存储配置解析（DB_DRIVER / DB_FORMAT 的 env 读取）。
 *
 * 单独成模块的原因：驱动层（driver/*.ts）的健康检查与后端工厂必须使用**同一份**
 * 解析逻辑。driver 已被 backend.ts 导入，若让 driver 反向从 backend.ts 取
 * readFormat() 就会形成循环依赖；把这两个函数放到更底层即可共用一份实现，
 * 避免两处各写一遍、日后漂移（见 PR #163 评审意见）。
 */
import type { StorageFormat } from "./types"

/**
 * 读取环境变量（支持 process.env 和 env 对象）。
 *
 * 优先级：显式传入且为真值的 env > process.env > 空对象。
 * 注意是**整体**回退：`env` 非空时只用 env，即使它没有该键也不会再去看
 * process.env（`env || process.env` 只判 env 本身）。这条语义与
 * backend.ts/readFormat 完全一致；若有人按「逐键回退」去"修正"它，
 * 自托管场景下 KV/D1 配置的解析结果会变，属于破坏性变更。
 */
export function readEnv(key: string, defaultValue: string, env?: any): string {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}
  return String(e[key] || "").trim().toLowerCase() || defaultValue
}

/**
 * KV 健康探测使用的键/前缀。
 *
 * 两处必须同名：kv 驱动的 health()（get + list 前缀）与 ESA 入口
 * （esa-entry.ts 的原始 EdgeKV 探测，结果通过 healthCheck 复用）。
 * 名字不一致会让排查「ESA 每请求 KV 子请求配额」时对不上账，
 * 也容易让人误以为探测走了两个不同的键（PR #163 评审）。
 */
export const KV_HEALTH_PROBE_KEY = "__health_check__"

/**
 * 读取存储格式配置。
 *
 * 契约（与官方文档一致）：DB_FORMAT 与 DB_DRIVER 是**正交**的两个维度 ——
 * 前者决定「怎么组织数据」（map / key / sql），后者决定「存到哪里」。
 * 因此 DB_FORMAT 缺省时**一律取全局默认 map**，绝不按驱动名改写：
 * kv / d1 / blob / do / mysql 的缺省格式都是 map。
 *
 * 历史遗留（已移除）：旧版 DB_DRIVER=kv 承担「分表存储」语义，重构为
 * 「驱动层 + 格式层分离」后曾加过一条 `DB_DRIVER=kv 且无 DB_FORMAT → key`
 * 的兼容映射。它的代价是「只设了 DB_DRIVER」的结果依赖驱动名（d1 得 map、
 * kv 得 key），且升级用户会静默从 map 布局切到 key 布局（两种布局的键名
 * 不同，互相读不到）。分表请显式配置 DB_FORMAT=key。
 */
export function readFormat(env?: any): StorageFormat {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}

  // 向后兼容：DB_DRIVER=json → map（旧驱动别名，与 readDriver 的 json→auto 成对）
  if (String(e.DB_DRIVER || "").trim().toLowerCase() === "json") {
    return "map"
  }

  return readEnv("DB_FORMAT", "map", env) as StorageFormat
}
