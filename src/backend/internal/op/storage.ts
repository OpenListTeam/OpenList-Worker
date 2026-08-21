import { resolvePath, getDb, saveDb } from "../model/db"
import { FileItem, StorageDriver, calcFileType } from "../driver/base"
import { Onedrive } from "../../drivers/onedrive/driver"
import { AliyundriveOpen } from "../../drivers/aliyundrive_open/driver"
import { GoogleDrive } from "../../drivers/google_drive/driver"
import { QuarkDriver } from "../../drivers/quark/driver"
import { Pan123Driver } from "../../drivers/123pan/driver"
import {
  BaiduDriver,
  normalizeBaiduAddition,
} from "../../drivers/baidu_netdisk/driver"
import { Pan115Driver } from "../../drivers/115open/driver"
import { GithubDriver } from "../../drivers/github/driver"
import {
  ThunderDriver,
  ThunderExpertDriver,
} from "../../drivers/thunder/driver"
import { Cloud189Driver } from "../../drivers/189/driver"
import { LanzouDriver } from "../../drivers/lanzou/driver"

// LocalDriver is not available in Cloudflare Workers (no fs module).
// When running in Node.js container mode, import dynamically on first use.
let _localDriver: StorageDriver | null = null
async function getLocalDriver(): Promise<StorageDriver> {
  if (!_localDriver) {
    const { LocalDriver } = await import("../../drivers/local")
    _localDriver = new LocalDriver()
  }
  return _localDriver
}

const driverCache = new Map<string, StorageDriver>()

function parseAddition(storageConfig?: any): any {
  const additionStr = storageConfig?.addition
  if (!additionStr) return {}
  return typeof additionStr === "string"
    ? JSON.parse(additionStr || "{}")
    : additionStr
}

