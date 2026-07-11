import dotenv from "dotenv";
dotenv.config({ override: true });
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import backendApp from "./src/backend/index";

// Handle __filename and __dirname for both ESM and CJS environments
let _filename = "";
let _dirname = "";
try {
  _filename = fileURLToPath(import.meta.url);
  _dirname = path.dirname(_filename);
} catch (e) {
  // @ts-ignore
  _filename = typeof __filename !== "undefined" ? __filename : "";
  // @ts-ignore
  _dirname = typeof __dirname !== "undefined" ? __dirname : "";
}

const app = new Hono();

// Mount the API backend
app.route("/", backendApp);

// Mount frontend static files
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
