import { handle } from 'hono/vercel'
import app from '../src/backend/index.js'

// Vercel Serverless Function entry point
const handler = handle(app)

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler

export default handler
