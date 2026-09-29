// ProtonDrive driver — E2EE 网盘驱动（浏览 + 解密下载 + 基础写操作）
// Ported from: OpenList-Backends/drivers/proton_drive (go-proton-api + Proton-API-Bridge)
//
// 安全模型说明：Proton Drive 的文件名与文件内容均为 OpenPGP 端到端加密，
// 服务端仅存储密文。因此本驱动必须在客户端（此处为 Workers 运行时）完成
// 整条密钥链的解锁，才能解密出文件名与内容：
//
//   用户私钥 (bcrypt(password, keySalt) 解锁)
//     └─ 地址私钥 (Token 用用户密钥环解密得到 passphrase)
//         └─ 共享(share)私钥 (Passphrase 用地址密钥环解密)
//             └─ 根节点密钥 → 子节点密钥链 (NodePassphrase 逐级解密)
//                 └─ 文件名 / 内容会话密钥(session key)
//
// 注意：saltedKeyPass 是 bcrypt 摘要的 printable-ASCII 形式，可直接作为
// openpgp 的 string passphrase 使用；这一点与 go-proton-api 的实现一致。
//
// 已知限制（TODO）：
//   - move/copy：需要把 NodePassphrase 用「目标父节点密钥环」重新加密，属于
//     跨节点重加密操作，本移植版本暂未实现（见对应方法注释）。
//   - put/上传：需要分块 AEAD 加密 + draft/revision 两阶段上传协议，暂未实现。
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import {
  ProtonDriveAddition,
  ProtonLink,
  ProtonShare,
  ProtonListResp,
} from "./types"
import { ProtonShareTypeMain } from "./consts"
import {
  ProtonDriveClient,
  unlockUserKeys,
  unlockAddressKeys,
  unlockShareKeyring,
} from "./util"
import {
  KeyRing,
  decryptArmoredText,
  decryptSessionKeyPacket,
  decryptBinaryWithSessionKey,
  decryptXAttrSize,
  encryptText,
  getNameHash,
} from "./crypto"
import * as openpgp from "openpgp"

const LIST_PAGE_SIZE = 150

function parseProtonDate(timestamp: number): string {
  if (!timestamp) return new Date().toISOString()
  return new Date(timestamp * 1000).toISOString()
}

export function normalizeProtonDriveAddition(a: any): ProtonDriveAddition {
  const norm = { ...(a || {}) } as any
  norm.email = (norm.email || "").trim()
  norm.password = (norm.password || "").trim()
  norm.two_fa_code = (norm.two_fa_code || "").trim()
  norm.root_folder_id = (norm.root_folder_id || "").trim() || "root"
  norm.use_reusable_login = !!norm.use_reusable_login
  norm.chunk_size = norm.chunk_size || "4"
  norm.reusable_credential = (norm.reusable_credential || "").trim()
  return norm as ProtonDriveAddition
}

export class ProtonDriveDriver implements StorageDriver {
  private addition: ProtonDriveAddition
  private client: ProtonDriveClient
  private mainShare: ProtonShare | null = null
  private mainShareKR: KeyRing = []
  private userKR: KeyRing = []
  private addrKRs: Map<string, KeyRing> = new Map()
  private defaultAddrKR: KeyRing = []
  private defaultAddrID = ""

  // 路径/ID 缓存
  private idCache = new Map<string, string>()
  private linkCache = new Map<string, ProtonLink>()
  private nodeKRcache = new Map<string, KeyRing>()
  private childrenCache = new Map<string, ProtonLink[]>()

  constructor(addition: any) {
    this.addition = normalizeProtonDriveAddition(addition)
    this.client = new ProtonDriveClient(this.addition)
  }

  async init(): Promise<void> {
    if (!this.addition.email) throw new Error("email is required")
    if (!this.addition.password) throw new Error("password is required")

    await this.client.login()

    const salts = await this.client.getSalts()
    const user = await this.client.getUser()
    const addresses = await this.client.getAddresses()

    // 解锁用户密钥
    const { userKR, saltedKeyPass } = await unlockUserKeys(
      user.Keys,
      this.addition.password,
      salts,
    )
    this.userKR = userKR
    this.client.setSaltedKeyPass(saltedKeyPass)

    // 解锁地址密钥
    this.addrKRs = await unlockAddressKeys(addresses, this.userKR, saltedKeyPass)
    if (this.addrKRs.size === 0) {
      throw new Error("failed to unlock address keys")
    }

    // 默认地址（第一个地址）
    this.defaultAddrID = addresses[0]?.ID || ""
    this.defaultAddrKR = this.addrKRs.get(this.defaultAddrID) || []

    // 获取主 share 并解锁 share 密钥环
    const shares = await this.client.getShares()
    this.mainShare =
      shares.find((s) => s.Type === ProtonShareTypeMain) || shares[0]
    if (!this.mainShare) throw new Error("no shares found")

    this.mainShareKR = await unlockShareKeyring(this.mainShare, this.addrKRs)

    // 预热根节点密钥环
    await this.getLinkKR(this.getRootLinkID())
  }

