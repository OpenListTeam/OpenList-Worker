// USS (又拍云) driver types
export interface UssAddition {
  bucket: string
  endpoint: string
  operator_name: string
  operator_password: string
  anti_theft_chain_token?: string
  sign_url_expire?: number
  root_folder_path?: string
}
