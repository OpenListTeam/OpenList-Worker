// 夸克网盘签到 —— 数据契约。
//
// 参考实现：https://github.com/Liu8Can/Quark_Auto_Check_In
// 其 checkIn_Quark.py 用 GitHub Actions 定时跑；本仓库把它改为「设置开关 +
// /task/checkin 端点」，平台调度器（EdgeOne Schedules 等）按 cron 打这个端点即可。

/** 单个解析后的账号 */
export interface QuarkAccount {
  /** 展示名，缺省为「账号N」 */
  user: string
  /** 三项凭据 */
  kps: string
  sign: string
  vcode: string
}

/** 成长信息中与签到相关的字段（只声明用到的） */
export interface QuarkCapSign {
  /** 今日是否已签到 */
  sign_daily?: boolean
  /** 今日签到所得容量（字节） */
  sign_daily_reward?: number
  /** 连签进度 */
  sign_progress?: number
  /** 连签目标 */
  sign_target?: number
}

export interface QuarkGrowthInfo {
  cap_sign?: QuarkCapSign
  /** 网盘总容量（字节） */
  total_capacity?: number
  /** 累计签到容量（字节） */
  sign_reward_capacity?: number
  cap_composition?: { sign_reward?: number }
  /** 88VIP 标记（字段名本身就叫 88VIP） */
  "88VIP"?: boolean
}

/** 单个账号的执行结果 */
export interface QuarkCheckinResult {
  /** 账号序号，从 1 开始 */
  index: number
  user: string
  /** ok=成功 / skipped=今日已签 / failed=失败 */
  status: "ok" | "skipped" | "failed"
  /** 今日获得的容量（字节），失败或缺省时为 0 */
  reward: number
  /** 连签进度，形如 "3/7"；无法确定时为 "" */
  progress: string
  /** 失败原因（不含任何凭据） */
  error?: string
}

/** 凭据不完整 / 配置格式错误 */
export class QuarkConfigError extends Error {
  constructor(message: string) {
    super(`[夸克签到] ${message}`)
    this.name = "QuarkConfigError"
  }
}

/** 调用夸克 API 失败 */
export class QuarkApiError extends Error {
  constructor(message: string) {
    super(`[夸克签到] ${message}`)
    this.name = "QuarkApiError"
  }
}
