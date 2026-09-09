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

/** 存储格式类型 */
export type StorageFormat = "map" | "key" | "sql"

/** 存储驱动类型 */
export type StorageDriver = "auto" | "blob" | "cfkv" | "kv" | "d1" | "do" | "mysql"

/** 旧版驱动类型（向后兼容） */
export type StoreDriver = "json" | "d1" | "mysql" | "kv"

/**
 * 驱动接口（底层 I/O）
 * 
 * 驱动负责与具体存储系统交互（KV、Blob、D1、MySQL 等），
 * 提供统一的键值读写接口和可选的 SQL 执行接口。
 */
export interface Driver {
  /** 驱动名称 */
  name: string

  /**
   * 检查驱动是否可用（是否配置了必要的环境变量/绑定）
   */
  isAvailable(env?: any): Promise<boolean>

  /**
   * 初始化驱动（建表、迁移等）
   */
  init(env?: any): Promise<void>

  /**
   * 键值操作（用于 map/key 格式）
   */
  get(key: string, env?: any): Promise<string | null>
  put(key: string, value: string, env?: any): Promise<void>
  delete(key: string, env?: any): Promise<void>
  list(prefix: string, env?: any): Promise<string[]>

  /**
   * SQL 操作（用于 sql 格式，可选）
   */
  query?(sql: string, params: any[], env?: any): Promise<any[]>
  execute?(sql: string, params: any[], env?: any): Promise<void>
  batch?(
    statements: Array<{ sql: string; params: any[] }>,
    env?: any
  ): Promise<void>

  /**
   * 健康检查
   */
  health(env?: any): Promise<any>
}

/**
 * 格式适配器接口
 * 
 * 格式适配器决定数据如何在驱动中存储和读取：
 * - map: 整对象 JSON（单个 key）
 * - key: 分 key 存储（每个实体一条记录）
 * - sql: 关系表（与 Go 后端一致）
 */
export interface FormatAdapter {
  /** 格式名称 */
  name: string

  /**
   * 加载完整数据
   */
  load(driver: Driver, env?: any): Promise<any | null>

  /**
   * 保存完整数据
   */
  save(data: any, driver: Driver, env?: any): Promise<boolean>

  /**
   * 单表操作（可选，用于性能优化）
   */
  getTable?(table: string, driver: Driver, env?: any): Promise<any[]>
  saveTable?(
    table: string,
    records: any[],
    driver: Driver,
    env?: any
  ): Promise<void>

  /**
   * 单记录操作（可选，用于性能优化）
   */
  getRecord?(
    table: string,
    key: string,
    driver: Driver,
    env?: any
  ): Promise<any | null>
  saveRecord?(
    table: string,
    key: string,
    record: any,
    driver: Driver,
    env?: any
  ): Promise<void>
  deleteRecord?(
    table: string,
    key: string,
    driver: Driver,
    env?: any
  ): Promise<void>
}

/**
 * 旧版后端接口（向后兼容）
 */
export interface StoreBackend {
  /** 后端标识名 */
  readonly name: string
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
