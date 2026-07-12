import { createClient } from "@supabase/supabase-js"
import sha256 from "sha256"
import { defaultDb } from "~/backend/internal/model/db"

const supabaseUrl = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) || import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || "https://qrcvaxonlcllttucfyfb.supabase.co"
const supabaseKey = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_q_8kAiLFJve95ue2mJo6hA_tgcRcMDV"

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

let cachedDb: any = null

export async function getClientDb(): Promise<any> {
  if (cachedDb) return cachedDb

  if (!supabase) {
    console.warn("[Supabase client] Supabase is not configured.")
    cachedDb = JSON.parse(JSON.stringify(defaultDb))
    return cachedDb
  }

  try {
    console.log("[Supabase client] Attempting to load config from Supabase...")
    const { data, error } = await supabase
      .from("openlist_config")
      .select("data")
      .eq("id", 1)
      .maybeSingle()

    if (!error && data && data.data) {
      cachedDb = data.data
      console.log("[Supabase client] Successfully loaded config from Supabase.")
    } else {
      console.warn("[Supabase client] Failed to load config from Supabase, error:", error)
      cachedDb = JSON.parse(JSON.stringify(defaultDb))
      // Try to save default to Supabase
      await saveClientDb(cachedDb)
    }
  } catch (err) {
    console.error("[Supabase client] Exception while loading config:", err)
    cachedDb = JSON.parse(JSON.stringify(defaultDb))
  }

  return cachedDb
}

export async function saveClientDb(data: any) {
  cachedDb = data
  if (!supabase) return

  try {
    const { error } = await supabase
      .from("openlist_config")
      .upsert({ id: 1, data })
    if (error) {
      console.error("[Supabase client] Error saving config to Supabase:", error.message)
    } else {
      console.log("[Supabase client] Successfully saved config to Supabase.")
    }
  } catch (err) {
    console.error("[Supabase client] Exception saving config to Supabase:", err)
  }
}

