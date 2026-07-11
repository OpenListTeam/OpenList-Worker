import { Hono } from "hono"
import { setupRouter } from "./server/router"

const app = new Hono()

// Apply full modular router setup mapping the Go server architecture
setupRouter(app)

// Catch-all route to debug 404 issues on Vercel/EdgeOne
app.all('*', (c) => {
  return c.json({
    error: 'Debug 404',
    method: c.req.method,
    url: c.req.url,
    path: c.req.path
  }, 404)
})

export default app

