// 豆包网盘 API 客户端
import {
  DriverDoubaoAddition,
  DoubaoFile,
  DoubaoCommonResp,
  DoubaoNodeInfoData,
  DoubaoDownloadInfoData,
  DoubaoFileUrlData,
  DoubaoVideoUrlData,
} from "./types"

const BASE_URL = "https://www.doubao.com"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const DirectoryType = 1
const FileType = 2
const LinkType = 3
const ImageType = 4
const PagesType = 5
const VideoType = 6
const AudioType = 7

const FileNodeType: Record<number, string> = {
  1: "directory",
  2: "file",
  3: "link",
  4: "image",
  5: "pages",
  6: "video",
  7: "audio",
  8: "meeting_minutes",
}

export class ClientDoubao {
  private cookie: string
  private downloadApi: string

  constructor(addition: DriverDoubaoAddition) {
    this.cookie = addition.cookie || ""
    this.downloadApi = addition.download_api || "get_file_url"
  }

  async init(): Promise<void> {
    if (!this.cookie) throw new Error("[Doubao] cookie is required")
  }

  private async request<T = any>(
    path: string,
    body: Record<string, any> = {},
  ): Promise<T> {
    const resp = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: this.cookie,
        "User-Agent": UA,
        Origin: BASE_URL,
        Referer: `${BASE_URL}/`,
      },
      body: JSON.stringify(body),
    })
    const data: DoubaoCommonResp = await resp.json().catch(() => ({ code: -1 } as any))
    if (data.code !== 0) {
      const msg = data.message || data.msg || data.error?.message || `code ${data.code}`
      throw new Error(`[Doubao] ${msg}`)
    }
    return data as T
  }

  async getFiles(dirId: string): Promise<DoubaoFile[]> {
    const all: DoubaoFile[] = []
    let cursor = ""
    do {
      const body: Record<string, any> = { node_id: dirId }
      if (cursor) {
        body.cursor = cursor
        body.size = 50
      } else {
        body.need_full_path = false
      }
      const resp = await this.request<DoubaoCommonResp>("/samantha/aispace/node_info", body)
      const data = resp.data as DoubaoNodeInfoData | undefined
      if (data?.children) all.push(...data.children)
      cursor = data?.next_cursor && data.next_cursor !== "-1" ? data.next_cursor : ""
    } while (cursor)
    return all
  }

  /** 下载链接 */
  async getDownloadUrl(file: DoubaoFile): Promise<string> {
    if (this.downloadApi === "get_download_info") {
      const resp = await this.request<DoubaoCommonResp>("/samantha/aispace/get_download_info", {
        requests: [{ node_id: file.id }],
      })
      const data = resp.data as DoubaoDownloadInfoData
      const url = data.download_infos?.[0]?.main_url || ""
      if (!url) throw new Error("[Doubao] empty download url")
      return url
    }
    // get_file_url（默认）
    if (file.node_type === VideoType || file.node_type === AudioType) {
      const resp = await this.request<DoubaoCommonResp>("/samantha/media/get_play_info", {
        key: file.key,
        node_id: file.id,
      })
      const data = resp.data as DoubaoVideoUrlData
      const url =
        data.original_media_info?.main_url || data.media_info?.[0]?.main_url || ""
      if (!url) throw new Error("[Doubao] empty download url")
      return url
    }
    const resp = await this.request<DoubaoCommonResp>("/alice/message/get_file_url", {
      uris: [file.key],
      type: FileNodeType[file.node_type] || "file",
    })
    const data = resp.data as DoubaoFileUrlData
    const url = data.file_urls?.[0]?.main_url || ""
    if (!url) throw new Error("[Doubao] empty download url")
    return url
  }

  downloadHeaders(): Record<string, string> {
    return { "User-Agent": UA }
  }

  async mkdir(parentId: string, name: string): Promise<void> {
    await this.request("/samantha/aispace/upload_node", {
      node_list: [
        {
          local_id: crypto.randomUUID(),
          name,
          parent_id: parentId,
          node_type: DirectoryType,
        },
      ],
    })
  }

  async rename(nodeId: string, newName: string): Promise<void> {
    await this.request("/samantha/aispace/rename_node", {
      node_id: nodeId,
      node_name: newName,
    })
  }

  async move(nodeId: string, currentParentId: string, targetParentId: string): Promise<void> {
    await this.request("/samantha/aispace/move_node", {
      node_list: [{ id: nodeId }],
      current_parent_id: currentParentId,
      target_parent_id: targetParentId,
    })
  }

  async remove(nodeId: string): Promise<void> {
    await this.request("/samantha/aispace/delete_node", {
      node_list: [{ id: nodeId }],
    })
  }
}
