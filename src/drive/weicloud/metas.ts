/** =========== 腾讯微云 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { cookie: string; root_folder_key: string; order_by: string; order_direction: string }
export interface SAVING_INFO { uin?: string }
export interface WeiyunFile { file_id: string; dir_key: string; file_name: string; file_size: number; file_ctime: number; file_mtime: number; dir: boolean; md5: string }
