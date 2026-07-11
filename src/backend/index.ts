import { Hono } from "hono"
import { setupRouter } from "./server/router"

const app = new Hono()

// Simple logger middleware
app.use("*", async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`);
  await next();
});

// Apply full modular router setup mapping the Go server architecture
// Mount under both root and /api for compatibility with local and serverless paths
// We also add a middleware to ensure path consistency
app.use("*", async (c, next) => {
  const path = c.req.path;
  if (path.startsWith("/api/api/")) {
    // Fix double prefix if it happens
    return c.redirect(path.replace("/api/api/", "/api/"));
  }
  await next();
});

const api = new Hono()
setupRouter(api)
app.route("/api", api)
app.route("/", api)

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

