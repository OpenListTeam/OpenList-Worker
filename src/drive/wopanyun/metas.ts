/** =========== 联通沃盘 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { refresh_token: string; access_token: string; root_folder_id: string; family_id: string; wopan_type: string }
export interface SAVING_INFO { access_token?: string; refresh_token?: string }
export interface WopanFile { id: string; name: string; size: number; type: string; created_at: string; updated_at: string; is_dir: boolean; md5: string; parent_id: string }
