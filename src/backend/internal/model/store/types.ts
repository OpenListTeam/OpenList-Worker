/**
 * 持久化后端接口定义。
 *
 * 设计目标：业务层（server/*.ts、internal/op/*.ts）只依赖 db.ts 暴露的
 * getDb()/saveDb() 等「整对象」契约，契约之下由本接口抽象出不同的持久化
 * 目标（JSON/KV/Blob、Cloudflare D1、MySQL）。
 *
 * 关键约定：后端收到/返回的 data 均为「已加密」的完整配置对象（加密由
 * db.ts 的 sealDb/unsealDb 在持久化边界完成），因此后端无需关心加密细节。
 */
export type StoreDriver = "json" | "d1" | "mysql"

export interface StoreBackend {
  /** 后端标识名 */
  readonly name: StoreDriver
  /**
   * 读取完整配置对象（已加密）。无数据时返回 null（由上层回退到默认值）。
   */
  load(env?: any): Promise<any | null>
  /**
   * 写入完整配置对象（已加密）。成功返回 true；未配置持久化目标时返回 false；
   * 写入失败应抛出异常（由上层包装成可读错误）。
   */
  save(data: any, env?: any): Promise<boolean>
  /** 是否配置了真实可用的持久化目标。未实现时视为始终已配置。 */
  isConfigured?(env?: any): Promise<boolean>
  /** 建表 / 迁移（D1、MySQL 需要）。应幂等。 */
  init?(env?: any): Promise<void>
  /** 健康检查，用于 /debug/info 与 /admin/kv/status。 */
  health?(env?: any): Promise<any>
}
