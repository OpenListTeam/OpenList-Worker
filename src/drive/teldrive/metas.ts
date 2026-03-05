/** =========== TelDrive 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { url: string; access_token: string; root_path: string; upload_thread: number }
export interface SAVING_INFO { access_token?: string }
export interface TelDriveFile { id: string; name: string; type: string; mimeType: string; size: number; parentId: string; createdAt: string; updatedAt: string }
