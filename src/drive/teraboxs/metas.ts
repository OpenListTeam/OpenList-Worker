/** =========== TeraBox 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { cookie: string; root_path: string; download_api: string; order_by: string; order_direction: string }
export interface SAVING_INFO { bdstoken?: string; jsToken?: string }
export interface TeraBoxFile { fs_id: number; path: string; server_filename: string; size: number; isdir: number; server_mtime: number; server_ctime: number; md5: string; thumbs?: { url3?: string } }
