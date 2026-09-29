// AutoIndex driver types
// Ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/autoindex

export interface AutoIndexAddition {
  url: string
  item_xpath?: string
  name_xpath?: string
  size_xpath?: string
  modified_xpath?: string
  modified_time_format?: string
  ignore_file_names?: string
}

export interface AutoIndexNode {
  name: string
  size?: string
  modified?: string
  url: string
  isDir: boolean
}
