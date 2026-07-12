import { Hono } from "hono"
import { handle } from "hono/vercel"

const api = new Hono()
api.get("/auth/login/hash", (c) => c.text("success!"))

const backendApp = new Hono()
backendApp.route("/api", api)
backendApp.route("/", api)
backendApp.all("*", c => c.text("404 backend: " + c.req.path, 404))

const app = new Hono()
app.route("/", backendApp)

const handler = handle(app)

const req = new Request("https://openlistnext.edgeone.dev/auth/login/hash")
handler(req, {} as any).then(res => res.text().then(console.log))
