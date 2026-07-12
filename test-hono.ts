import { Hono } from "hono"
const api = new Hono()
api.get("/hello", (c) => c.text("Hello"))
const app = new Hono()
app.route("/api", api)
app.route("/", api)
app.request("/api/hello").then(r => console.log("/api/hello:", r.status))
app.request("/hello").then(r => console.log("/hello:", r.status))
