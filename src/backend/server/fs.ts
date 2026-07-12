import { Hono } from "hono"
import {
  listItems,
  getItem,
  makeDirectory,
  renameItem,
  removeItems,
  moveItems,
  copyItems,
  putItem
} from "../internal/op/storage"
import { downloadOfflineFile } from "../internal/stream/stream"

export const fsRouter = new Hono()

fsRouter.post("/list", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const reqPath = body.path || "/"

  try {
    const { content, provider } = await listItems(reqPath)
    return c.json({
      code: 200,
      message: "success",
      data: { content, total: content.length, readme: "", provider },
    })
  } catch (err: any) {
    return c.json({ code: 500, message: err.message, data: null })
  }
})

fsRouter.post("/get", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const reqPath = body.path || "/"
  try {
    const { item, provider, rawUrl } = await getItem(reqPath)
    return c.json({
      code: 200,
      message: "success",
      data: {
        name: item.name,
        size: item.size,
        is_dir: item.is_dir,
        modified: item.modified,
        type: item.type,
        raw_url: rawUrl,
        readme: "",
        provider,
      },
    })
  } catch (err: any) {
    return c.json({ code: 500, message: err.message, data: null })
  }
})

fsRouter.post("/mkdir", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const reqPath = body.path || "/"
  try {
    await makeDirectory(reqPath)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: e.message, data: null })
  }
})

fsRouter.post("/rename", async (c) => {
  const { path: oldPath, name: newName } = await c.req.json().catch(() => ({}))
  try {
    await renameItem(oldPath, newName)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: e.message, data: null })
  }
})

fsRouter.post("/remove", async (c) => {
  const { dir, names } = await c.req.json().catch(() => ({}))
  try {
    await removeItems(dir, names)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: e.message, data: null })
  }
})

fsRouter.post("/move", async (c) => {
  const { src_dir, dst_dir, names } = await c.req.json().catch(() => ({}))
  try {
    await moveItems(src_dir, dst_dir, names)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: e.message, data: null })
  }
})

fsRouter.post("/copy", async (c) => {
  const { src_dir, dst_dir, names } = await c.req.json().catch(() => ({}))
  try {
    await copyItems(src_dir, dst_dir, names)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: e.message, data: null })
  }
})

fsRouter.put("/put", async (c) => {
  const reqPath = decodeURIComponent(c.req.header("File-Path") || "")
  try {
    const buffer = await c.req.arrayBuffer()
    await putItem(reqPath, buffer)
    return c.json({ code: 200, message: "success", data: null })
  } catch (e: any) {
    return c.json({ code: 500, message: e.message, data: null })
  }
})

fsRouter.post("/add_offline_download", async (c) => {
  const { path: reqPath, urls } = await c.req.json().catch(() => ({}))
  if (!urls || urls.length === 0) {
    return c.json({ code: 400, message: "No URLs provided" })
  }

  /* 
  // Offline download is not supported in stateless Serverless environments 
  // as it requires a long-running background process or specialized task queue.
  downloadOfflineFile(urls, reqPath).catch((err) => {
    console.error("Async offline download background job failed:", err)
  })
  */
  return c.json({ code: 200, message: "Offline download task received (Note: background processing limited in Serverless mode)", data: null })
})
