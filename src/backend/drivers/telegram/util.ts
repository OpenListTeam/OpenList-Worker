// Telegram Bot API 客户端
//
// 安全约定：错误信息里**绝不回显 bot_token**（URL 形如 /bot<token>/method，
// 直接把 URL 抛出去等于把凭据写进日志）。错误只带方法名与 Telegram 的 description。

import type {
  DriverTelegramAddition,
  TgChatFullInfo,
  TgFile,
  TgMessage,
  TgResponse,
} from "./types"

export const DEFAULT_API_BASE = "https://api.telegram.org"

/** Bot API 单次上传上限 50MB；下载（getFile）上限 20MB —— 硬限制，无法绕过 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
export const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024

export class TelegramApiError extends Error {
  readonly method: string
  readonly errorCode?: number
  readonly retryAfter?: number
  /** 群组升级为超级群后 Telegram 给出的新 chat_id（仅在迁移错误时存在） */
  readonly migrateToChatId?: number
  constructor(
    method: string,
    message: string,
    errorCode?: number,
    retryAfter?: number,
    migrateToChatId?: number,
  ) {
    super(`[Telegram] ${method}: ${message}`)
    this.name = "TelegramApiError"
    this.method = method
    this.errorCode = errorCode
    this.retryAfter = retryAfter
    this.migrateToChatId = migrateToChatId
  }
}

function normalizeBase(raw?: string): string {
  if (!raw) return DEFAULT_API_BASE
  try {
    return new URL(String(raw)).toString().replace(/\/+$/, "")
  } catch {
    throw new TelegramApiError("init", `api_base 不是合法 URL`)
  }
}

export class ClientTelegram {
  readonly chatId: string
  private token: string
  private base: string

  constructor(addition: DriverTelegramAddition) {
    this.token = (addition.bot_token || "").trim()
    this.chatId = String(addition.chat_id || "").trim()
    this.base = normalizeBase(addition.api_base)
  }

  init(): void {
    if (!this.token) throw new TelegramApiError("init", "bot_token 不能为空")
    if (!/^\d+:-?[\w-]+$/.test(this.token) && !/^\d+:[\w-]{30,}$/.test(this.token)) {
      // 只做形态校验，不回显内容
      if (!/^\d+:[\w-]{20,}$/.test(this.token)) {
        throw new TelegramApiError("init", "bot_token 格式不合法（应形如 123456:AA...）")
      }
    }
    if (!this.chatId) throw new TelegramApiError("init", "chat_id 不能为空")
  }

  /** API 端点 URL —— 仅内部使用，禁止拼进错误信息 */
  private url(method: string): string {
    return `${this.base}/bot${this.token}/${method}`
  }

  /** 文件下载 URL（有效期至少 1 小时，不可长期缓存） */
  fileUrl(filePath: string): string {
    return `${this.base}/file/bot${this.token}/${String(filePath).replace(/^\/+/, "")}`
  }

