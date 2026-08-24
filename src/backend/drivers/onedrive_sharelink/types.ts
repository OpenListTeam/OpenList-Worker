export interface OnedriveSharelinkAddition {
  url: string
  password?: string
  disable_disk_usage?: boolean
  enable_direct_upload?: boolean
  root_folder_path?: string
  order_by?: string
  order_direction?: string
}

export interface OnedriveShareItem {
  id: string
  name: string
  size: number
  is_folder: boolean
  modified: string
  download_url?: string
  sp_item_url?: string
}

export interface SharePointListDataResp {
  ListData?: {
    Row?: Array<{
      FSObjType: string | number // 1 = folder, 0 = file
      FileLeafRef: string
      File_x0020_Size?: string
      UniqueId: string
      "Modified."?: string
      "@content.downloadUrl"?: string
      ".spItemUrl"?: string
    }>
    NextHref?: string
  }
}
