// telegram (Telegram Bot API 网盘) — 聊天即存储
//
// 与 K-Vault (https://github.com/katelya77/K-Vault) 的差异：本驱动要实现完整的
// StorageDriver 语义（list/mkdir/rename/remove/move/copy），而 Telegram Bot API
// **没有列举历史消息的方法**（getUpdates 只推送 24 小时内的增量，且 bot 收不到
// 自己发出的消息），因此目录结构必须由驱动自己维护 —— 见 manifest.ts。
//
// 一个 Telegram 聊天（群组 / 超级群 / 频道 / 甚至与 bot 的私聊）就是一个平铺的
// 消息池。聊天类型不限：目录索引存在 OpenList 侧（见 index.ts），Telegram 只存字节。

export interface DriverTelegramAddition {
  /** @BotFather 获取，形如 123456:ABC-DEF... */
  bot_token: string
  /** 目标聊天 id（数字或 @channelusername） */
  chat_id: string
  /** 可选：自定义 Bot API 端点（自建反代 / 测试用），默认 https://api.telegram.org */
  api_base?: string
  /** 可选：驱动根路径，映射到聊天根下的子目录 */
  root_path?: string
}

/** manifest 中记录的一个条目 */
export interface ManifestEntry {
  /** 条目名（不含路径） */
  n: string
  /** 目录为 true */
  d: true
  /** 该目录自身的 manifest head message id */
  m: number
}

export interface ManifestFile {
  /** 条目名 */
  n: string
  /** 文件 */
  d: false
  /** 承载文件的消息 id（deleteMessage 用） */
  m: number
  /** Bot API file_id（getFile 用） */
  f: string
  /** 字节数 */
  s: number
  /** Unix 秒 */
  t: number
}

/** 单个分片消息的内容 */
export interface ManifestChunk {
  v: 1
  e: Array<ManifestEntry | ManifestFile>
}

/** 目录 manifest 的 head 消息内容；分片过多时 e 为空并列出所有分片 */
export interface ManifestHead {
  v: 1
  /** 本 manifest 所属目录（便于排查与调试） */
  p: string
  /** 分片 message id 列表 */
  c: number[]
  /** 条目直接内联（未分片时） */
  e?: Array<ManifestEntry | ManifestFile>
}

/** Bot API 响应包装 */
export interface TgResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
  parameters?: { migrate_to_chat_id?: number; retry_after?: number }
}

export interface TgFile {
  file_id: string
  file_unique_id: string
  file_size?: number
  file_path?: string
}

export interface TgMessage {
  message_id: number
  date: number
  text?: string
  caption?: string
  document?: TgFile & { file_name?: string }
  audio?: TgFile & { file_name?: string }
  video?: TgFile & { file_name?: string }
  voice?: TgFile
  animation?: TgFile & { file_name?: string }
  video_note?: TgFile
  photo?: Array<TgFile & { width: number; height: number }>
  sticker?: TgFile
}

export interface TgChatFullInfo {
  id: number
  type: "private" | "group" | "supergroup" | "channel"
  title?: string
  username?: string
  description?: string
}