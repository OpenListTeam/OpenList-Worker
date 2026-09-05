// MoPan (中国移动和彩云) driver
// Ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/mopan
import {
  StorageDriver,
  FileItem,
  calcFileType,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import {
  MoPanAddition,
  MoPanFile,
  MoPanFolder,
  TaskFileParam,
} from "./types"
import { MoPanClient } from "./util"
import {
  TaskTypeCopy,
  TaskTypeMove,
  TaskStatusCompleted,
  TaskStatusConflict,
  createDefaultDeviceInfo,
} from "./consts"
import { createHash } from "crypto"

function parseMoPanDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString()
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return new Date().toISOString()
}

function mopanFolderToFileItem(folder: MoPanFolder): FileItem {
  return {
    name: folder.name,
    size: 0,
    is_dir: true,
    modified: parseMoPanDate(folder.lastOpTime),
    sign: folder.id,
    type: 1,
    thumb: "",
    raw_url: "",
  }
}

function mopanFileToFileItem(file: MoPanFile): FileItem {
  return {
    name: file.name,
    size: file.size || 0,
    is_dir: false,
    modified: parseMoPanDate(file.lastOpTime),
    sign: file.id,
    type: calcFileType(file.name, false),
    thumb: file.icon?.smallURL || file.icon?.largeURL || "",
    raw_url: "",
    hash: file.md5 || undefined,
  }
}

export function normalizeMoPanAddition(a: any): MoPanAddition {
  const norm = { ...(a || {}) } as any
  norm.phone = (norm.phone || "").trim()
  norm.password = (norm.password || "").trim()
  norm.sms_code = (norm.sms_code || "").trim()
  norm.root_folder_id = norm.root_folder_id || ""
  norm.cloud_id = (norm.cloud_id || "").trim()
  norm.order_by = norm.order_by || "filename"
  norm.order_direction = norm.order_direction || "asc"
  norm.device_info = norm.device_info || createDefaultDeviceInfo()
  norm.upload_thread = norm.upload_thread || "3"
  return norm as MoPanAddition
}

export class MoPanDriver implements StorageDriver {
  private client: MoPanClient
  private addition: MoPanAddition
  private userId: string = ""
  private uploadThread: number = 3

  constructor(
    addition: MoPanAddition,
    onAuthUpdate?: (deviceInfo: string, token: string) => void,
  ) {
    this.addition = normalizeMoPanAddition(addition)
    this.uploadThread = parseInt(this.addition.upload_thread || "3")
    if (this.uploadThread < 1 || this.uploadThread > 32) {
      this.uploadThread = 3
    }

    this.client = new MoPanClient(this.addition, async (err) => {
      // Re-login on authorization expired
      await this.performLogin()
      if (onAuthUpdate) {
        onAuthUpdate(
          this.client.getDeviceInfoJson(),
          this.client.getAuthorization(),
        )
      }
    })
  }

  private async performLogin(): Promise<void> {
    const smsCode = this.addition.sms_code?.trim() || ""

    if (smsCode === "send") {
      await this.client.loginBySms(this.addition.phone)
      throw new Error("[MoPan] SMS code sent, please enter the code")
    }

    let loginData
    if (smsCode && smsCode !== "send") {
      loginData = await this.client.loginBySmsStep2(
        this.addition.phone,
        smsCode,
      )
    } else {
      loginData = await this.client.login(
        this.addition.phone,
        this.addition.password,
      )
    }

    this.client.setAuthorization(loginData.token)

    const userInfo = await this.client.getUserInfo()
    this.userId = userInfo.userID

    // Auto-detect root folder if not set
    if (!this.addition.root_folder_id && loginData.userCloudStorageRelations) {
      for (const rel of loginData.userCloudStorageRelations) {
        if (rel.path === "/文件") {
          this.addition.root_folder_id = rel.folderID
          break
        }
      }
    }
  }

  async init(): Promise<void> {
    await this.performLogin()
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = await this.resolveFolderId(physicalPath)
    const files: FileItem[] = []

    // Paginated listing
    for (let page = 1; ; page++) {
      const data = await this.client.queryFiles(
        folderId,
        page,
        this.addition.order_by || "filename",
        this.addition.order_direction === "desc",
        this.addition.cloud_id,
      )

      if (!data.fileListAO) break

      const { folderList = [], fileList = [] } = data.fileListAO

      if (folderList.length === 0 && fileList.length === 0) break

      files.push(...folderList.map(mopanFolderToFileItem))
      files.push(...fileList.map(mopanFileToFileItem))

      // Stop if we got less than a full page
      if (folderList.length + fileList.length < 100) break
    }

    return sortFileItems(
      files,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const parts = physicalPath.split("/").filter(Boolean)
    if (parts.length === 0) {
      // Root folder
      return {
        name: "root",
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: this.getRootId(),
        type: 1,
        thumb: "",
        raw_url: "",
      }
    }

    const parentPath = parts.slice(0, -1).join("/")
    const name = parts[parts.length - 1]
    const parentId = await this.resolveFolderId(parentPath)

    // Search in parent folder
    const data = await this.client.queryFiles(
      parentId,
      1,
      "filename",
      false,
      this.addition.cloud_id,
    )

    if (data.fileListAO) {
      const folder = data.fileListAO.folderList?.find((f) => f.name === name)
      if (folder) return mopanFolderToFileItem(folder)

      const file = data.fileListAO.fileList?.find((f) => f.name === name)
      if (file) {
        const item = mopanFileToFileItem(file)
        // Get download URL
        const dlResp = await this.client
          .getFileDownloadUrl(file.id, this.addition.cloud_id)
          .catch(() => null)
        if (dlResp?.downloadUrl) {
          let url = dlResp.downloadUrl.replace(/&amp;/g, "&")
          url = url.replace(/^http:/, "https:")
          // Follow redirect to get actual URL
          const redirectUrl = await this.followRedirect(url)
          item.raw_url = redirectUrl || url
        }
        return item
      }
    }

    throw new Error(`[MoPan] File not found: ${physicalPath}`)
  }

  private async followRedirect(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, { redirect: "manual" })
      if (res.status === 302 || res.status === 301) {
        return res.headers.get("location") || url
      }
      return url
    } catch {
      return null
    }
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const name = parts.pop() || "新文件夹"
    const parentPath = parts.join("/")
    const parentId = await this.resolveFolderId(parentPath)

