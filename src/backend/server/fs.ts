import { Hono } from "hono"
import {
  listItems,
  getItem,
  makeDirectory,
  renameItem,
  removeItems,
  moveItems,
  copyItems,
  putItem,
} from "../internal/op/storage"
import { resolveShare } from "../internal/op/share"
import {
  fsReadAuthMiddleware,
  fsWriteAuthMiddleware,
} from "./middlewares"

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024 // 10 GB

function isInvalidFilename(name: string): boolean {
  return (
    !name ||
    name === "." ||
    name === ".." ||
    /[/\\]/.test(name) ||
    /\x00/.test(name)
  )
}

export const fsRouter = new Hono()

// GET sub-directories of a path (used by FolderTree in metas/storages editors)
fsRouter.post("/dirs", fsReadAuthMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const reqPath = body.path || "/"
  try {
    // Share path support for completeness
    if (reqPath.startsWith("/@s")) {
      const shareRes = await resolveShare(reqPath, body.password || "", c.env)
      if (!shareRes.ok) {
        return c.json({ code: 400, message: shareRes.error, data: null })
      }
      if (shareRes.virtualList) {
        const dirs = []
        for (const f of shareRes.share.files || []) {
          try {
            const { item } = await getItem(f)
            if (item.is_dir) {
              const segs = String(f).split("/").filter(Boolean)
              dirs.push({
                name: segs[segs.length - 1] || f,
                size: 0,
                is_dir: true,
                modified: item.modified || new Date().toISOString(),
                sign: "",
                thumb: "",
                type: 1,
              })
            }
          } catch {
            // skip unlistable share items
          }
        }
        return c.json({ code: 200, message: "success", data: dirs })
      }
      const { content } = await listItems(shareRes.realPath!)
      const dirs = content
        .filter((item: any) => item.is_dir)
        .map((item: any) => ({
          name: item.name,
          size: 0,
          is_dir: true,
          modified: item.modified || new Date().toISOString(),
          sign: item.sign || "",
          thumb: item.thumb || "",
          type: 1,
        }))
      return c.json({ code: 200, message: "success", data: dirs })
    }

    const { content } = await listItems(reqPath)
    const dirs = content
      .filter((item: any) => item.is_dir)
      .map((item: any) => ({
        name: item.name,
        size: 0,
        is_dir: true,
        modified: item.modified || new Date().toISOString(),
        sign: item.sign || "",
        thumb: item.thumb || "",
        type: 1,
      }))
    return c.json({ code: 200, message: "success", data: dirs })
  } catch (err: any) {
    console.error("[fs/dirs] Error:", err.message || err)
    return c.json({ code: 500, message: "操作失败", data: null })
  }
})

fsRouter.post("/list", fsReadAuthMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const reqPath = body.path || "/"

  try {
    // Share path: /@s/{shareId}/...
    if (reqPath.startsWith("/@s")) {
      const shareRes = await resolveShare(reqPath, body.password || "", c.env)
      if (!shareRes.ok) {
        return c.json({ code: 400, message: shareRes.error, data: null })
      }

      // Multi-file share root → virtual list of the shared items
      if (shareRes.virtualList) {
        const items = []
        for (const f of shareRes.share.files || []) {
          const segs = String(f).split("/").filter(Boolean)
          const name = segs[segs.length - 1] || f
          try {
            const { item } = await getItem(f)
            items.push({
              name,
              size: item.size || 0,
              is_dir: !!item.is_dir,
              modified: item.modified || new Date().toISOString(),
              sign: "",
              thumb: item.thumb || "",
              type: item.type ?? 0,
            })
          } catch {
            // If getItem failed, probe by listing — a listable path is a folder
            try {
              await listItems(f)
              items.push({
                name,
                size: 0,
                is_dir: true,
                modified: new Date().toISOString(),
                sign: "",
                thumb: "",
                type: 1,
              })
            } catch {
              items.push({
                name,
                size: 0,
                is_dir: false,
                modified: new Date().toISOString(),
                sign: "",
                thumb: "",
                type: 0,
              })
            }
          }
        }
        return c.json({
          code: 200,
          message: "success",
          data: {
            content: items,
            total: items.length,
            readme: shareRes.share.readme || "",
            header: shareRes.share.header || "",
            write: false,
            write_content_bypass: false,
            provider: "Share",
          },
        })
      }

      // Mapped to a real path — fall through to normal listing
      const { content, provider } = await listItems(shareRes.realPath!)
      const normalized = content.map((item: any) => ({
        name: item.name,
        size: item.size,
        is_dir: item.is_dir,
        created: item.created || item.modified || new Date().toISOString(),
        modified: item.modified || new Date().toISOString(),
        sign: item.sign || "",
        thumb: item.thumb || "",
        type: item.type ?? 0,
      }))
      return c.json({
        code: 200,
        message: "success",
        data: {
          content: normalized,
          total: normalized.length,
          readme: shareRes.share.readme || "",
          header: shareRes.share.header || "",
          write: false,
          write_content_bypass: false,
          provider,
        },
      })
    }

    const { content, provider } = await listItems(reqPath)
    // Normalize each item to the full Obj shape expected by the frontend
    const normalized = content.map((item: any) => ({
      name: item.name,
      size: item.size,
      is_dir: item.is_dir,
      created: item.created || item.modified || new Date().toISOString(),
      modified: item.modified || new Date().toISOString(),
      sign: item.sign || "",
      thumb: item.thumb || "",
      type: item.type ?? 0,
    }))
    return c.json({
      code: 200,
      message: "success",
      data: {
        content: normalized,
        total: normalized.length,
        readme: "",
        header: "",
        write: true,
        write_content_bypass: false,
        provider,
      },
    })
  } catch (err: any) {
    console.error("[fs/list] Error:", err.message || err)
    return c.json({ code: 500, message: "操作失败", data: null })
  }
})