  private getShareID(): string {
    if (!this.mainShare) throw new Error("not initialized")
    return this.mainShare.ShareID
  }

  private getVolumeID(): string {
    if (!this.mainShare) throw new Error("not initialized")
    return this.mainShare.VolumeID
  }

  private getRootLinkID(): string {
    if (!this.mainShare) throw new Error("not initialized")
    if (this.addition.root_folder_id && this.addition.root_folder_id !== "root") {
      return this.addition.root_folder_id
    }
    return this.mainShare.RootLinkID
  }

  // ---------- Proton trust chain helpers ----------

  private async fetchLink(linkID: string): Promise<ProtonLink> {
    const cached = this.linkCache.get(linkID)
    if (cached) return cached
    const resp = (await this.client.requestAPI(
      `/drive/volumes/${this.getVolumeID()}/links/${linkID}`,
    )) as { Code: number; Link: ProtonLink }
    if (!resp.Link) throw new Error(`link not found: ${linkID}`)
    this.linkCache.set(linkID, resp.Link)
    return resp.Link
  }

  /** 递归构建节点密钥环：nodeKR = parentKR + nodePrivateKey */
  private async getLinkKR(linkID: string): Promise<KeyRing> {
    const cached = this.nodeKRcache.get(linkID)
    if (cached) return cached

    const link = await this.fetchLink(linkID)
    const parentKR = link.ParentLinkID
      ? await this.getLinkKR(link.ParentLinkID)
      : this.mainShareKR

    const passphrase = await decryptArmoredText(link.NodePassphrase, parentKR)
    const nodeKey = await openpgp.readPrivateKey({ armoredKey: link.NodeKey })
    const unlocked = await openpgp.decryptKey({ privateKey: nodeKey, passphrase })

    const kr = [...parentKR, unlocked]
    this.nodeKRcache.set(linkID, kr)
    return kr
  }

  /** 解密文件名 */
  private async decryptName(link: ProtonLink): Promise<string> {
    if (!link.Name) return "unnamed"
    const kr = await this.getLinkKR(link.LinkID)
    try {
      return await decryptArmoredText(link.Name, kr)
    } catch {
      return "unnamed"
    }
  }

  private cleanPath(p: string): string {
    const s = "/" + (p || "").split("/").filter(Boolean).join("/")
    return s === "/" ? "/" : s
  }

  private joinPath(parent: string, name: string): string {
    return parent === "/" ? `/${name}` : `${parent}/${name}`
  }

  /** 列出某个 link 的所有子 link（带缓存 + 翻页） */
  private async listChildren(linkID: string): Promise<ProtonLink[]> {
    const cached = this.childrenCache.get(linkID)
    if (cached) return cached

    const all: ProtonLink[] = []
    for (let page = 0; page < 1000; page++) {
      const resp = (await this.client.requestAPI(
        `/drive/volumes/${this.getVolumeID()}/links/${linkID}`,
        {
          params: {
            Children: "1",
            Page: String(page),
            PageSize: String(LIST_PAGE_SIZE),
            Thumbnail: "0",
          },
        },
      )) as ProtonListResp
      const links = resp.Links || []
      all.push(...links)
      if (links.length < LIST_PAGE_SIZE) break
    }
    this.childrenCache.set(linkID, all)
    return all
  }

  /** 名称路径 → linkID（遍历解密文件名） */
  private async resolveId(path: string): Promise<string> {
    const clean = this.cleanPath(path)
    if (clean === "/") return this.getRootLinkID()
    const cached = this.idCache.get(clean)
    if (cached) return cached

    const segs = clean.split("/").filter(Boolean)
    let curId = this.getRootLinkID()
    let curPath = "/"
    for (const seg of segs) {
      const children = await this.listChildren(curId)
      let found: ProtonLink | null = null
      for (const child of children) {
        const name = await this.decryptName(child)
        if (name === seg) {
          found = child
          break
        }
      }
      if (!found) throw new Error(`folder not found: ${seg}`)
      curId = found.LinkID
      curPath = this.joinPath(curPath, seg)
      this.idCache.set(curPath, curId)
    }
    return curId
  }