  private async call<T>(
    method: string,
    body?: Record<string, unknown>,
    _retried = false,
  ): Promise<T> {
    let resp: Response
    try {
      resp = await fetch(this.url(method), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      })
    } catch (e) {
      throw new TelegramApiError(method, `网络请求失败：${(e as Error)?.message || e}`)
    }
    const json = (await resp.json().catch(() => ({}))) as TgResponse<T>
    if (!json.ok) {
      // 群组升级为超级群：旧的数字 chat_id 失效，跟进新 id 重试一次
      const migrateTo = json.parameters?.migrate_to_chat_id
      if (migrateTo && !_retried) {
        this.chatId = String(migrateTo)
        return this.call<T>(method, body, true)
      }
      throw new TelegramApiError(
        method,
        json.description || `HTTP ${resp.status}`,
        json.error_code,
        json.parameters?.retry_after,
        migrateTo,
      )
    }
    return json.result as T
  }

  /** 只读调用统一用 POST；Bot API 接受 POST 传 chat_id */
  private async read<T>(
    method: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    return this.call<T>(method, body)
  }

  async getMe(): Promise<{ username?: string; id?: number }> {
    return this.call("getMe")
  }

  async getChat(): Promise<TgChatFullInfo> {
    return this.read("getChat", { chat_id: this.chatId })
  }

  async editChatDescription(description: string): Promise<void> {
    await this.call("editChatDescription", {
      chat_id: this.chatId,
      description,
    })
  }

  async sendMessage(text: string): Promise<TgMessage> {
    return this.call<TgMessage>("sendMessage", {
      chat_id: this.chatId,
      text,
    })
  }

  async editMessageText(messageId: number, text: string): Promise<TgMessage> {
    return this.call<TgMessage>("editMessageText", {
      chat_id: this.chatId,
      message_id: messageId,
      text,
    })
  }

  async deleteMessage(messageId: number): Promise<void> {
    await this.call("deleteMessage", {
      chat_id: this.chatId,
      message_id: messageId,
    })
  }

  /**
   * 同聊天内复制一条消息 —— Telegram 侧真正的字节级复制，
   * 比「下载再上传」省一个带宽往返，也不受 20MB 下载上限影响。
   */
  async copyMessage(messageId: number): Promise<TgMessage> {
    return this.call<TgMessage>("copyMessage", {
      chat_id: this.chatId,
      from_chat_id: this.chatId,
      message_id: messageId,
    })
  }

  /** 上传文档，返回消息（含 file_id 与 message_id） */
  async sendDocument(
    filename: string,
    content: Buffer | Uint8Array,
    mime = "application/octet-stream",
  ): Promise<TgMessage> {
    if (content.byteLength > MAX_UPLOAD_BYTES) {
      throw new TelegramApiError(
        "sendDocument",
        `文件 ${content.byteLength} 字节超过 Bot API 上传上限 ${MAX_UPLOAD_BYTES} 字节（50MB）`,
      )
    }
    const form = new FormData()
    form.append("chat_id", this.chatId)
    const buf =
      content instanceof Uint8Array
        ? new Blob([content])
        : new Blob([content as unknown as BlobPart])
    form.append("document", buf, filename)

    let resp: Response
    try {
      resp = await fetch(this.url("sendDocument"), { method: "POST", body: form })
    } catch (e) {
      throw new TelegramApiError(
        "sendDocument",
        `网络请求失败：${(e as Error)?.message || e}`,
      )
    }
    const json = (await resp.json().catch(() => ({}))) as TgResponse<TgMessage>
    if (!json.ok || !json.result) {
      throw new TelegramApiError(
        "sendDocument",
        json.description || `HTTP ${resp.status}`,
        json.error_code,
        json.parameters?.retry_after,
      )
    }
    return json.result
  }

  /** 从发送结果里取 file_id（不同媒体类型字段不同） */
  static pickFileId(m: TgMessage): TgFile | null {
    if (m.document?.file_id) return m.document
    if (m.video?.file_id) return m.video
    if (m.audio?.file_id) return m.audio
    if (m.animation?.file_id) return m.animation
    if (m.voice?.file_id) return m.voice
    if (m.video_note?.file_id) return m.video_note
    if (m.sticker?.file_id) return m.sticker
    if (Array.isArray(m.photo) && m.photo.length) {
      // 取最大尺寸那张
      return m.photo[m.photo.length - 1]
    }
    return null
  }

  /** getFile → 直链。超 20MB 时 Telegram 不返回 file_path。 */
  async resolveDownload(
    fileId: string,
  ): Promise<{ url: string; size: number }> {
    const f = await this.read<TgFile>("getFile", { file_id: fileId })
    if (!f?.file_path) {
      throw new TelegramApiError(
        "getFile",
        "Telegram 未返回 file_path。Bot API 只能下载 ≤20MB 的文件，"+
          "超过该上限的文件无法通过 Bot API 取回。",
      )
    }
    return { url: this.fileUrl(f.file_path), size: f.file_size || 0 }
  }
}