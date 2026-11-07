// Fake OpenList backend with a nested tree and optional paginated listings.
import fs from "node:fs"
import path from "node:path"
import http from "node:http"

const now = "2026-11-01T10:00:00Z"
const dir = (name) => ({ name, is_dir: true, size: 0, type: 1, modified: now })
const file = (name, size, type = 0) => ({ name, is_dir: false, size, type, modified: now })

export const tree = {
  "/": [dir("B2"), dir("Backup"), dir("Photos"), file("readme.txt", 120, 5)],
  "/B2": [dir("Movies"), dir("Shows"), file("a.mkv", 5e9, 2)],
  "/B2/Movies": [dir("2024"), file("Inter.mkv", 6e10, 2)],
  "/B2/Movies/2024": [file("x.mp4", 1e9, 2)],
  "/B2/Shows": [],
  "/Backup": [],
  "/Photos": Array.from({ length: 25 }, (_, i) => dir(`Album ${String(i + 1).padStart(2, "0")}`)),
}
for (let i = 1; i <= 25; i++) tree[`/Photos/Album ${String(i).padStart(2, "0")}`] = []

export function createFixture(dist, { pageSize = 0, permission = 0xffff } = {}) {
  const calls = []
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost")
    if (url.pathname.startsWith("/api/")) {
      let body = ""
      for await (const c of req) body += c
      const json = body ? JSON.parse(body) : {}
      calls.push({ path: url.pathname, body: json })
      let data = {}
      const p = json.path ? decodeURIComponent(json.path).replace(/\/+$/, "") || "/" : "/"
      if (url.pathname.endsWith("/public/init_status")) data = { initialized: true }
      else if (url.pathname.endsWith("/public/settings"))
        data = {
          backend: "ts-worker", site_title: "OpenList", version: "4.2.3", logo: "",
          main_color: "#0061ff",
          pagination_type: pageSize ? "pagination" : "all",
          default_page_size: String(pageSize || 30),
          search_index: "database", iframe_previews: "{}", external_previews: "{}",
        }
      else if (url.pathname.endsWith("/public/archive_extensions") || url.pathname.endsWith("/public/plugins")) data = []
      else if (url.pathname.endsWith("/me"))
        data = { id: 1, username: "admin", role: 2, permission, base_path: "/", disabled: false, otp: false }
      else if (url.pathname.endsWith("/fs/list")) {
        const all = tree[p] ?? []
        const page = json.page || 1
        const per = json.per_page || 0
        const content = per ? all.slice((page - 1) * per, page * per) : all
        data = { content, total: all.length, readme: "", header: "", write: true, provider: "S3" }
      } else if (url.pathname.endsWith("/fs/dirs")) data = (tree[p] ?? []).filter((o) => o.is_dir)
      else if (url.pathname.endsWith("/fs/get")) {
        const name = p.split("/").pop() || ""
        const parent = p.slice(0, p.lastIndexOf("/")) || "/"
        const obj = p === "/" ? dir("root") : (tree[parent] ?? []).find((o) => o.name === name) ?? dir(name)
        data = { ...obj, thumb: "", sign: "", raw_url: "", readme: "", header: "", provider: "S3", related: [] }
      } else if (url.pathname.endsWith("/fs/usage")) data = { mounts: [] }
      else if (url.pathname.includes("/recent") || url.pathname.endsWith("/share/list"))
        data = { content: [], total: 0 }
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ code: 200, message: "success", data }))
      return
    }
    let f = path.join(dist, url.pathname)
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) f = path.join(dist, "index.html")
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" }
    res.setHeader("Content-Type", types[path.extname(f)] || "application/octet-stream")
    res.end(fs.readFileSync(f))
  })
  return { server, calls }
}
