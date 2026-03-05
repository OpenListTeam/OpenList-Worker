/** =========== 网易云音乐 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { cookie: string; song_limit: number }
export interface SAVING_INFO { csrf_token?: string; music_u?: string }
export interface CloudSong { songId: number; songName: string; artist: string; album: string; fileSize: number; fileName: string; addTime: number; simpleSong?: { dt: number } }
