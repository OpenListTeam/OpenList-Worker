import { Hono } from "hono"
import { handle } from "hono/vercel"
import backendApp from "./index"

// This is a universal entry point for Edge runtimes (Vercel, Cloudflare, EdgeOne)
const app = new Hono()

// Mount the backend app
app.route("/", backendApp)

export default handle(app)
