import { Hono } from "hono"
import { buildWebDavPropfindResponse } from "../internal/webdav/webdav"

export const webdavRouter = new Hono()

webdavRouter.on("OPTIONS", "/*", (c) => {
  c.header("DAV", "1, 2")
  c.header("Allow", "GET, POST, OPTIONS, HEAD, PROPFIND, PROPPATCH, MKCOL, DELETE, COPY, MOVE, LOCK, UNLOCK")
  c.header("MS-Author-Via", "DAV")
  c.status(200)
  return c.text("")
})

webdavRouter.on("PROPFIND", "/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/webdav/, "") || "/"
  
  const items = [
    { name: "Public Documents", size: 0, isFolder: true, modified: new Date().toISOString() },
    { name: "Multimedia", size: 0, isFolder: true, modified: new Date().toISOString() },
    { name: "OpenList Guide.pdf", size: 450231, isFolder: false, modified: new Date().toISOString() },
  ]

  const xml = buildWebDavPropfindResponse(c.req.path, items)
  
  c.header("Content-Type", "application/xml; charset=utf-8")
  c.status(207)
  return c.text(xml)
})

webdavRouter.get("/*", (c) => {
  return c.json({
    code: 200,
    message: "WebDAV Server is Active. Use a WebDAV client to connect to this endpoint.",
    endpoint: c.req.url,
  })
})
