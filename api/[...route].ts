import { handle } from 'hono/vercel'
import app from '../src/backend/index.js'

export default handle(app)
