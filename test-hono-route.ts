import { Hono } from "hono"
import { cors } from "hono/cors"

const app = new Hono()

app.use("*", async (c, next) => {
    console.log("Root middleware:", c.req.method, c.req.path)
    await next()
})

const api = new Hono()
api.use("*", cors({
    origin: (origin) => origin || "*",
    credentials: true,
}))
api.post("/auth/login/hash", (c) => c.text("ok"))

app.route("/api", api)
app.route("/", api)

app.all("*", (c) => {
    console.log("Root 404 handler", c.req.path)
    return c.text("404", 404)
})

app.request(new Request("http://localhost/api/auth/login/hash", {
    method: "OPTIONS",
    headers: { "Origin": "https://example.com" }
})).then(r => {
    console.log("status /api/auth:", r.status)
    r.headers.forEach((v, k) => console.log(`${k}: ${v}`))
})

app.request(new Request("http://localhost/api/not_exist", {
    method: "OPTIONS",
    headers: { "Origin": "https://example.com" }
})).then(r => {
    console.log("status /api/not_exist:", r.status)
})

app.request(new Request("http://localhost/auth/login/hash", {
    method: "OPTIONS",
    headers: { "Origin": "https://example.com" }
})).then(r => {
    console.log("status /auth:", r.status)
})