export async function handleMockRequest(config: any): Promise<any> {
  const url = config.url || ""
  const method = (config.method || "get").toLowerCase()

  // Helper to extract query parameters
  const getQueryParam = (name: string): string | undefined => {
    if (config.params && config.params[name] !== undefined) {
      return String(config.params[name])
    }
    const match = url.match(new RegExp(`[?&]${name}=([^&]*)`))
    return match ? decodeURIComponent(match[1]) : undefined
  }

  // Parse body
  let body: any = {}
  if (config.data) {
    try {
      body = typeof config.data === "string" ? JSON.parse(config.data) : config.data
    } catch (_) {
      body = config.data
    }
  }

  // Define clean paths relative to the API root
  let cleanPath = url
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    try {
      cleanPath = new URL(cleanPath).pathname
    } catch (_) {}
  }
  // Strip optional /api prefix
  cleanPath = cleanPath.replace(/^\/?api/, "")
  if (!cleanPath.startsWith("/")) {
    cleanPath = "/" + cleanPath
  }
  // Strip query string for path matching
  const pathNoQuery = cleanPath.split("?")[0]

  // 1. /public/settings
  if (pathNoQuery === "/public/settings" && method === "get") {
    const db = await getClientDb()
    const settingsMap: Record<string, string> = {}
    if (db.settings) {
      db.settings.forEach((s: any) => {
        settingsMap[s.key] = s.value
      })
    }
    return { code: 200, message: "success", data: settingsMap }
  }

  // 2. /public/archive_extensions
  if (pathNoQuery === "/public/archive_extensions" && method === "get") {
    return { code: 200, message: "success", data: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"] }
  }

  // 3. /auth/login/hash
  if (pathNoQuery === "/auth/login/hash" && method === "post") {
    // We can allow standard 'admin' login
    const expectedUsername = "admin"
    const hash_salt = "https://github.com/alist-org/alist"
    const expectedPassword = sha256(`admin-${hash_salt}`)
    
    // Fallback to checking password matches admin or users stored in supabase database
    const db = await getClientDb()
    
    const isMatched = (body.username === expectedUsername && body.password === expectedPassword) ||
                      (db.users || []).some((u: any) => u.username === body.username && (u.password === body.password || !u.password))
    
    if (isMatched) {
      return {
        code: 200,
        message: "success",
        data: { token: "supabase-mock-token-admin" }
      }
    }
    return { code: 401, message: "Invalid credentials", data: null }
  }

  // 4. /me
  if (pathNoQuery === "/me" && method === "get") {
    return {
      code: 200,
      message: "success",
      data: {
        id: 1,
        username: "admin",
        role: 2,
        permission: 0,
        otp: false
      }
    }
  }

  // 5. /admin/supabase/status
  if (pathNoQuery === "/admin/supabase/status" && method === "get") {
    return {
      code: 200,
      message: "success",
      data: {
        configured: !!supabase,
        tableExists: true,
        url: supabaseUrl
      }
    }
  }

  // 6. /admin/setting/list
  if (pathNoQuery === "/admin/setting/list" && method === "get") {
    const db = await getClientDb()
    let settings = db.settings || []
    const groupQuery = getQueryParam("group")
    const groupsQuery = getQueryParam("groups")

    if (groupQuery !== undefined) {
      const groupNum = parseInt(groupQuery, 10)
      settings = settings.filter((s: any) => s.group === groupNum)
    } else if (groupsQuery !== undefined) {
      const groupNums = groupsQuery.split(",").map((g: string) => parseInt(g, 10))
      settings = settings.filter((s: any) => groupNums.includes(s.group))
    }
    return { code: 200, message: "success", data: settings }
  }

  // 7. /admin/setting/save
  if (pathNoQuery === "/admin/setting/save" && method === "post") {
    const db = await getClientDb()
    const items = Array.isArray(body) ? body : [body]
    for (const item of items) {
      const idx = db.settings.findIndex((s: any) => s.key === item.key)
      if (idx !== -1) {
        db.settings[idx].value = item.value
      } else {
        db.settings.push(item)
      }
    }
    await saveClientDb(db)
    return { code: 200, message: "success", data: null }
  }

  // 8. /admin/setting/delete
  if (pathNoQuery === "/admin/setting/delete" && method === "post") {
    const key = getQueryParam("key")
    if (key) {
      const db = await getClientDb()
      db.settings = (db.settings || []).filter((s: any) => s.key !== key)
      await saveClientDb(db)
    }
    return { code: 200, message: "success", data: null }
  }

  // 9. /admin/setting/default
  if (pathNoQuery === "/admin/setting/default" && method === "post") {
    const groupQuery = getQueryParam("group")
    if (groupQuery === undefined) {
      return { code: 400, message: "group is required", data: null }
    }
    const groupNum = parseInt(groupQuery, 10)
    const db = await getClientDb()
    db.settings = (db.settings || []).filter((s: any) => s.group !== groupNum)
    const groupDefaults = defaultDb.settings.filter((s: any) => s.group === groupNum)
    db.settings.push(...JSON.parse(JSON.stringify(groupDefaults)))
    await saveClientDb(db)
    return { code: 200, message: "success", data: groupDefaults }
  }

  // 10. /admin/storage/list
  if (pathNoQuery === "/admin/storage/list" && method === "get") {
    const db = await getClientDb()
    return {
      code: 200,
      message: "success",
      data: { content: db.storages || [], total: (db.storages || []).length }
    }
  }

  // 11. /admin/storage/create
  if (pathNoQuery === "/admin/storage/create" && method === "post") {
    const db = await getClientDb()
    const mountPath = "/" + (body.mount_path || "").split("/").filter(Boolean).join("/")
    if (db.storages.some((s: any) => "/" + (s.mount_path || "").split("/").filter(Boolean).join("/") === mountPath)) {
      return { code: 400, message: "mount path already exists", data: null }
    }
    const newStorage = {
      ...body,
      mount_path: mountPath,
      id: db.storages.length ? Math.max(...db.storages.map((s: any) => s.id)) + 1 : 1,
      status: "work",
      modified: new Date().toISOString()
    }
    db.storages.push(newStorage)
    await saveClientDb(db)
    return { code: 200, message: "success", data: newStorage }
  }

  // 12. /admin/storage/update
  if (pathNoQuery === "/admin/storage/update" && method === "post") {
    const db = await getClientDb()
    const mountPath = "/" + (body.mount_path || "").split("/").filter(Boolean).join("/")
    if (db.storages.some((s: any) => s.id !== body.id && "/" + (s.mount_path || "").split("/").filter(Boolean).join("/") === mountPath)) {
      return { code: 400, message: "mount path already exists", data: null }
    }
    const idx = db.storages.findIndex((s: any) => s.id === body.id)
    if (idx !== -1) {
      db.storages[idx] = {
        ...db.storages[idx],
        ...body,
        mount_path: mountPath,
        modified: new Date().toISOString()
      }
      await saveClientDb(db)
    }
    return { code: 200, message: "success", data: null }
  }

  // 13. /admin/storage/delete
  if (pathNoQuery === "/admin/storage/delete" && method === "post") {
    const id = parseInt(getQueryParam("id") || "0", 10)
    const db = await getClientDb()
    db.storages = db.storages.filter((s: any) => s.id !== id)
    await saveClientDb(db)
    return { code: 200, message: "success", data: null }
  }

  // 14. /admin/storage/enable
  if (pathNoQuery === "/admin/storage/enable" && method === "post") {
    const id = parseInt(getQueryParam("id") || "0", 10)
    const db = await getClientDb()
    const s = db.storages.find((s: any) => s.id === id)
    if (s) {
      s.disabled = false
      await saveClientDb(db)
    }
    return { code: 200, message: "success", data: null }
  }

  // 15. /admin/storage/disable
  if (pathNoQuery === "/admin/storage/disable" && method === "post") {
    const id = parseInt(getQueryParam("id") || "0", 10)
    const db = await getClientDb()
    const s = db.storages.find((s: any) => s.id === id)
    if (s) {
      s.disabled = true
      await saveClientDb(db)
    }
    return { code: 200, message: "success", data: null }
  }

  // 16. /admin/driver/names
  if (pathNoQuery === "/admin/driver/names" && method === "get") {
    return { code: 200, message: "success", data: ["Local", "S3", "Onedrive"] }
  }

  // 17. /admin/driver/list
  if (pathNoQuery === "/admin/driver/list" && method === "get") {
    return {
      code: 200,
      message: "success",
      data: {
        Local: {
          name: "Local",
          default_mount_path: "/",
          common: [
            { name: "mount_path", type: "string", default: "", required: true, help: "1" },
            { name: "order", type: "number", default: "0", required: false, help: "" },
            { name: "remark", type: "string", default: "", required: false, help: "" }
          ],
          additional: [
            { name: "root_folder_path", type: "string", default: "", required: true }
          ]
        },
        S3: {
          name: "S3",
          default_mount_path: "/s3",
          common: [
            { name: "mount_path", type: "string", default: "", required: true, help: "1" },
            { name: "order", type: "number", default: "0", required: false, help: "" },
            { name: "remark", type: "string", default: "", required: false, help: "" }
          ],
          additional: [
            { name: "bucket", type: "string", default: "", required: true },
            { name: "endpoint", type: "string", default: "", required: true },
            { name: "region", type: "string", default: "", required: true },
            { name: "access_key_id", type: "string", default: "", required: true },
            { name: "secret_access_key", type: "string", default: "", required: true }
          ]
        },
        Onedrive: {
          name: "Onedrive",
          default_mount_path: "/onedrive",
          common: [
            { name: "mount_path", type: "string", default: "", required: true, help: "1" },
            { name: "order", type: "number", default: "0", required: false, help: "" },
            { name: "remark", type: "string", default: "", required: false, help: "" }
          ],
          additional: [
            { name: "client_id", type: "string", default: "", required: true },
            { name: "client_secret", type: "string", default: "", required: true },
            { name: "redirect_uri", type: "string", default: "", required: true },
            { name: "refresh_token", type: "string", default: "", required: true }
          ]
        }
      }
    }
  }

  // 18. /admin/user/list
  if (pathNoQuery === "/admin/user/list" && method === "get") {
    const db = await getClientDb()
    return {
      code: 200,
      message: "success",
      data: { content: db.users || [], total: (db.users || []).length }
    }
  }

  // 19. /admin/user/create
  if (pathNoQuery === "/admin/user/create" && method === "post") {
    const db = await getClientDb()
    const newUser = {
      ...body,
      id: db.users.length ? Math.max(...db.users.map((u: any) => u.id)) + 1 : 1,
      pwd_update_at: new Date().toISOString()
    }
    db.users.push(newUser)
    await saveClientDb(db)
    return { code: 200, message: "success", data: newUser }
  }

  // 20. /admin/user/update
  if (pathNoQuery === "/admin/user/update" && method === "post") {
    const db = await getClientDb()
    const idx = db.users.findIndex((u: any) => u.id === body.id)
    if (idx !== -1) {
      db.users[idx] = {
        ...db.users[idx],
        ...body,
        pwd_update_at: new Date().toISOString()
      }
      await saveClientDb(db)
    }
    return { code: 200, message: "success", data: null }
  }

  // 21. /admin/user/delete
  if (pathNoQuery === "/admin/user/delete" && method === "post") {
    const id = parseInt(getQueryParam("id") || "0", 10)
    const db = await getClientDb()
    db.users = db.users.filter((u: any) => u.id !== id)
    await saveClientDb(db)
    return { code: 200, message: "success", data: null }
  }

  // 22. /admin/meta/list
  if (pathNoQuery === "/admin/meta/list" && method === "get") {
    const db = await getClientDb()
    return {
      code: 200,
      message: "success",
      data: { content: db.metas || [], total: (db.metas || []).length }
    }
  }

  return null
}
