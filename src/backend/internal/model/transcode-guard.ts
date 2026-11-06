/**
 * Worker 侧转码能力的强制禁用。
 *
 * Worker 运行时没有 ffmpeg / ffprobe，也没有可写本地磁盘（切片缓存），
 * 因此「转码」相关设置不仅无效，还会让前端展示一个永远失败的开关。
 *
 * 策略（三处兜底，缺一不可）：
 *   1. 设置列表接口过滤掉 transcode_* 键 —— 前端不渲染；
 *   2. 设置保存接口拒绝写入 —— 即使手工构造请求也存不进去；
 *   3. 读取设置时强制 transcode_enabled=false —— 即使直接改了数据库也不生效。
 *
 * 保留 `/fs/transcode/play` 路由但返回 501，明确告知能力不存在，
 * 避免客户端拿到「成功但 no-op」的响应后一直重试。
 */

/** Go 版 internal/conf/const.go 中全部 transcode 设置键（含前缀兜底） */
export const TRANSCODE_SETTING_KEYS = new Set([
  "transcode_enabled",
  "transcode_min_size_gb",
  "transcode_min_bitrate_mbps",
  "transcode_source_codecs",
  "transcode_source_extensions",
  "transcode_output_format",
  "transcode_output_codec",
  "transcode_output_bitrate",
  "transcode_output_audio_codec",
  "transcode_output_audio_bitrate",
  "transcode_output_resolution",
  "transcode_segment_duration",
  "transcode_hwaccel",
  "transcode_ffmpeg_path",
  "transcode_ffprobe_path",
  "transcode_run_mode",
  "transcode_worker_secret",
  "transcode_cache_path",
  "transcode_cache_max_gb",
  "transcode_job_timeout_min",
  "transcode_local_concurrency",
  "transcode_idle_timeout_sec",
  "transcode_chunk_duration_sec",
  "transcode_max_chunk_concurrency",
  "transcode_chunk_idle_sec",
  "transcode_chunk_prefetch",
])

export const TRANSCODE_DISABLED_MESSAGE =
  "Transcoding is not available in the Worker runtime (no ffmpeg). Playback falls back to direct streaming."

export function isTranscodeSettingKey(key: unknown): boolean {
  const k = String(key || "").trim().toLowerCase()
  if (!k) return false
  return k.startsWith("transcode_") || TRANSCODE_SETTING_KEYS.has(k)
}

/** 从设置数组中剔除全部转码键（用于 /admin/setting/list） */
export function stripTranscodeSettings<T extends { key?: string }>(
  settings: T[],
): T[] {
  return settings.filter((s) => !isTranscodeSettingKey(s?.key))
}

/**
 * 把设置对象里的转码开关强制关掉（用于 getSettings / 公共设置）。
 * 其他 transcode_* 字段也清空，避免前端读到非默认值。
 */
export function disableTranscodeSettings(
  settings: Record<string, any>,
): Record<string, any> {
  for (const key of Object.keys(settings)) {
    if (isTranscodeSettingKey(key)) {
      settings[key] = key === "transcode_enabled" ? "false" : ""
    }
  }
  return settings
}

/** 保存设置时的兜底：转码键一律落成禁用值 */
export function normalizeTranscodeSettingValue(key: string, value: any): any {
  if (!isTranscodeSettingKey(key)) return value
  return key === "transcode_enabled" ? "false" : ""
}
