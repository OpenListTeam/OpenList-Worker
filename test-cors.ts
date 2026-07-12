import { Hono } from "hono"
import { cors } from "hono/cors"
const app = new Hono()
app.use("*", cors({
    origin: (origin) => origin || "http://localhost",
    credentials: true,
}))
app.get("/", (c) => c.text("ok"))
app.request(new Request("http://localhost/", {
    method: "OPTIONS",
    headers: { "Origin": "https://example.com", "Access-Control-Request-Method": "GET" }
})).then(r => {
    console.log("status:", r.status)
    r.headers.forEach((v, k) => console.log(`${k}: ${v}`))
})
