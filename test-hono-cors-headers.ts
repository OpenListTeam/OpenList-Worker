import { Hono } from "hono"
import { cors } from "hono/cors"

const app = new Hono()
app.use("*", cors({
    origin: (origin) => origin || "*",
    credentials: true,
}))
app.post("/test", (c) => c.text("ok"))

app.request(new Request("http://localhost/test", {
    method: "OPTIONS",
    headers: { 
        "Origin": "https://example.com",
        "Access-Control-Request-Headers": "File-Path, Some-Other-Header"
    }
})).then(r => {
    console.log("status:", r.status)
    r.headers.forEach((v, k) => console.log(`${k}: ${v}`))
})