    await this.client.createFolder(name, parentId, this.addition.cloud_id)
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const item = await this.get("", physicalPath)
    if (item.is_dir) {
      await this.client.renameFolder(
        item.sign,
        newName,
        this.addition.cloud_id,
      )
    } else {
      await this.client.renameFile(item.sign, newName, this.addition.cloud_id)
    }
  }

  async move(
    _virtualPathSrc: string,
    physicalPathSrc: string,
    _virtualPathDst: string,
    physicalPathDst: string,
  ): Promise<void> {
    const srcItem = await this.get("", physicalPathSrc)
    const dstFolderId = await this.resolveFolderId(physicalPathDst)
    await this.performBatchTask(srcItem, dstFolderId, TaskTypeMove)
  }

  async copy(
    _virtualPathSrc: string,
    physicalPathSrc: string,
    _virtualPathDst: string,
    physicalPathDst: string,
  ): Promise<void> {
    const srcItem = await this.get("", physicalPathSrc)
    const dstFolderId = await this.resolveFolderId(physicalPathDst)
    await this.performBatchTask(srcItem, dstFolderId, TaskTypeCopy)
  }

  private async performBatchTask(
    srcItem: FileItem,
    targetFolderId: string,
    taskType: number,
  ): Promise<void> {
    const fileParam: TaskFileParam = {
      fileID: srcItem.sign,
      isFolder: srcItem.is_dir,
      fileName: srcItem.name,
    }

    const taskParam = {
      userOrCloudID: this.userId,
      source: 1,
      taskType,
      targetSource: 1,
      targetUserOrCloudID: this.userId,
      targetType: 1,
      targetFolderID: targetFolderId,
      taskStatusDetailDTOList: [fileParam],
    }

    if (this.addition.cloud_id) {
      taskParam.userOrCloudID = this.addition.cloud_id
      taskParam.source = 2
      taskParam.targetSource = 2
      taskParam.targetUserOrCloudID = this.addition.cloud_id
    }

    const task = await this.client.addBatchTask(taskParam)

    // Poll task status
    for (let i = 0; i < 10; i++) {
      const stat = await this.client.checkBatchTask({
        taskId: task.taskIDList[0],
        taskType: task.taskType,
        targetType: 1,
        targetFolderID: task.targetFolderID,
        targetSource: taskParam.targetSource,
        targetUserOrCloudID: taskParam.targetUserOrCloudID,
      })

      if (stat.taskStatus === TaskStatusConflict) {
        await this.client.cancelBatchTask(stat.taskID, task.taskType)
        throw new Error("[MoPan] File name conflict")
      }

      if (stat.taskStatus === TaskStatusCompleted) {
        return
      }

      // Wait 1 second before next check
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    throw new Error("[MoPan] Task timeout")
  }

  async remove(_virtualPath: string, physicalPath: string): Promise<void> {
    const item = await this.get("", physicalPath)
    await this.client.deleteToRecycle(
      [
        {
          fileID: item.sign,
          isFolder: item.is_dir,
          fileName: item.name,
        },
      ],
      this.addition.cloud_id,
    )
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: ReadableStream<Uint8Array>,
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const fileName = parts.pop() || "未命名文件"
    const parentPath = parts.join("/")
    const parentId = await this.resolveFolderId(parentPath)

    // Read all content and calculate MD5
    const chunks: Uint8Array[] = []
    const reader = content.getReader()
    let totalSize = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalSize += value.length
    }

    const fileBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)))
    const fileMd5 = createHash("md5").update(fileBuffer).digest("hex")

    // Init multi-part upload
    const initData = await this.client.initMultiUpload(
      fileMd5,
      fileName,
      totalSize,
      parentId,
      this.addition.cloud_id,
    )

    if (!initData.fileDataExists) {
      // Upload parts
      const parts = await this.client.getAllMultiUploadUrls(
        initData.uploadFileID,
        initData.partInfos,
      )

      for (const part of parts) {
        const start = (part.partNumber - 1) * initData.partSize
        const end =
          part.partNumber === parts.length
            ? totalSize
            : start + initData.partSize
        const chunk = fileBuffer.slice(start, end)

        await fetch(part.uploadUrl, {
          method: "PUT",
          body: chunk,
          headers: {
            "Content-Length": String(chunk.length),
          },
        })
      }
    }

    // Commit upload
    await this.client.commitMultiUploadFile(initData.uploadFileID)
  }

  private getRootId(): string {
    return this.addition.root_folder_id || ""
  }

  private async resolveFolderId(physicalPath: string): Promise<string> {
    const rootId = this.getRootId()
    const parts = physicalPath.split("/").filter(Boolean)

    if (parts.length === 0) {
      return rootId
    }

    let currentId = rootId

    for (const part of parts) {
      const data = await this.client.queryFiles(
        currentId,
        1,
        "filename",
        false,
        this.addition.cloud_id,
      )

      const folder = data.fileListAO?.folderList?.find((f) => f.name === part)
      if (!folder) {
        throw new Error(`[MoPan] Folder not found: ${part}`)
      }

      currentId = folder.id
    }

    return currentId
  }
}
