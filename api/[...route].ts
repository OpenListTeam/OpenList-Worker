import { handle } from 'hono/vercel'
import app from '../src/backend/index.js'

// Vercel Serverless Function entry point
export default handle(app)

