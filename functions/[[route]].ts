import { handle } from "hono/cloudflare-pages"
import app from "../src/backend/index"

export const onRequest = handle(app)
