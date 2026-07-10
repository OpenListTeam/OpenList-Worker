import { ExtractFolder, OrderBy, OrderDirection } from "~/types/storage"

export interface Share {
  id?: string
  expires: string | null
  pwd: string
  max_accessed: number
  disabled: boolean
  order_by: OrderBy
  order_direction: OrderDirection
  extract_folder: ExtractFolder
  files: string[]
  remark: string
  readme: string
  header: string
}

export interface ShareUpdate extends Share {
  id: string
  new_id: string
  accessed: number
}

export interface ShareInfo extends ShareUpdate {
  creator: string
  creator_role: number
}
