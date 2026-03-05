/** =========== Seafile 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { address: string; username: string; password: string; token: string; repo_id: string; root_path: string }
export interface SAVING_INFO { token?: string }
export interface SeafileEntry { name: string; size: number; type: string; id: string; mtime: number; permission: string }
