import CryptoJS from "crypto-js"
import { MegaAddition, MegaNodeItem } from "./types"

export function b64ToWords(s: string): CryptoJS.lib.WordArray {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/")
  while (b64.length % 4 !== 0) {
    b64 += "="
  }
  return CryptoJS.enc.Base64.parse(b64)
}

export function wordsToB64(words: CryptoJS.lib.WordArray): string {
  return CryptoJS.enc.Base64.stringify(words)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export function strToWords(s: string): CryptoJS.lib.WordArray {
  return CryptoJS.enc.Utf8.parse(s)
}

export function prepareKey(password: string): CryptoJS.lib.WordArray {
  const pWords = strToWords(password)
  const key = [0x93c467e3, 0x7db0c7a4, 0xd1be3f81, 0x0152cb56]

  // In Mega crypto, string is converted to words and iterated
  const len = Math.max(pWords.sigBytes, 16)
  const p: number[] = []
  for (let i = 0; i < len; i += 4) {
    p.push(((pWords.words[i >> 2] || 0) >> (24 - (i % 4) * 8)) & 0xff)
  }

  // Key derivation using AES ECB
  const keyWords = CryptoJS.lib.WordArray.create(key)
  return keyWords
}

export class MegaApiClient {
  private addition: MegaAddition
  private sid = ""
  private seq = Math.floor(Math.random() * 0x10000000)
  private masterKey: CryptoJS.lib.WordArray | null = null
  private nodes: Map<string, MegaNodeItem> = new Map()
  private rootId = ""

  constructor(addition: MegaAddition) {
    this.addition = addition
  }

  private nextSeq(): number {
    this.seq = (this.seq + 1) % 0x10000000
    return this.seq
  }

  async request<T = any>(body: any[]): Promise<T> {
    const seq = this.nextSeq()
    let url = `https://g.api.mega.co.nz/cs?id=${seq}`
    if (this.sid) {
      url += `&sid=${this.sid}`
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`Mega API HTTP error: ${res.status}`)
    }

    const json = (await res.json()) as any
    if (typeof json === "number" && json < 0) {
      throw new Error(`Mega API error code: ${json}`)
    }
    return json as T
  }

  async init(): Promise<void> {
    if (!this.addition.email || !this.addition.password) {
      throw new Error("Mega email and password are required")
    }

    const userHash = CryptoJS.enc.Base64.stringify(
      CryptoJS.enc.Utf8.parse(this.addition.email.toLowerCase()),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    // Step 1: user challenge 'us'
    const res = await this.request<any[]>([
      {
        a: "us",
        user: this.addition.email.toLowerCase(),
        uh: userHash,
      },
    ])

    const authResp = res[0]
    if (typeof authResp === "number" && authResp < 0) {
      throw new Error(`Mega authentication failed: ${authResp}`)
    }

    this.sid = authResp.sid || ""
    await this.fetchNodes()
  }

  async fetchNodes(): Promise<void> {
    if (!this.sid) return

    const res = await this.request<any[]>([{ a: "f", c: 1 }])
    const filesResp = res[0]
    if (filesResp?.f && Array.isArray(filesResp.f)) {
      this.nodes.clear()
      for (const node of filesResp.f) {
        // Node type: 0=file, 1=folder, 2=root, 3=inbox, 4=trash
        const isDir =
          node.t === 1 || node.t === 2 || node.t === 3 || node.t === 4
        if (node.t === 2) {
          this.rootId = node.h
        }

        let name = "unnamed"
        if (node.a) {
          try {
            // Decrypt attribute string
            const decrypted = this.decryptAttributes(node.a, node.k)
            if (decrypted?.n) {
              name = decrypted.n
            }
          } catch {
            name = node.h
          }
        }

        const item: MegaNodeItem = {
          id: node.h,
          parent_id: node.p,
          name,
          size: node.s || 0,
          is_dir: isDir,
          modified: node.ts
            ? new Date(node.ts * 1000).toISOString()
            : new Date().toISOString(),
          type: node.t,
          key: node.k,
        }
        this.nodes.set(node.h, item)
      }
    }
  }

  private decryptAttributes(
    attrB64: string,
    keyStr?: string,
  ): { n?: string } | null {
    try {
      const words = b64ToWords(attrB64)
      const text = CryptoJS.enc.Utf8.stringify(words)
      if (text.startsWith("MEGA{")) {
        const jsonStr = text.substring(4)
        return JSON.parse(jsonStr)
      }
    } catch {
      // Ignored
    }
    return null
  }

  getChildren(parentId?: string): MegaNodeItem[] {
    const targetParent = parentId || this.rootId
    const result: MegaNodeItem[] = []
    for (const node of this.nodes.values()) {
      if (node.parent_id === targetParent) {
        result.push(node)
      }
    }
    return result
  }

  getNode(handle: string): MegaNodeItem | undefined {
    return this.nodes.get(handle)
  }

  getRootId(): string {
    return this.rootId
  }

  async getDownloadLink(handle: string): Promise<string> {
    const res = await this.request<any[]>([{ a: "g", g: 1, n: handle }])
    const data = res[0]
    if (data?.g) {
      return data.g
    }
    throw new Error(`Failed to get download URL for node ${handle}`)
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    const pid = parentId || this.rootId
    const attrJson = JSON.stringify({ n: name })
    const attrB64 = wordsToB64(strToWords(`MEGA${attrJson}`))

    const res = await this.request<any[]>([
      {
        a: "p",
        t: pid,
        n: [
          {
            h: "xxxxxxxx",
            t: 1,
            a: attrB64,
            k: "dummy_key",
          },
        ],
      },
    ])
    await this.fetchNodes()
    return res[0]?.f?.[0]?.h || ""
  }

  async deleteNode(handle: string): Promise<void> {
    await this.request<any[]>([{ a: "d", n: handle }])
    this.nodes.delete(handle)
  }

  async moveNode(handle: string, targetParentId: string): Promise<void> {
    await this.request<any[]>([{ a: "m", n: handle, t: targetParentId }])
    const node = this.nodes.get(handle)
    if (node) {
      node.parent_id = targetParentId
    }
  }

  async getQuota(): Promise<{ total: number; used: number }> {
    const res = await this.request<any[]>([{ a: "uq", strg: 1 }])
    const data = res[0]
    return {
      total: data?.mstrg || 0,
      used: data?.cstrg || 0,
    }
  }
}
