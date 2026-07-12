import { createClient } from "@supabase/supabase-js"

let fs: any = null;
let path: any = null;
let DB_PATH = "";

// Dynamic import for Node.js environments
async function initNodeModules() {
  if (fs && path) return;
  // Use robust check for Node.js environment
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      fs = await import('fs/promises');
      path = await import('path');
      DB_PATH = path.join(process.cwd(), "public_data", "db.json");
    } catch(e) {
      // Failed to load, will stay null
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
let supabase: any = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

export const defaultDb = {
  settings: [
    { key: "site_title", value: "OpenList", type: "string", help: "Site Title", group: 1, flag: 0 },
    { key: "home_icon", value: "openlist", type: "string", help: "Home icon name", group: 1, flag: 0 },
    { key: "auto_update_index", value: "false", type: "bool", help: "Auto update search index", group: 5, flag: 0 },
    { key: "version", value: "v4.2.3", type: "string", help: "Application version", group: 1, flag: 1 },
  ],
  storages: [],
  users: [
    {
      id: 1,
      username: "admin",
      role: 2,
      permission: 0,
      disabled: false,
      sso_id: "",
      pwd_update_at: new Date().toISOString(),
    },
  ],
  metas: [],
}

let memoryDb: any = null
let isWarnedAboutPersistence = false

const ensureDefaultSettings = (db: any) => {
  if (!db) return
  if (!db.settings) {
    db.settings = []
  }
  let modified = false
  for (const defSetting of defaultDb.settings) {
    const exists = db.settings.some((s: any) => s.key === defSetting.key)
    if (!exists) {
      db.settings.push(JSON.parse(JSON.stringify(defSetting)))
      modified = true
    }
  }
  if (modified) {
    saveDb(db).catch(() => {})
  }
}

const ensureDefaultStorages = (db: any) => {
  if (!db) return
  if (!db.storages) {
    db.storages = []
  }
  if (db.storages.length === 0) {
    db.storages.push({
      id: 1,
      mount_path: "/",
      driver: "Local",
      addition: "{\"root_folder_path\":\"/data\"}",
      disabled: false,
      modified: new Date().toISOString()
    })
    saveDb(db).catch(() => {})
  }
}

export const getDb = async () => {
  await initNodeModules();
  
  if (memoryDb) {
    ensureDefaultSettings(memoryDb)
    ensureDefaultStorages(memoryDb)
    return memoryDb
  }

  // Priority 1: Supabase
  if (supabase) {
    try {
      console.log("[DB] Attempting to load config from Supabase...")
      // Add a timeout to prevent hanging in serverless environments
      const fetchPromise = supabase
        .from("openlist_config")
        .select("data")
        .eq("id", 1)
        .maybeSingle()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Supabase fetch timeout")), 5000)
      )

      const { data, error } = await (Promise.race([fetchPromise, timeoutPromise]) as any)

      if (!error && data && data.data) {
        console.log("[DB] Config loaded from Supabase.")
        memoryDb = data.data
        ensureDefaultSettings(memoryDb)
        ensureDefaultStorages(memoryDb)
        
        if (fs && path) {
            try {
              await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
              await fs.writeFile(DB_PATH, JSON.stringify(memoryDb, null, 2))
            } catch (_) {}
        }
        return memoryDb
      } else if (error) {
        console.log("[Supabase Config] Info: load from Supabase skipped.", error.message || error)
      }
    } catch (err) {
      console.error("Failed to load from Supabase:", err)
    }
  }

  // Priority 2: Environment Variable
  if (process.env.DATABASE_JSON) {
    try {
      memoryDb = JSON.parse(process.env.DATABASE_JSON)
      ensureDefaultSettings(memoryDb)
      ensureDefaultStorages(memoryDb)
      return memoryDb
    } catch (err) {
      console.error("Failed to parse DATABASE_JSON env variable:", err)
    }
  }

  // Priority 3: Local File (Node only)
  if (fs && path) {
      try {
        const data = await fs.readFile(DB_PATH, "utf-8")
        memoryDb = JSON.parse(data)
        ensureDefaultSettings(memoryDb)
        ensureDefaultStorages(memoryDb)
        return memoryDb
      } catch (e) {
        try {
          await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
          await fs.writeFile(DB_PATH, JSON.stringify(defaultDb, null, 2))
          memoryDb = JSON.parse(JSON.stringify(defaultDb))
          ensureDefaultStorages(memoryDb)
          return memoryDb
        } catch (writeErr) {
          memoryDb = JSON.parse(JSON.stringify(defaultDb))
          ensureDefaultStorages(memoryDb)
          return memoryDb
        }
      }
  } else {
      // Fallback: Memory only
      if (!isWarnedAboutPersistence && !supabase) {
        console.warn("[DB] Running in Serverless mode without Supabase. Changes will NOT be persisted between sessions.")
        isWarnedAboutPersistence = true
      }
      memoryDb = JSON.parse(JSON.stringify(defaultDb))
      ensureDefaultStorages(memoryDb)
      return memoryDb
  }
}

