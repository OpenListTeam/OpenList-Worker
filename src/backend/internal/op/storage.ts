import { resolvePath, getDb } from "../model/db"
import { FileItem, StorageDriver, calcFileType } from "../driver/base"
import { LocalDriver } from "../../drivers/local"
import { S3Driver } from "../../drivers/s3"
import { Onedrive } from "../../drivers/onedrive/driver"
import { AliyundriveOpen } from "../../drivers/aliyundrive_open/driver"
import { GoogleDrive } from "../../drivers/google_drive/driver"
import { QuarkDriver } from "../../drivers/quark/driver"

const localDriver = new LocalDriver()
const s3Driver = new S3Driver()

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
  const normDriver = (driverName || "").toLowerCase().replace(/_/g, "")
  if (normDriver === "local") {
    return localDriver
  }

  if (!storageConfig) {
    return s3Driver
  }

  const cacheKey = `${storageConfig.id}_${storageConfig.modified}`

  if (driverCache.has(cacheKey)) {
    return driverCache.get(cacheKey)!
  }

  let driver: StorageDriver
  console.log("getDriver: driverName=", driverName)

  if (normDriver === "onedrive") {
    driver = new Onedrive(parseAddition(storageConfig))
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
  } else {
    driver = s3Driver
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
    const driver = await getDriver(driverName, resolved.storage)
    // Get raw items from driver
    items = await driver.list(virtualPath, resolved.physical!)
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
    rawUrl: `/api/raw${virtualPath.startsWith("/") ? "" : "/"}${virtualPath}`,
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