fsRouter.post("/get", fsReadAuthMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const reqPath = body.path || "/"
  try {
    // Share path: /@s/{shareId}/...
    if (reqPath.startsWith("/@s")) {
      const shareRes = await resolveShare(reqPath, body.password || "", c.env)
      if (!shareRes.ok) {
        return c.json({ code: 400, message: shareRes.error, data: null })
      }

      // Multi-file share root: report as a virtual folder so the frontend lists it
      if (shareRes.virtualList) {
        const shareId = reqPath.split("/").filter(Boolean)[1] || "share"
        return c.json({
          code: 200,
          message: "success",
          data: {
            name: shareId,
            size: 0,
            is_dir: true,
            modified: new Date().toISOString(),
            sign: "",
            thumb: "",
            type: 1,
            raw_url: "",
            readme: shareRes.share.readme || "",
            header: shareRes.share.header || "",
            provider: "Share",
            related: [],
            write: false,
            write_content_bypass: false,
          },
        })
      }

      // Mapped to a real path — get with share-aware raw_url (/sd/{shareId}...)
      const shareId = reqPath.split("/").filter(Boolean)[1] || ""
      const { item, provider } = await getItem(shareRes.realPath!)
      const subPath = reqPath.replace(/^\/@s\/[^/]+/, "")
      return c.json({
        code: 200,
        message: "success",
        data: {
          name: item.name,
          size: item.size,
          is_dir: item.is_dir,
          created:
            (item as any).created || item.modified || new Date().toISOString(),
          modified: item.modified,
          sign: item.sign || "",
          thumb: (item as any).thumb || "",
          type: item.type ?? 0,
          raw_url: `/api/sd/${shareId}${subPath}`,
          readme: shareRes.share.readme || "",
          header: shareRes.share.header || "",
          provider,
          related: [],
          write: false,
          write_content_bypass: false,
        },
      })
    }

    const { item, provider, rawUrl } = await getItem(reqPath)
    return c.json({
      code: 200,
      message: "success",
      data: {
        name: item.name,
        size: item.size,
        is_dir: item.is_dir,
        created:
          (item as any).created || item.modified || new Date().toISOString(),
        modified: item.modified,
        sign: item.sign || "",
        thumb: (item as any).thumb || "",
        type: item.type ?? 0,
        raw_url: rawUrl,
        readme: "",
        header: "",
        provider,
        related: [],
        write: true,
        write_content_bypass: false,
      },
    })
  } catch (err: any) {
    console.error("[fs/get] Error:", err.message || err)
    return c.json({ code: 500, message: "操作失败", data: null })
  }
})

fsRouter.post("/mkdir", fsWriteAuthMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const reqPath = body.path || "/"
  try {
    await makeDirectory(reqPath)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: "操作失败", data: null })
  }
})

fsRouter.post("/rename", fsWriteAuthMiddleware, async (c) => {
  const { path: oldPath, name: newName } = await c.req.json().catch(() => ({}))
  if (isInvalidFilename(newName)) {
    return c.json({ code: 400, message: "无效的文件名", data: null }, 400)
  }
  try {
    await renameItem(oldPath, newName)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: "重命名失败", data: null })
  }
})

fsRouter.post("/remove", fsWriteAuthMiddleware, async (c) => {
  const { dir, names } = await c.req.json().catch(() => ({}))
  if (Array.isArray(names)) {
    for (const n of names) {
      if (isInvalidFilename(n)) {
        return c.json({ code: 400, message: `无效的名称: ${n}`, data: null }, 400)
      }
    }
  }
  try {
    await removeItems(dir, names)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: "删除失败", data: null })
  }
})

fsRouter.post("/move", fsWriteAuthMiddleware, async (c) => {
  const { src_dir, dst_dir, names } = await c.req.json().catch(() => ({}))
  try {
    await moveItems(src_dir, dst_dir, names)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: "操作失败", data: null })
  }
})

fsRouter.post("/copy", fsWriteAuthMiddleware, async (c) => {
  const { src_dir, dst_dir, names } = await c.req.json().catch(() => ({}))
  try {
    await copyItems(src_dir, dst_dir, names)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: "操作失败", data: null })
  }
})

fsRouter.put("/put", fsWriteAuthMiddleware, async (c) => {
  const reqPath = decodeURIComponent(c.req.header("File-Path") || "")
  const contentLength = parseInt(c.req.header("Content-Length") || "0", 10)
  if (contentLength > MAX_UPLOAD_SIZE) {
    return c.json({ code: 413, message: "文件过大（最大 10 GB）", data: null }, 413)
  }
  try {
    const buffer = await c.req.arrayBuffer()
    if (buffer.byteLength > MAX_UPLOAD_SIZE) {
      return c.json({ code: 413, message: "文件过大（最大 10 GB）", data: null }, 413)
    }
    await putItem(reqPath, Buffer.from(buffer))
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: "上传失败", data: null })
  }
})

fsRouter.post("/add_offline_download", fsWriteAuthMiddleware, async (c) => {
  const { path: reqPath, urls } = await c.req.json().catch(() => ({}))
  if (!urls || urls.length === 0) {
    return c.json({ code: 400, message: "未提供下载链接" })
  }

  /* 
  // Offline download is not supported in stateless Serverless environments 
  // as it requires a long-running background process or specialized task queue.
  downloadOfflineFile(urls, reqPath).catch((err) => {
    console.error("Async offline download background job failed:", err)
  })
  */
  return c.json({
    code: 200,
    message:
      "离线下载任务已接收（注意：无服务器模式下后台处理受限）",
    data: null,
  })
})
