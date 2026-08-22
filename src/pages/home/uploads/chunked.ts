import { password } from "~/store"
import { r, pathDir } from "~/utils"
import { Resp } from "~/types"
import { SetUpload, Upload } from "./types"
import { calculateHash } from "./util"
import { StreamUpload } from "./stream"

/**
 * 分片会话上传（大文件友好）：
 * 1. POST /fs/upload/create 创建上传会话（可携带 MD5 触发秒传）
 * 2. 按 chunkSize 逐片 PUT /fs/upload/part（每片独立请求，进度真实可见，
 *    服务端内存占用恒定，不受 Workers 请求体/内存上限约束）
 * 3. POST /fs/upload/complete 收尾
 * 存储不支持时自动回退到流式上传。
 */
export const ChunkedUpload: Upload = async (
  uploadPath: string,
  file: File,
  setUpload: SetUpload,
  asTask = false,
  overwrite = false,
  rapid = false,
): Promise<Error | undefined> => {
  // 根目录上传时 pathDir 返回 ""，归一化为 "/"，否则后端会报 path and file_name are required
  const dirPath = pathDir(uploadPath) || "/"

  let md5 = ""
  if (rapid) {
    setUpload("status", "hashing")
    try {
      const hashes = await calculateHash(file, (p) => setUpload("progress", p))
      md5 = hashes.md5
    } catch {
      // hash 计算失败时降级为普通无秒传分片上传
      md5 = ""
    }
  }

  setUpload("status", "uploading")
  const createSession = (): Promise<Resp<any>> =>
    r.post(
      "/fs/upload/create",
      {
        path: dirPath,
        file_name: file.name,
        size: file.size,
        md5,
      },
      {
        headers: {
          Password: password(),
          Overwrite: overwrite.toString(),
        },
      },
    ) as unknown as Promise<Resp<any>>

  let createResp = await createSession()
  if (createResp.code !== 200) {
    throw new Error(createResp.message)
  }
  let info = createResp.data
  // 189Cloud requires the complete MD5 during init. Hash in the browser and
  // retry session creation; the Worker still only receives one chunk at a time.
  if (info?.requiresMd5 && !md5) {
    setUpload("status", "hashing")
    const hashes = await calculateHash(file, (p) => {
      setUpload("progress", p | 0)
    })
    md5 = hashes.md5
    setUpload("status", "uploading")
    createResp = await createSession()
    if (createResp.code !== 200) {
      throw new Error(createResp.message)
    }
    info = createResp.data
  }
  // 存储不支持分片会话上传 → 回退到流式上传
  if (!info) {
    return await StreamUpload(
      uploadPath,
      file,
      setUpload,
      asTask,
      overwrite,
      false,
    )
  }
  // 秒传命中：文件已存在，直接完成
  if (info.reuse) {
    return
  }

  const { session, partCount, chunkSize } = info
  const totalParts: number = partCount

  let oldTimestamp = new Date().valueOf()
  let oldLoaded = 0
  const partMd5s: string[] = []

  // 逐片上传（顺序上传，保证分片顺序与会话一致）
  for (let i = 1; i <= totalParts; i++) {
    const start = (i - 1) * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    const partResp = (await r.put("/fs/upload/part", chunk, {
      headers: {
        "X-Upload-Session": session,
        "X-Part-Number": String(i),
        "Upload-Path": encodeURIComponent(dirPath),
        "Content-Type": "application/octet-stream",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const loaded = start + progressEvent.loaded
          const complete = (loaded / file.size) * 100
          setUpload("progress", complete | 0)
          const timestamp = new Date().valueOf()
          const duration = (timestamp - oldTimestamp) / 1000
          if (duration > 1) {
            const speed = (loaded - oldLoaded) / duration
            setUpload("speed", speed)
            oldTimestamp = timestamp
            oldLoaded = loaded
          }
        }
      },
    })) as unknown as Resp<any>
    if (partResp.code !== 200) {
      throw new Error(
        `[分片 ${i}/${totalParts}] ${partResp.message || "上传失败"}`,
      )
    }
    if (partResp.data?.partMd5) partMd5s[i - 1] = partResp.data.partMd5
  }

  setUpload("status", "backending")
  const completeResp = (await r.post("/fs/upload/complete", {
    path: dirPath,
    session,
    partMd5s,
  })) as unknown as Resp<any>
  if (completeResp.code !== 200) {
    throw new Error(completeResp.message)
  }
  return
}
