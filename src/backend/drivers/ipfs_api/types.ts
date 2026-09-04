// ipfs_api (IPFS 节点 API) - HTTP JSON-RPC (go-ipfs-api)
// API reference: Go drivers/ipfs_api

export interface DriverIpfsAddition {
  /** ipfs | ipns | mfs */
  mode: string
  /** 节点 API 地址，如 http://127.0.0.1:5001 */
  endpoint: string
  /** 网关地址，如 http://127.0.0.1:8080 */
  gateway: string
  root_path?: string
}

export interface IpfsLsResp {
  Objects: { Hash: string; Links: { Hash: string; Name: string; Size: number; Type: number }[] }[]
}

export interface IpfsFilesStatResp {
  Hash: string
  Size: number
  Type: string // "file" | "directory"
}

export interface IpfsAddResp {
  Hash: string
  Size: string
}
