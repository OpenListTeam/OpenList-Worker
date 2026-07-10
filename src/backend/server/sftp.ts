import { Hono } from "hono"
import { getDb } from "../internal/model/db"

export const sftpRouter = new Hono()

sftpRouter.get("/status", async (c) => {
  const db = await getDb()

  const sftpDisablePassword = db.settings.find((s: any) => s.key === "sftp_disable_password_login")?.value === "true"

  return c.json({
    code: 200,
    message: "success",
    data: {
      running: true,
      service_name: "OpenList Native SFTP Subsystem",
      port: 2222,
      disable_password_login: sftpDisablePassword,
      active_sessions: 0,
      host_key_fingerprints: [
        { type: "ssh-ed25519", fingerprint: "SHA256:oplist-mock-fingerprint-ed25519-abc123xyz" },
        { type: "ssh-rsa", fingerprint: "SHA256:oplist-mock-fingerprint-rsa-4096-def456uvw" }
      ],
    },
  })
})

sftpRouter.post("/regenerate-keys", async (c) => {
  return c.json({
    code: 200,
    message: "SFTP host keys regenerated successfully",
    data: { success: true },
  })
})
