import { Hono } from "hono"
import { setupRouter } from "./server/router"
import { startFtpServer } from "./server/ftp_server"

const app = new Hono()

// Apply full modular router setup mapping the Go server architecture
setupRouter(app)

// Start the FTP server in the background (except on Vercel where long-running TCP servers are not supported)
if (!process.env.VERCEL) {
  startFtpServer().catch(err => {
    console.error("Failed to start FTP server on boot:", err)
  })
}

export default app