export const saveDb = async (data: any) => {
  await initNodeModules();
  memoryDb = data

  if (supabase) {
    try {
      const { error } = await supabase
        .from("openlist_config")
        .upsert({ id: 1, data: data })
      if (error) {
        console.log("[Supabase Config] Info: Saving to Supabase skipped:", error.message || error)
      }
    } catch (err) {
      console.log("[Supabase Config] Error during Supabase save:", err)
    }
  }

  if (fs && path) {
      try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2))
      } catch (e) {
        // ignore
      }
  }
}

export async function resolvePath(virtualPath: string) {
  await initNodeModules();
  const db = await getDb()
  
  let cleanPath = "/" + virtualPath.split("/").filter(Boolean).join("/")
  if (cleanPath === "") {
    cleanPath = "/"
  }

  const activeStorages = (db.storages || [])
    .filter((s: any) => !s.disabled)

  if (activeStorages.length === 0) {
    throw new Error("failed get storage: storage not found; please add a storage first")
  }

  const sortedStorages = [...activeStorages].sort((a: any, b: any) => {
    const aMount = "/" + (a.mount_path || "").split("/").filter(Boolean).join("/")
    const bMount = "/" + (b.mount_path || "").split("/").filter(Boolean).join("/")
    return bMount.length - aMount.length
  })

  for (const storage of sortedStorages) {
    const mount = "/" + (storage.mount_path || "").split("/").filter(Boolean).join("/")
    const isRootMount = mount === "/"
    const isMatch = isRootMount || cleanPath === mount || cleanPath.startsWith(mount + "/")
    
    if (isMatch) {
      let relPath = cleanPath
      if (!isRootMount) {
        relPath = cleanPath.slice(mount.length)
      }
      if (!relPath.startsWith("/")) {
        relPath = "/" + relPath
      }
      
      const addition = JSON.parse(storage.addition || "{}")
      const isCloud = ["onedrive", "s3"].includes(storage.driver.toLowerCase())
      
      // Fix: Fallback for path.join if not in Node
      const defaultRoot = isCloud || !path ? "/" : path.join(process.cwd(), "public_data")
      let rootFolder = addition.root_folder_path !== undefined ? addition.root_folder_path : defaultRoot

      if (!isCloud && fs && path) {
        if (!rootFolder || rootFolder === "") {
          rootFolder = defaultRoot
        } else {
          try {
            rootFolder = path.resolve(process.cwd(), rootFolder)
          } catch(e) {}
        }
        try {
          await fs.mkdir(rootFolder, { recursive: true })
        } catch (e) {
          console.error("failed to create root folder:", rootFolder, e)
        }
      }

      let physicalPath = ""
      if (isCloud || !path) {
        const parts = [rootFolder, relPath].map(p => p.replace(/\\/g, "/")).filter(Boolean)
        physicalPath = "/" + parts.join("/").split("/").filter(Boolean).join("/")
      } else {
        physicalPath = path.join(rootFolder, relPath)
      }
      
      return {
        storage,
        relative: relPath,
        physical: physicalPath,
        rootFolder,
        cleanPath,
        isVirtual: false
      }
    }
  }

  let isVirtual = false
  for (const storage of activeStorages) {
    const mount = "/" + (storage.mount_path || "").split("/").filter(Boolean).join("/")
    if (mount !== "/" && mount.startsWith(cleanPath === "/" ? "/" : cleanPath + "/")) {
      isVirtual = true
      break
    }
  }

  if (isVirtual) {
    return {
      storage: null,
      relative: cleanPath,
      physical: null,
      rootFolder: null,
      cleanPath,
      isVirtual: true
    }
  }

  throw new Error("failed get storage: storage not found")
}

export async function getSettings() {
  const db = await getDb()
  const settingsObj: Record<string, any> = {}
  if (db.settings) {
    db.settings.forEach((s: any) => {
      settingsObj[s.key] = s.value
    })
  }
  return settingsObj
}

export async function getUsers() {
  const db = await getDb()
  return db.users || []
}

export async function getStorages() {
  const db = await getDb()
  return db.storages || []
}

export async function getMetas() {
  const db = await getDb()
  return db.metas || []
}
