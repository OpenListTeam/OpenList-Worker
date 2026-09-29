export interface AliasAddition {
  paths: string
  read_conflict_policy?: "first" | "random" | "all" | string
  write_conflict_policy?:
    | "disabled"
    | "first"
    | "deterministic"
    | "deterministic_or_all"
    | "all"
    | "all_strict"
    | string
  put_conflict_policy?:
    | "disabled"
    | "first"
    | "deterministic"
    | "deterministic_or_all"
    | "all"
    | "all_strict"
    | "random"
    | "quota"
    | "quota_strict"
    | string
  file_consistency_check?: boolean
  download_concurrency?: number
  download_part_size?: number
  provider_pass_through?: boolean
  details_pass_through?: boolean
  order_by?: string
  order_direction?: string
}

export interface AliasPathPair {
  aliasSubPath: string
  targetPath: string
}
