import { Hono } from "hono"
import { getDb } from "../internal/model/db"
import { startFtpServer } from "./ftp_server"

export const ftpRouter = new Hono()

ftpRouter.get("/status", async (c) => {
  const db = await getDb()
  const ftpPublicHost = db.settings.find((s: any) => s.key === "ftp_public_host")?.value || "127.0.0.1"
  const ftpPasvPortMap = db.settings.find((s: any) => s.key === "ftp_pasv_port_map")?.value || "50000-50100"
  const ftpMandatoryTls = db.settings.find((s: any) => s.key === "ftp_mandatory_tls")?.value === "true"
  const ftpImplicitTls = db.settings.find((s: any) => s.key === "ftp_implicit_tls")?.value === "true"
  return c.json({
    code: 200,
    message: "success",
    data: {
      running: true,
      service_name: "OpenList Native FTP Daemon",
      port: ftpImplicitTls ? 990 : 2121,
      public_host: ftpPublicHost,
      passive_ports: ftpPasvPortMap,
      tls_enabled: ftpMandatoryTls || ftpImplicitTls,
      implicit_tls: ftpImplicitTls,
      active_connections: 0,
      transferred_bytes: 0,
    },
  })
})

ftpRouter.post("/restart", async (c) => {
  await startFtpServer()
  return c.json({
    code: 200,
    message: "FTP server restarted successfully with updated settings",
    data: { success: true },
  })
})
