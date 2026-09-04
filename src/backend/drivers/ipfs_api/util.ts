// IPFS API 客户端
import { DriverIpfsAddition, IpfsLsResp, IpfsFilesStatResp, IpfsAddResp } from "./types"

export class ClientIpfs {
  private endpoint: string
  private gateway: string
  private mode: string

  constructor(addition: DriverIpfsAddition) {
    this.endpoint = (addition.endpoint || "").replace(/\/+$/, "")
    this.gateway = (addition.gateway || "").replace(/\/+$/, "")
    this.mode = addition.mode || "ipfs"
  }

  async init(): Promise<void> {
    if (!this.endpoint) throw new Error("[IPFS] endpoint is required")
    if (!this.gateway) throw new Error("[IPFS] gateway is required")
  }

  private async post<T = any>(endpoint: string, args: string[]): Promise<T> {
    const qs = new URLSearchParams()
    for (const a of args) qs.append("arg", a)
    const resp = await fetch(`${this.endpoint}/api/v0/${endpoint}?${qs.toString()}`, {
      method: "POST",
    })
    if (resp.status >= 400) {
      throw new Error(`[IPFS] ${resp.status} ${await resp.text().catch(() => "")}`)
    }
    return (await resp.json().catch(() => ({}))) as T
  }

  async ls(cid: string): Promise<IpfsLsResp> {
    return this.post<IpfsLsResp>("ls", [`/ipfs/${cid}`])
  }

  async filesStat(path: string): Promise<IpfsFilesStatResp> {
    return this.post<IpfsFilesStatResp>("files/stat", [path])
  }

  async filesMkdir(path: string): Promise<void> {
    await this.post("files/mkdir", [path, "parents=true"])
  }

  async filesMv(src: string, dst: string): Promise<void> {
    await this.post("files/mv", [src, dst])
  }

  async filesCp(src: string, dst: string): Promise<void> {
    await this.post("files/cp", [src, dst])
  }

  async filesRm(path: string): Promise<void> {
    await this.post("files/rm", [path, "recursive=true"])
  }

  async add(content: Buffer, fileName: string): Promise<string> {
    const form = new FormData()
    form.append("file", new Blob([content]), fileName)
    const resp = await fetch(`${this.endpoint}/api/v0/add`, { method: "POST", body: form })
    const data: IpfsAddResp = await resp.json().catch(() => ({ Hash: "" } as any))
    if (!data.Hash) throw new Error("[IPFS] add failed")
    return data.Hash
  }

  downloadUrl(cid: string, name: string): string {
    return `${this.gateway}/ipfs/${cid}?filename=${encodeURIComponent(name)}`
  }

  /** 将 mode + 路径解析为 /ipfs/{cid} */
  async resolveIpfsPath(rawPath: string, cid?: string): Promise<string> {
    if (cid) return `/ipfs/${cid}`
    const clean = rawPath.replace(/^\/+|\/+$/g, "")
    switch (this.mode) {
      case "ipfs":
        return `/ipfs/${clean}`
      case "ipns":
        return `/ipns/${clean}`
      case "mfs": {
        const stat = await this.filesStat(clean ? `/${clean}` : "/")
        return `/ipfs/${stat.Hash}`
      }
      default:
        throw new Error("[IPFS] invalid mode")
    }
  }
}
