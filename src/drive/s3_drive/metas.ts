/** =========== S3兼容存储 类型定义 ================
 * @author "OpenList Team" @version 25.01.01
 * =======================================================*/
export interface CONFIG_INFO { bucket: string; endpoint: string; region: string; access_key_id: string; secret_access_key: string; session_token: string; root_path: string; custom_host: string; sign_url_expire: number; placeholder: string; force_path_style: boolean; list_object_version: string; remove_bucket: boolean; add_filename_to_disposition: boolean }
export interface SAVING_INFO { }
export interface S3Object { Key: string; Size: number; LastModified: string; ETag: string }
export interface S3CommonPrefix { Prefix: string }
