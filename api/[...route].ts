import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import backendApp from '../src/backend/index'

const app = new Hono()

// Mount backendApp at root to let it handle /api or / prefixing
app.route("/", backendApp)

// Export for serverless
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
export const OPTIONS = handle(app)

export default handle(app)
