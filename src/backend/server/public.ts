import { Hono } from "hono"
import { getDb } from "../internal/model/db"

export const publicRouter = new Hono()

publicRouter.get("/settings", async (c) => {
  const db = await getDb()

  const settingsObj: Record<string, string> = {
    title: "OpenList Serverless",
    main_color: "#1890ff",
    version: "v4.2.3",
    logo: "https://res.oplist.org/logo/logo.svg",
    favicon: "https://res.oplist.org/logo/logo.svg",
    allow_indexed: "true",
    allow_mounted: "true",
    check_down_link: "false",
    check_update: "false",
    default_page_size: "30",
    package_download: "true",
    offline_download: "true",
  }

  db.settings.forEach((s: any) => {
    settingsObj[s.key] = s.value
    if (s.key === "site_title") {
      settingsObj["title"] = s.value
    }
  })

  return c.json({
    code: 200,
    message: "success",
    data: settingsObj,
  })
})

publicRouter.get("/archive_extensions", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"],
  })
})

publicRouter.get("/offline_download_tools", (c) => {
  return c.json({
    code: 200,
    message: "success",
    data: [], // EdgeOne Pages / Serverless won't have local Aria2/qBit by default
  })
})
