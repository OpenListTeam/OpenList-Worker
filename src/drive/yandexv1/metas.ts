/** =========== Yandex Disk 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { access_token: string; refresh_token: string; client_id: string; client_secret: string; root_path: string; order_by: string }
export interface SAVING_INFO { access_token?: string; refresh_token?: string }
export interface YandexFile { name: string; path: string; type: string; size: number; modified: string; created: string; md5: string; preview: string; mime_type: string }
export interface YandexListResp { _embedded: { items: YandexFile[]; offset: number; limit: number; total: number } }
