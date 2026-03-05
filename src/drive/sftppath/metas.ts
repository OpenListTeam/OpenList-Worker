/** =========== SFTP 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { address: string; port: number; username: string; password: string; private_key: string; passphrase: string; root_path: string; ignore_symlink: boolean }
export interface SAVING_INFO { }
export interface SFTPEntry { filename: string; longname: string; attrs: { size: number; mtime: number; permissions: number; is_dir: boolean } }
