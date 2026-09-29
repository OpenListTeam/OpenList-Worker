// netease_music (网易云音乐云盘) - Cookie 认证
// API reference: Go drivers/netease_music

export interface DriverNeteaseMusicAddition {
  cookie: string
  song_limit?: number
}

export interface NeteaseSongItem {
  addTime: number
  fileName: string
  fileSize: number
  songId: number
  simpleSong?: {
    al?: {
      picUrl?: string
    }
  }
}

export interface NeteaseListResp {
  size?: number
  maxSize?: number
  data?: NeteaseSongItem[]
}

export interface NeteaseSongResp {
  data?: {
    url?: string
  }[]
}
