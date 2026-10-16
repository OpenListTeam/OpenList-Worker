// Cloudflare R2 驱动类型定义。
//
// 两种接入方式（同一驱动内统一）：
//   1. binding 模式：Workers 的 R2 bucket binding 直连（无需 API Token）
//   2. key/api 模式：S3 兼容 API（AccessKeyId + SecretAccessKey，可跨账号/外部访问）
export interface R2Addition {
  /** R2 bucket binding 变量名（wrangler r2_buckets[].binding），binding 模式必填 */
  bucket_binding?: string
  /**
   * 接入方式选择：
   *   auto（默认）- 配了 bucket_binding 用 binding，否则回退 S3 兼容 API
   *   binding     - 强制 binding（未配置/无法解析时直接报错，不做静默回退）
   */
  mode?: "auto" | "binding" | string
  /** 账号 ID（api 模式的 endpoint 可按它自动推导） */
  account_id?: string
  /** 桶名。binding 模式下仅用于展示；api 模式必填 */
  bucket?: string
  /** endpoint（留空时按 account_id 推导 https://<account>.r2.cloudflarestorage.com） */
  endpoint?: string
  /** 签名区域，R2 固定为 auto */
  region?: string
  access_key_id?: string
  secret_access_key?: string
  session_token?: string
  /** 存储根目录（桶内前缀） */
  root_folder_path?: string
  /** 目录占位文件名（空值等价默认 .openlist） */
  placeholder?: string
  /** api 模式预签名直链有效期（小时，R2 上限 7 天） */
  sign_url_expire?: number | string
  /** 自定义域名（R2 公开域名 / CNAME），设置后直链走该域名 */
  custom_host?: string
  /** 自定义域名去掉桶名前缀（r2.dev / 已绑定为桶根域的域名） */
  remove_bucket?: boolean
  order_by?: "name" | "size" | "modified" | string
  order_direction?: "asc" | "desc" | string
}

/**
 * R2 bucket binding 的最小接口（结构子集，避免依赖 @cloudflare/workers-types）。
 *
 * 与 KV 同理必须做接口形状校验：env 里同名变量可能只是普通字符串。
 */
/**
 * R2 的 range 语义（与 S3 的 start/end 不同，注意换算）：
 *   - { offset, length }：从 offset 起读 length 字节（length 可省略 = 到末尾）
 *   - { suffix }：读取末尾 suffix 字节
 */
export interface R2RangeLike {
  offset?: number
  length?: number
  suffix?: number
}

export interface R2BucketLike {
  head(key: string): Promise<R2ObjectLike | null>
  get(
    key: string,
    options?: {
      range?: R2RangeLike | Headers
      onlyIf?: Headers
    },
  ): Promise<R2ObjectBodyLike | null>
  put(
    key: string,
    value:
      | ReadableStream
      | ArrayBuffer
      | ArrayBufferView
      | string
      | Blob
      | null,
    options?: {
      httpMetadata?: { contentType?: string }
    },
  ): Promise<R2ObjectLike | null>
  delete(keys: string | string[]): Promise<void>
  list(options?: {
    prefix?: string
    delimiter?: string
    cursor?: string
    limit?: number
  }): Promise<R2ListResultLike>
}

export interface R2ObjectLike {
  key: string
  size: number
  etag: string
  uploaded?: Date | string
  httpMetadata?: { contentType?: string }
}

export interface R2ObjectBodyLike extends R2ObjectLike {
  body?: ReadableStream<Uint8Array>
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface R2ListResultLike {
  objects?: R2ObjectLike[]
  delimitedPrefixes?: string[]
  truncated?: boolean
  /** 不透明分页令牌，仅 truncated=true 时出现；传回下一页 list */
  cursor?: string
}
