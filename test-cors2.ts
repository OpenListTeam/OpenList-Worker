import { Hono } from "hono"
import { cors } from "hono/cors"

const app = new Hono()

const api = new Hono()
api.use("*", cors({
    origin: (origin) => origin || "*",
    credentials: true,
}))
api.post("/auth/login/hash", (c) => c.text("ok"))

app.route("/api", api)
app.route("/", api)

app.all("*", c => c.text("404", 404))

app.request(new Request("http://localhost/api/auth/login/hash", {
    method: "OPTIONS",
    headers: { "Origin": "https://example.com", "Access-Control-Request-Method": "POST" }
})).then(r => {
    console.log("status:", r.status)
    r.headers.forEach((v, k) => console.log(`${k}: ${v}`))
})
