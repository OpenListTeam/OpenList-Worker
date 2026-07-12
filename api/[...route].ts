import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import backendApp from '../src/backend/index'

const app = new Hono()

// 挂载整个后端应用
app.route("/", backendApp)

// 导出符合 Vercel/EdgeOne 规范的 Serverless 句柄
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
export const OPTIONS = handle(app)

export default handle(app)
