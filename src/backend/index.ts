import { Hono } from "hono"
import { setupRouter } from "./server/router"

const app = new Hono()

// Mount everything under a sub-app that we can mount at different prefixes
const api = new Hono()
setupRouter(api)

// Handle both /api and root paths
app.route("/api", api)
app.route("/", api)

// Catch-all
app.all('*', (c) => {
  console.log(`[Backend 404] ${c.req.method} ${c.req.path}`)
  return c.json({ code: 404, message: `Route ${c.req.path} not found` }, 404)
})

export default app

