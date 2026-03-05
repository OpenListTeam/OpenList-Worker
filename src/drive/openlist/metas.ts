/** =========== OpenList 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { url: string; meta_password: string; username: string; password: string; token: string; root_path: string }
export interface SAVING_INFO { token?: string }
export interface OLFile { name: string; size: number; is_dir: boolean; modified: string; created: string; hash_info?: { md5?: string }; thumb?: string; sign?: string; raw_url?: string }
export interface OLListResp { code: number; message: string; data: { content: OLFile[]; total: number; provider: string } }
export interface OLGetResp { code: number; message: string; data: { name: string; size: number; is_dir: boolean; modified: string; raw_url: string; sign: string; provider: string } }
