import { Hono } from "hono"
import { setupRouter } from "./server/router"

const app = new Hono()

// Apply full modular router setup mapping the Go server architecture
setupRouter(app)

export default app
