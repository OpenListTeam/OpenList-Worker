// intern_ai (书生云盘 / InternAI Discovery Cloud Disk) - REST API
// API reference: discovery.intern-ai.org.cn cloud-disk endpoints (reversed from
// discovery-compute-fe bundle). See docs in the PR description.

export interface InternAIAddition {
  root_folder_path?: string
  /** uaa-token: the value of cookie "uaa-token" on discovery.intern-ai.org.cn */
  token: string
  /** platform base URL, default https://discovery.intern-ai.org.cn */
  api_base?: string
  /** listing page size */
  page_size?: number
  order_by?: string
  order_direction?: string
}

export interface InternAIFileItem {
  file_key: string
  file_name: string
  is_dir: boolean
  size: number
  content_type?: string
  modified_at?: string
  created_at?: string
  cloud_file_status?: string | null
}

export interface InternAIListData {
  files: InternAIFileItem[]
  next_page_token?: string
  total?: number
  has_more?: boolean
}

export interface InternAIUrlItem {
  file_key?: string
  file_name?: string
  download_url?: string
  upload_url?: string
  skipped?: boolean
}

export interface InternAICheckResult {
  file_key?: string
  exists?: boolean
}

export interface InternAIResp<T = any> {
  code: number
  msg?: string
  data?: T
}