  // ---------- StorageDriver ----------

  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const linkID = await this.resolveId(physicalPath)
    const children = await this.listChildren(linkID)
    const clean = this.cleanPath(physicalPath)

    const items: FileItem[] = []
    for (const link of children) {
      const name = await this.decryptName(link)
      this.idCache.set(this.joinPath(clean, name), link.LinkID)
      const isDir = link.Type === 2
      items.push({
        name,
        size: isDir ? 0 : link.Size || 0,
        is_dir: isDir,
        modified: parseProtonDate(link.ModifyTime || link.CreateTime),
        sign: link.LinkID,
        type: calcFileType(name, isDir),
      })
    }

    return sortFileItems(items, "name", "asc")
  }

  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    const clean = this.cleanPath(physicalPath)
    if (clean === "/") {
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: this.getRootLinkID(),
        type: 1,
      }
    }

    const linkID = await this.resolveId(clean)
    const link = await this.fetchLink(linkID)
    const name = await this.decryptName(link)
    const isDir = link.Type === 2

    // 文件大小需用解密后的真实大小（link.Size 是加密后大小）
    let size = 0
    if (!isDir) {
      const nodeKR = await this.getLinkKR(linkID)
      size = await decryptXAttrSize(link.XAttr || "", nodeKR)
      if (!size) size = link.Size || 0
    }

    return {
      name,
      size,
      is_dir: isDir,
      modified: parseProtonDate(link.ModifyTime || link.CreateTime),
      sign: linkID,
      type: calcFileType(name, isDir),
      // 无 raw_url：下载走 createReadStream（服务端解密）
      raw_url: "",
    }
  }

  /**
   * 流式解密下载。raw.ts 检测到本方法后会用其替代 raw_url 代理。
   * 支持 Range（start/end），把字节区间映射到加密分块并逐块解密。
   */
  async createReadStream(
    physicalPath: string,
    options?: { start?: number; end?: number },
  ): Promise<ReadableStream<Uint8Array>> {
    const linkID = await this.resolveId(physicalPath)
    const link = await this.fetchLink(linkID)
    if (link.Type === 2) throw new Error("cannot stream a directory")

    const nodeKR = await this.getLinkKR(linkID)
    const contentKeyPacket = link.FileProperties?.ContentKeyPacket
    if (!contentKeyPacket) {
      throw new Error("file has no content key packet")
    }

    // 解密 content session key
    const sessionKey = await decryptSessionKeyPacket(contentKeyPacket, nodeKR)

    // 获取 revision（含加密分块列表）
    const revisions = (await this.client.requestAPI(
      `/drive/volumes/${this.getVolumeID()}/links/${linkID}/revisions`,
    )) as { Code: number; Revisions: any[] }
    const revision = revisions.Revisions?.find((r) => r.State === 1) || revisions.Revisions?.[0]
    if (!revision?.Blocks?.length) {
      throw new Error("file has no blocks")
    }
    const blocks = revision.Blocks as {
      Index: number
      BareURL: string
      Token: string
    }[]

    // 解密后真实大小（用于无 Range 请求时的 end 计算）
    const decryptedSize =
      (await decryptXAttrSize(link.XAttr || "", nodeKR)) || revision.Size || 0
    const chunkSize = (parseInt(this.addition.chunk_size || "4") || 4) * 1024 * 1024

    const start = options?.start ?? 0
    // 当解密后大小未知时（decryptedSize <= 0），使用一个足够大的上界，
    // 避免无 Range 的完整下载只流式传输第一个字节。
    const end =
      options?.end ?? (decryptedSize > 0 ? decryptedSize - 1 : Number.MAX_SAFE_INTEGER)

    let self = this
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          let position = start
          for (const block of blocks) {
            if (position > end) break
            const blockBytes = await self.downloadBlock(block.BareURL, block.Token)
            const plain = await decryptBinaryWithSessionKey(blockBytes, [sessionKey])

            // 按字节区间切片
            const blockStart = block.Index * chunkSize
            const blockEnd = blockStart + plain.length - 1
            const from = Math.max(start, blockStart)
            const to = Math.min(end, blockEnd)
            if (from <= to) {
              controller.enqueue(plain.slice(from - blockStart, to - blockStart + 1))
              position = to + 1
            }
          }
          controller.close()
        } catch (e: any) {
          controller.error(e)
        }
      },
    })
  }

  private async downloadBlock(bareURL: string, token: string): Promise<Uint8Array> {
    const res = await fetch(bareURL, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      throw new Error(`block download failed: ${res.status}`)
    }
    return new Uint8Array(await res.arrayBuffer())
  }

  // ---------- write operations ----------

  async mkdir(virtualPath: string, physicalPath: string): Promise<void> {
    const clean = this.cleanPath(physicalPath)
    const parentPath = clean.split("/").slice(0, -1).join("/") || "/"
    const dirName = clean.split("/").pop() || ""
    const parentId = await this.resolveId(parentPath)

    const parentKR = await this.getLinkKR(parentId)
    const encryptedName = await encryptText(dirName, parentKR)
    const nameHash = await getNameHash(dirName)

    // 生成节点密钥对（公钥作为 NodeKey 上传，私钥的 passphrase 用父密钥环加密）
    const { publicKey: nodePublicArmored } = await openpgp.generateKey({
      type: "ecc",
      curve: "curve25519Legacy",
      userIDs: [{ name: dirName, email: this.mainShare?.Creator || "" }],
    })
    const nodePassphrase = randomPassphrase()
    const encryptedPassphrase = await encryptText(nodePassphrase, parentKR)

    await this.client.requestAPI("/drive/shares/" + this.getShareID() + "/folders", {
      method: "POST",
      body: {
        ParentLinkID: parentId,
        Name: encryptedName,
        Hash: nameHash,
        NodeKey: nodePublicArmored,
        NodePassphrase: encryptedPassphrase,
        NodePassphraseSignature: "",
        SignatureAddress: this.defaultAddrID,
        NameSignatureEmail: this.mainShare?.Creator || "",
      },
    })
  }

  async rename(
    virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const linkID = await this.resolveId(physicalPath)
    const link = await this.fetchLink(linkID)
    const parentKR = await this.getLinkKR(link.ParentLinkID)

    const encryptedName = await encryptText(newName, parentKR)
    const newHash = await getNameHash(newName)
    const originalHash = link.Hash || ""

    await this.client.requestAPI(
      `/drive/volumes/${this.getVolumeID()}/links/${linkID}/rename`,
      {
        method: "PUT",
        body: {
          Name: encryptedName,
          NameSignatureEmail: this.mainShare?.Creator || "",
          Hash: newHash,
          OriginalHash: originalHash,
        },
      },
    )
  }

  async remove(
    virtualPath: string,
    physicalPath: string,
    names: string[],
  ): Promise<void> {
    const linkID = await this.resolveId(physicalPath)
    await this.client.requestAPI(
      `/drive/volumes/${this.getVolumeID()}/links/${linkID}/trash`,
      { method: "POST" },
    )
  }

  async move(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // TODO(未实现)：Proton Drive 移动文件并非简单的 parentLinkID 变更，而是
    // 必须把源节点的 NodePassphrase 用「目标父节点的密钥环」重新加密后上传，
    // 否则目标父节点无法解开子节点密钥链。实现路径：
    //   1) 用 srcLink 的父密钥环解密 NodePassphrase 得到明文 passphrase
    //   2) 用 dstLink 的密钥环(await getLinkKR(dstId))重新 encryptText 该 passphrase
    //   3) 调用 /drive/volumes/{vol}/links/{linkId}/move 提交 ParentLinkID + 新 NodePassphrase
    // 由于涉及密钥链交叉重加密与原子性，本移植版本暂未实现。
    throw new Error("ProtonDrive move is not supported yet")
  }

  async copy(
    srcDir: string,
    dstDir: string,
    names: string[],
    srcPhys: string,
    dstPhys: string,
  ): Promise<void> {
    // TODO(未实现)：复制等价于「新建节点 + 复用源文件的 content session key」。
    // 需要对源节点的 NodeKey/NodePassphrase 与文件 ContentKeyPacket 在目标父
    // 密钥环下重建，且要处理跨 share 的场景，复杂度高于 move，暂未实现。
    throw new Error("ProtonDrive copy is not supported")
  }

  async put(
    virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    // TODO(未实现)：上传需走 Proton 的两阶段协议：
    //   1) POST /drive/volumes/{vol}/links/{parent}/draft 创建草稿，得到 revisionID
    //   2) 每个 4MB 分块用独立随机 session key 做 AEAD 加密，POST 到 block 上传端点
    //   3) 汇总 block 元数据后提交 revision，并把文件 ContentKeyPacket 用节点密钥环加密
    // 且分块必须流式处理以控制内存。本移植版本暂未实现。
    throw new Error("ProtonDrive upload is not supported yet")
  }
}

function randomPassphrase(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}
