-- OpenList D1 数据库初始化脚本
-- 与 src/backend/internal/model/store/schema.ts 的 D1_SCHEMA 保持一致。
-- 注意：代码首次请求会自动执行这些建表语句（IF NOT EXISTS，幂等），
-- 本脚本仅用于手动初始化 / 验证。
--
-- 本地执行（wrangler dev 的本地 SQLite 模拟）：
--   wrangler d1 execute openlist --local --file scripts/d1-schema.sql
-- 远程执行（需已 wrangler login 且 database_id 为真实值）：
--   wrangler d1 execute openlist --file scripts/d1-schema.sql

CREATE TABLE IF NOT EXISTS schema_info (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS storages (id TEXT PRIMARY KEY, mount_path TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS metas (id TEXT PRIMARY KEY, path TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS plugins (id TEXT PRIMARY KEY, data TEXT NOT NULL);
