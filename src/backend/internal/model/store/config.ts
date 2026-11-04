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
 * 优先级：显式传入的 env > process.env > 空对象。即 env 对象**没有**该键时
 * 会回退到 process.env（自托管场景依赖此行为），与 readFormat 的缺省值同源。
 */
export function readEnv(key: string, defaultValue: string, env?: any): string {
  const e = env || (typeof process !== "undefined" ? process.env : {}) || {}
  return String(e[key] || "").trim().toLowerCase() || defaultValue
}

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
