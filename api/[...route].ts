import { handle } from 'hono/vercel'
import app from '../src/backend/index'

const vercelHandler = handle(app)

export default async function handler(req: any, res: any, ctx: any) {
  // Detect if running in Edge Runtime (Fetch API)
  if (req instanceof Request || (req.headers && typeof req.headers.get === 'function')) {
    return app.fetch(req, res, ctx)
  }
  // Otherwise, running in Node.js (Vercel Serverless)
  // @ts-ignore
  return vercelHandler(req, res)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
export const OPTIONS = handler
