import { handle } from 'hono/cloudflare-pages'
import app from '../src/backend/index.js'

// Cloudflare Pages Function entry point
export const onRequest = handle(app)
