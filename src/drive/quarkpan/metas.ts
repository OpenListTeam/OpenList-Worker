/** =========== 夸克网盘开放平台 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { root_folder_id: string; order_by: string; order_direction: string; use_online_api: boolean; api_url_address: string; access_token: string; refresh_token: string; app_id: string; sign_key: string }
export interface SAVING_INFO { access_token?: string; refresh_token?: string; user_id?: string }
export interface QuarkFile { fid: string; pdir_fid: string; file_name: string; size: number; file_type: number; dir: boolean; created_at: number; updated_at: number; thumbnail: string; md5: string }
