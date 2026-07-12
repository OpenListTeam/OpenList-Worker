import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import backendApp from '../src/backend/index'
import { serve } from '@hono/node-server'

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

const vercelHandler = handle(app)

export default {
  fetch: app.fetch,
  ...vercelHandler
}

// 兼容标准的 Node.js 启动 (npm run start)
if (typeof process !== 'undefined' && process.release?.name === 'node') {
  // 仅在非 Serverless 运行环境下启动独立 HTTP 服务
  if (!process.env.VERCEL && !process.env.AWS_REGION && !process.env.TENCENTCLOUD_RUNENV) {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
    serve({
      fetch: app.fetch,
      port
    })
    console.log(`Server is running on port ${port}`)
  }
}
