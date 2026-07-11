import dotenv from "dotenv";
dotenv.config({ override: true });
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import backendApp from "./src/backend/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new Hono();

// Mount the API backend
app.route("/", backendApp);

// Mount frontend static files
const distPath = path.join(__dirname, "dist");
app.use(
  "/*",
  serveStatic({
    root: "./dist",
    rewriteRequestPath: (reqPath) => {
      // Fallback for SPA routing
      if (!reqPath.includes(".")) {
        return "/index.html";
      }
      return reqPath;
    },
  })
);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
