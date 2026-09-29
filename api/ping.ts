import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono()
app.get('/api/ping', (c) => c.json({ message: 'pong' }))
app.get('/ping', (c) => c.json({ message: 'pong' }))
app.get('*', (c) => c.json({ message: 'pong (catch-all)' }))

export const GET = handle(app)
export const POST = handle(app)
