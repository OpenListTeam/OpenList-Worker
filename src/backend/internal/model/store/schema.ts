/**
 * 关系型后端（D1 / MySQL）的表结构定义。
 *
 * 采用「主键列 + data JSON 列」宽表：主键列冗余存储 String(entity.id)（或
 * settings 的 key），用于 SQL 查询与唯一约束；data 列存储该行实体的完整
 * JSON（字段动态，增删无需改 DDL）。
 *
 * 注意：`key` 在 MySQL 是保留字，列名统一用反引号包裹。
 */

export const TABLE_NAMES = [
  "settings",
  "storages",
  "users",
  "shares",
  "metas",
  "plugins",
] as const

export type TableName = (typeof TABLE_NAMES)[number]

/** 每张表的实体主键列名（用于从实体对象提取主键值）。 */
export const TABLE_KEY: Record<TableName, string> = {
  settings: "key",
  storages: "id",
  users: "id",
  shares: "id",
  metas: "id",
  plugins: "id",
}

/** 主键值统一序列化为字符串，避免数字/字符串 id 混用导致的主键类型漂移。 */
export function keyOf(table: TableName, entity: any): string {
  return String(entity?.[TABLE_KEY[table]] ?? "")
}

/** 附加索引列（主键之外，冗余冗余常用查询字段）。 */
export const TABLE_EXTRA_COLUMNS: Record<TableName, string[]> = {
  settings: [],
  storages: ["mount_path"],
  users: ["username"],
  shares: [],
  metas: ["path"],
  plugins: [],
}

/**
 * SQLite 方言（Cloudflare D1）的建表语句。
 */
export const D1_SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS schema_info (k TEXT PRIMARY KEY, v TEXT)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS storages (id TEXT PRIMARY KEY, mount_path TEXT, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS metas (id TEXT PRIMARY KEY, path TEXT, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS plugins (id TEXT PRIMARY KEY, data TEXT NOT NULL)`,
]

/**
 * MySQL 方言的建表语句。
 */
export const MYSQL_SCHEMA: string[] = [
  "CREATE TABLE IF NOT EXISTS `schema_info` (`k` VARCHAR(255) PRIMARY KEY, `v` LONGTEXT)",
  "CREATE TABLE IF NOT EXISTS `settings` (`key` VARCHAR(255) PRIMARY KEY, `data` LONGTEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS `storages` (`id` VARCHAR(64) PRIMARY KEY, `mount_path` VARCHAR(512), `data` LONGTEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS `users` (`id` VARCHAR(64) PRIMARY KEY, `username` VARCHAR(255), UNIQUE KEY `uq_users_username` (`username`), `data` LONGTEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS `shares` (`id` VARCHAR(64) PRIMARY KEY, `data` LONGTEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS `metas` (`id` VARCHAR(64) PRIMARY KEY, `path` VARCHAR(512), `data` LONGTEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS `plugins` (`id` VARCHAR(64) PRIMARY KEY, `data` LONGTEXT NOT NULL)",
]