export async function getDriver(
  driverName: string,
  storageConfig?: any,
): Promise<StorageDriver> {
  const normDriver = (driverName || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  if (normDriver === "local") {
    // Only available in Node.js container — not in Cloudflare Workers
    if (typeof process !== "undefined" && process.release?.name === "node") {
      return getLocalDriver()
    }
    throw new Error(
      "Local storage driver requires Node.js runtime (not available in Cloudflare Workers)",
    )
  }

  if (!storageConfig) {
    throw new Error(
      "failed get driver: storage config not found for driver " + driverName,
    )
  }

  const cacheKey = `${storageConfig.id}_${storageConfig.modified}`

  if (driverCache.has(cacheKey)) {
    return driverCache.get(cacheKey)!
  }

  let driver: StorageDriver
  if (
    normDriver === "onedrive" ||
    normDriver === "onedriveapp" ||
    normDriver === "onedrivesb"
  ) {
    driver = new Onedrive(
      parseAddition(storageConfig),
      async (refreshToken) => {
        try {
          const db = await getDb()
          const st = (db.storages || []).find(
            (s: any) => s.id === storageConfig?.id,
          )
          if (!st) return
          const stAddition =
            typeof st.addition === "string"
              ? JSON.parse(st.addition || "{}")
              : st.addition || {}
          stAddition.refresh_token = refreshToken
          st.addition = JSON.stringify(stAddition)
          await saveDb(db)
        } catch (e) {
          console.warn("[Onedrive] failed to persist refresh token:", e)
        }
      },
    )
    try {
      await driver.init?.()
    } catch (e) {
      console.error("onedrive init failed:", e)
      throw e
    }
  } else if (
    normDriver === "aliyundrive" ||
    normDriver === "aliyundriveopen" ||
    normDriver === "aliyundriveshare" ||
    normDriver === "aliyun"
  ) {
    // 统一只保留阿里云盘 OAuth2 (AliyundriveOpen)
    driver = new AliyundriveOpen(parseAddition(storageConfig))
    await driver.init?.()
  } else if (normDriver === "googledrive") {
    driver = new GoogleDrive(parseAddition(storageConfig))
    await driver.init?.()
  } else if (
    normDriver === "quark" ||
    normDriver === "quarkuc" ||
    normDriver === "uc"
  ) {
    driver = new QuarkDriver(parseAddition(storageConfig))
    await driver.init?.()
  } else if (normDriver === "123pan" || normDriver === "123") {
    const addition = parseAddition(storageConfig)
    driver = new Pan123Driver(addition, async (token: string) => {
      // Persist the refreshed 123Pan access_token back to the storage config
      // so subsequent cold starts skip password login (avoiding overseas-IP
      // risk control in Cloudflare Workers).
      try {
        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === storageConfig?.id,
        )
        if (!st) return
        const stAddition =
          typeof st.addition === "string"
            ? JSON.parse(st.addition || "{}")
            : st.addition || {}
        stAddition.access_token = token
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[123Pan] failed to persist access_token:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "baidunetdisk" ||
    normDriver === "baidu" ||
    normDriver === "baiduyun"
  ) {
    const addition = parseAddition(storageConfig)
    driver = new BaiduDriver(addition, async (tokens) => {
      // Persist refreshed tokens (and normalized defaults) back to the
      // storage config so cold starts skip OAuth entirely.
      try {
        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === storageConfig?.id,
        )
        if (!st) return
        const stAddition =
          typeof st.addition === "string"
            ? JSON.parse(st.addition || "{}")
            : st.addition || {}
        stAddition.access_token = tokens.access_token
        stAddition.refresh_token = tokens.refresh_token
        st.addition = JSON.stringify(normalizeBaiduAddition(stAddition))
        await saveDb(db)
      } catch (e) {
        console.warn("[baidu_netdisk] failed to persist token:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "115open" ||
    normDriver === "115" ||
    normDriver === "115pan"
  ) {
    const addition = parseAddition(storageConfig)
    driver = new Pan115Driver(addition, async (tokens) => {
      // 持久化刷新后的 access_token / refresh_token，避免冷启动重复刷新
      try {
        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === storageConfig?.id,
        )
        if (!st) return
        const stAddition =
          typeof st.addition === "string"
            ? JSON.parse(st.addition || "{}")
            : st.addition || {}
        stAddition.access_token = tokens.access_token
        stAddition.refresh_token = tokens.refresh_token
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[115open] failed to persist token:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "github" ||
    normDriver === "githubapi" ||
    normDriver === "github_api"
  ) {
    const addition = parseAddition(storageConfig)
    driver = new GithubDriver(addition)
    await driver.init?.()
  } else if (normDriver === "thunderexpert") {
    const addition = parseAddition(storageConfig)
    driver = new ThunderExpertDriver(addition, async (tokens) => {
      try {
        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === storageConfig?.id,
        )
        if (!st) return
        const stAddition =
          typeof st.addition === "string"
            ? JSON.parse(st.addition || "{}")
            : st.addition || {}
        if (tokens.refresh_token)
          stAddition.refresh_token = tokens.refresh_token
        if (tokens.captcha_token)
          stAddition.captcha_token = tokens.captcha_token
        if (tokens.device_id) stAddition.device_id = tokens.device_id
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[thunderexpert] failed to persist token:", e)
      }
    })
    await driver.init?.()
  } else if (normDriver === "thunder" || normDriver === "xunlei") {
    const addition = parseAddition(storageConfig)
    driver = new ThunderDriver(addition, async (tokens) => {
      try {
        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === storageConfig?.id,
        )
        if (!st) return
        const stAddition =
          typeof st.addition === "string"
            ? JSON.parse(st.addition || "{}")
            : st.addition || {}
        if (tokens.refresh_token)
          stAddition.refresh_token = tokens.refresh_token
        if (tokens.captcha_token)
          stAddition.captcha_token = tokens.captcha_token
        if (tokens.device_id) stAddition.device_id = tokens.device_id
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[thunder] failed to persist token:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "189" ||
    normDriver === "189cloud" ||
    normDriver === "cloud189" ||
    normDriver === "ctyun" ||
    normDriver === "189pan"
  ) {
    const addition = parseAddition(storageConfig)
    driver = new Cloud189Driver(addition, async (cookie) => {
      try {
        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === storageConfig?.id,
        )
        if (!st) return
        const stAddition =
          typeof st.addition === "string"
            ? JSON.parse(st.addition || "{}")
            : st.addition || {}
        stAddition.cookie = cookie
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[189Cloud] failed to persist cookie:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "lanzou" ||
    normDriver === "lanzoupan" ||
    normDriver === "ilanzou" ||
    normDriver === "lanzoui" ||
    normDriver === "lanzous"
  ) {
    const addition = parseAddition(storageConfig)
    driver = new LanzouDriver(addition, async (cookie) => {
      try {
        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === storageConfig?.id,
        )
        if (!st) return
        const stAddition =
          typeof st.addition === "string"
            ? JSON.parse(st.addition || "{}")
            : st.addition || {}
        stAddition.cookie = cookie
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[Lanzou] failed to persist cookie:", e)
      }
    })
    await driver.init?.()
  } else {
    throw new Error(
      "failed get driver: unsupported driver '" + driverName + "'",
    )
  }

  driverCache.set(cacheKey, driver)
  return driver
}

export async function listItems(
  virtualPath: string,
): Promise<{ content: FileItem[]; provider: string }> {
  const resolved = await resolvePath(virtualPath)
  let items: FileItem[] = []
  let driverName = "Virtual"

  if (resolved.storage) {
    driverName = resolved.storage.driver
    try {
      const driver = await getDriver(driverName, resolved.storage)
      // Get raw items from driver
      items = await driver.list(virtualPath, resolved.physical!)
      if (resolved.storage.status !== "work") {
        resolved.storage.status = "work"
        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === resolved.storage?.id,
        )
        if (st) {
          st.status = "work"
          await saveDb(db)
        }
      }
    } catch (e: any) {
      try {
        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === resolved.storage?.id,
        )
        if (st) {
          st.status = e.message || String(e)
          await saveDb(db)
        }
      } catch (persistErr) {
        console.warn("Failed to persist storage status:", persistErr)
      }
      throw e
    }
  } else if (!resolved.isVirtual) {
    throw new Error("failed get storage: storage not found")
  }

  // Merge virtual child storage mounts if we are listing a directory that contains mount points
  const db = await getDb()
  const activeStorages = (db.storages || []).filter((s: any) => !s.disabled)
  const cleanListedPath = resolved.cleanPath

  activeStorages.forEach((s: any) => {
    const mount =
      "/" + (s.mount_path || "").split("/").filter(Boolean).join("/")
    if (mount === cleanListedPath || mount === "/") return

    const prefix = cleanListedPath === "/" ? "/" : cleanListedPath + "/"
    if (mount.startsWith(prefix)) {
      const name = mount.slice(prefix.length).split("/").filter(Boolean)[0]
      if (name && !items.some((f) => f.name === name)) {
        items.push({
          name,
          size: 0,
          is_dir: true,
          modified: s.modified || new Date().toISOString(),
          sign: "",
          type: 1,
        })
      }
    }
  })

  // Ensure all items have calculated types
  items.forEach((item) => {
    if (!item.type) {
      item.type = calcFileType(item.name, item.is_dir)
    }
  })

  return { content: items, provider: driverName }
}

export async function getItem(
  virtualPath: string,
): Promise<{ item: FileItem; provider: string; rawUrl: string }> {
  const resolved = await resolvePath(virtualPath)
  if (resolved.isVirtual) {
    const name = resolved.cleanPath.split("/").filter(Boolean).pop() || "root"
    return {
      item: {
        name,
        size: 0,
        is_dir: true,
        modified: new Date().toISOString(),
        sign: "",
        type: 1,
      },
      provider: "Virtual",
      rawUrl: "",
    }
  }

  const driverName = resolved.storage ? resolved.storage.driver : "Local"
  const driver = await getDriver(driverName, resolved.storage)
  const item = await driver.get(virtualPath, resolved.physical!)
  if (!item.type) {
    item.type = calcFileType(item.name, item.is_dir)
  }
  return {
    item,
    provider: driverName,
    rawUrl: `/api/p${virtualPath.startsWith("/") ? "" : "/"}${virtualPath}`,
  }
}

export async function makeDirectory(virtualPath: string): Promise<void> {
  const resolved = await resolvePath(virtualPath)
  if (resolved.isVirtual) {
    throw new Error("failed get storage: storage not found")
  }
  const driver = await getDriver(resolved.storage!.driver, resolved.storage)
  await driver.mkdir(virtualPath, resolved.physical!)
}

export async function renameItem(
  virtualPath: string,
  newName: string,
): Promise<void> {
  const resolved = await resolvePath(virtualPath)
  if (resolved.isVirtual) {
    throw new Error("failed get storage: storage not found")
  }
  const driver = await getDriver(resolved.storage!.driver, resolved.storage)
  await driver.rename(virtualPath, resolved.physical!, newName)
}

export async function removeItems(dir: string, names: string[]): Promise<void> {
  for (const name of names) {
    const itemVirtual = `${dir}/${name}`
    const resolved = await resolvePath(itemVirtual)
    if (resolved.isVirtual) {
      throw new Error("failed get storage: storage not found")
    }
    const driver = await getDriver(resolved.storage!.driver, resolved.storage)
    await driver.remove(itemVirtual, resolved.physical!, [name])
  }
}

export async function moveItems(
  srcDir: string,
  dstDir: string,
  names: string[],
): Promise<void> {
  for (const name of names) {
    const srcVirtual = `${srcDir}/${name}`
    const dstVirtual = `${dstDir}/${name}`
    const srcResolved = await resolvePath(srcVirtual)
    const dstResolved = await resolvePath(dstVirtual)
    if (srcResolved.isVirtual || dstResolved.isVirtual) {
      throw new Error("failed get storage: storage not found")
    }

    const driver = await getDriver(
      srcResolved.storage!.driver,
      srcResolved.storage,
    )
    await driver.move(
      srcDir,
      dstDir,
      [name],
      srcResolved.physical!,
      dstResolved.physical!,
    )
  }
}

export async function copyItems(
  srcDir: string,
  dstDir: string,
  names: string[],
): Promise<void> {
  for (const name of names) {
    const srcVirtual = `${srcDir}/${name}`
    const dstVirtual = `${dstDir}/${name}`
    const srcResolved = await resolvePath(srcVirtual)
    const dstResolved = await resolvePath(dstVirtual)
    if (srcResolved.isVirtual || dstResolved.isVirtual) {
      throw new Error("failed get storage: storage not found")
    }

    const driver = await getDriver(
      srcResolved.storage!.driver,
      srcResolved.storage,
    )
    await driver.copy(
      srcDir,
      dstDir,
      [name],
      srcResolved.physical!,
      dstResolved.physical!,
    )
  }
}

export async function putItem(
  virtualPath: string,
  content: Buffer,
): Promise<void> {
  const resolved = await resolvePath(virtualPath)
  if (resolved.isVirtual) {
    throw new Error("failed get storage: storage not found")
  }
  const driver = await getDriver(resolved.storage!.driver, resolved.storage)
  await driver.put(virtualPath, resolved.physical!, content)
}
