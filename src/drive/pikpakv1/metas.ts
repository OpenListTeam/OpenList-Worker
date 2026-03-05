/** =========== PikPak 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { root_folder_id: string; username: string; password: string; platform: string; refresh_token: string; captcha_token: string; device_id: string; disable_media_link: boolean }
export interface SAVING_INFO { access_token?: string; refresh_token?: string; user_id?: string; device_id?: string; captcha_token?: string }
export interface PikPakFile { id: string; parent_id: string; kind: string; name: string; size: string; created_time: string; modified_time: string; mime_type: string; web_content_link: string; thumbnail_link: string; hash: string; medias: { link: { url: string } }[] }
