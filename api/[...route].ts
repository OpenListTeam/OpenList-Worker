import { handle } from 'hono/vercel'
import app from '../src/backend/index'

export default handle(app)
