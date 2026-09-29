export interface WpsAddition {
  root_folder_path?: string
  cookie: string
  mode?: "Personal" | "Business"
  custom_ua?: string
  order_by?: string
  order_direction?: string
}

export interface WpsLoginState {
  account_num?: number
  companyid?: number
  current_companyid?: number
  is_company_account?: boolean
  is_plus?: boolean
  loginmode?: string
  userid?: number
}

export interface WpsGroup {
  company_id?: number
  group_id?: number
  name: string
  id?: number
}

export interface WpsFileInfo {
  groupid: number
  parentid: number
  fname: string
  fsize: number
  ftype: string
  ctime: number
  mtime: number
  id: number
  deleted?: boolean
  file_perms_acl?: {
    download?: number
  }
}

export interface WpsFilesResp {
  files: WpsFileInfo[]
  next_offset: number
}

export interface WpsDownloadResp {
  url: string
  result?: string
}

export interface WpsSpacesResp {
  id?: number
  name?: string
  result?: string
  total?: number
  used?: number
}

export interface WpsServiceSpaceResp {
  info?: Array<{
    id: number
    space_total: number
    space_used: number
  }>
}
