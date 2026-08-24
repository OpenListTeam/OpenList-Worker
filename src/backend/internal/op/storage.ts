import { resolvePath, getDb, saveDb } from "../model/db"
import { FileItem, StorageDriver, calcFileType } from "../driver/base"
import { Onedrive } from "../../drivers/onedrive/driver"
import { OnedriveAPP } from "../../drivers/onedrive_app/driver"
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
import { LanzouDriver } from "../../drivers/lanzou/driver"
import { Cloud189Driver } from "../../drivers/189/driver"
import { WebdavDriver } from "../../drivers/webdav/driver"
import { WoPanDriver, normalizeWoPanAddition } from "../../drivers/wopan/driver"
import { S3Driver, normalizeS3Addition } from "../../drivers/s3/driver"
import {
  WeiyunDriver,
  normalizeWeiyunAddition,
} from "../../drivers/weiyun/driver"
import { PikPakDriver } from "../../drivers/pikpak/driver"
import { SeafileDriver } from "../../drivers/seafile/driver"
import { YandexDriver } from "../../drivers/yandex/driver"
import { TeraboxDriver } from "../../drivers/terabox/driver"
import { MediatrackDriver } from "../../drivers/mediatrack/driver"
import { AliasDriver } from "../../drivers/alias/driver"
import { DropboxDriver } from "../../drivers/dropbox/driver"
import { WpsDriver } from "../../drivers/wps/driver"
import { Yun139Driver } from "../../drivers/139/driver"
import { MegaDriver } from "../../drivers/mega/driver"
import { Pan115ShareDriver } from "../../drivers/115_share/driver"
import { Pan123ShareDriver } from "../../drivers/123_share/driver"
import { AliyundriveShareDriver } from "../../drivers/aliyundrive_share/driver"
import { OnedriveSharelinkDriver } from "../../drivers/onedrive_sharelink/driver"
import { PikPakShareDriver } from "../../drivers/pikpak_share/driver"
import { SMBDriver } from "../../drivers/smb/driver"

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

async function getSFTPDriver(storageConfig: any): Promise<StorageDriver> {
  if (typeof process !== "undefined" && process.release?.name === "node") {
    const { SFTPDriver } = await import("../../drivers/sftp")
    const driver = new SFTPDriver(parseAddition(storageConfig))
    await driver.init?.()
    return driver
  }
  throw new Error(
    "SFTP storage driver requires Node.js runtime (raw TCP sockets not available in Cloudflare Workers)",
  )
}

async function getFTPDriver(storageConfig: any): Promise<StorageDriver> {
  if (typeof process !== "undefined" && process.release?.name === "node") {
    const { FTPDriver } = await import("../../drivers/ftp")
    const driver = new FTPDriver(parseAddition(storageConfig))
    await driver.init?.()
    return driver
  }
  throw new Error(
    "FTP storage driver requires Node.js runtime (raw TCP sockets not available in Cloudflare Workers)",
  )
}

const driverCache = new Map<string, StorageDriver>()
const driverInitCache = new Map<string, Promise<StorageDriver>>()
const cookiePersistenceCache = new Map<string, Promise<void>>()

export interface StorageRequestContext {
  waitUntil?: (promise: Promise<unknown>) => void
}

export async function getOrCreateDriver(
  cache: Map<string, Promise<StorageDriver>>,
  key: string,
  factory: () => Promise<StorageDriver>,
): Promise<StorageDriver> {
  const existing = cache.get(key)
  if (existing) return existing

  const pending = factory()
  cache.set(key, pending)
  try {
    return await pending
  } catch (error) {
    if (cache.get(key) === pending) cache.delete(key)
    throw error
  }
}

function parseAddition(storageConfig?: any): any {
  const additionStr = storageConfig?.addition
  if (!additionStr) return {}
  return typeof additionStr === "string"
    ? JSON.parse(additionStr || "{}")
    : additionStr
}

async function createDriver(
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
  if (normDriver === "sftp") {
    return getSFTPDriver(storageConfig)
  }
  if (normDriver === "ftp") {
    return getFTPDriver(storageConfig)
  }

  if (!storageConfig) {
    throw new Error(
      "failed get driver: storage config not found for driver " + driverName,
    )
  }

  let driver: StorageDriver
  if (normDriver === "onedriveapp") {
    driver = new OnedriveAPP(parseAddition(storageConfig))
    try {
      await driver.init?.()
    } catch (e) {
      console.error("onedrive_app init failed:", e)
      throw e
    }
  } else if (
    normDriver === "onedrive" ||
    normDriver === "onedrivesb" ||
    normDriver === "onedrivebusiness" ||
    normDriver === "onedrivesharepoint" ||
    (normDriver.startsWith("onedrive") && normDriver !== "onedriveapp")
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
    normDriver === "aliyun" ||
    normDriver === "aliyundriveshare2open" ||
    normDriver === "aliyundriveoauth2" ||
    normDriver.includes("aliyun")
  ) {
    // 统一只保留阿里云盘 OAuth2 (AliyundriveOpen)
    driver = new AliyundriveOpen(parseAddition(storageConfig))
    await driver.init?.()
  } else if (
    normDriver === "googledrive" ||
    normDriver === "gdrive" ||
    normDriver === "google" ||
    normDriver.startsWith("google")
  ) {
    driver = new GoogleDrive(parseAddition(storageConfig))
    await driver.init?.()
  } else if (
    normDriver === "quark" ||
    normDriver === "quarkuc" ||
    normDriver === "uc" ||
    normDriver === "quarkcookie"
  ) {
    driver = new QuarkDriver(parseAddition(storageConfig))
    await driver.init?.()
  } else if (
    normDriver === "123pan" ||
    normDriver === "123" ||
    normDriver === "123panshare" ||
    normDriver.startsWith("123")
  ) {
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
    normDriver === "baiduyun" ||
    normDriver === "baiduphoto" ||
    normDriver === "baidushare" ||
    normDriver.startsWith("baidu")
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
    normDriver === "115pan" ||
    normDriver === "115cloud" ||
    normDriver.startsWith("115")
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
  } else if (
    normDriver === "thunderexpert" ||
    normDriver === "thunderbrowserexpert" ||
    normDriver === "thunderxexpert" ||
    (normDriver.includes("thunder") && normDriver.includes("expert")) ||
    (normDriver.includes("xunlei") && normDriver.includes("expert"))
  ) {
    const addition = parseAddition(storageConfig)
    driver = new ThunderExpertDriver(addition, async (tokens) => {
      try {
        if (tokens.device_id) addition.device_id = tokens.device_id
        if (tokens.refresh_token) addition.refresh_token = tokens.refresh_token
        if (tokens.captcha_token) addition.captcha_token = tokens.captcha_token
        storageConfig.addition = JSON.stringify(addition)

        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === storageConfig?.id,
        )
        if (st) {
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
        }
      } catch (e) {
        console.warn("[thunderexpert] failed to persist token:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "thunder" ||
    normDriver === "xunlei" ||
    normDriver === "thunderbrowser" ||
    normDriver === "thunderx" ||
    normDriver.includes("thunder") ||
    normDriver.includes("xunlei")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new ThunderDriver(addition, async (tokens) => {
      try {
        if (tokens.device_id) addition.device_id = tokens.device_id
        if (tokens.refresh_token) addition.refresh_token = tokens.refresh_token
        if (tokens.captcha_token) addition.captcha_token = tokens.captcha_token
        storageConfig.addition = JSON.stringify(addition)

        const db = await getDb()
        const st = (db.storages || []).find(
          (s: any) => s.id === storageConfig?.id,
        )
        if (st) {
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
        }
      } catch (e) {
        console.warn("[thunder] failed to persist token:", e)
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
  } else if (
    normDriver === "189" ||
    normDriver === "189cloud" ||
    normDriver === "cloud189" ||
    normDriver === "ctyun" ||
    normDriver === "189pan" ||
    normDriver === "189cloudpc" ||
    normDriver === "189cloudapp" ||
    normDriver.startsWith("189") ||
    normDriver.includes("cloud189")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new Cloud189Driver(addition)
    await driver.init?.()
  } else if (normDriver === "webdav" || normDriver === "webdavdriver") {
    const addition = parseAddition(storageConfig)
    driver = new WebdavDriver(addition)
    await driver.init?.()
  } else if (
    normDriver === "s3" ||
    normDriver === "doge" ||
    normDriver === "dogecloud" ||
    normDriver === "minio" ||
    normDriver === "ceph" ||
    normDriver === "aws" ||
    normDriver === "r2" ||
    normDriver === "b2" ||
    normDriver === "cos" ||
    normDriver === "oss" ||
    normDriver === "kodo"
  ) {
    const addition = parseAddition(storageConfig)
    driver = new S3Driver(addition, storageConfig.driver || "S3")
    await driver.init?.()
  } else if (
    normDriver === "wopan" ||
    normDriver === "unicom" ||
    normDriver === "unicomcloud" ||
    normDriver === "woyun" ||
    normDriver === "chinaunicom"
  ) {
    const addition = parseAddition(storageConfig)
    driver = new WoPanDriver(addition, async (accessToken, refreshToken) => {
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
        stAddition.access_token = accessToken
        stAddition.refresh_token = refreshToken
        st.addition = JSON.stringify(normalizeWoPanAddition(stAddition))
        await saveDb(db)
      } catch (e) {
        console.warn("[WoPan] failed to persist tokens:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "weiyun" ||
    normDriver === "tencentweiyun" ||
    normDriver === "txweiyun" ||
    normDriver.includes("weiyun")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new WeiyunDriver(addition, async (cookie) => {
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
        stAddition.cookies = cookie
        st.addition = JSON.stringify(normalizeWeiyunAddition(stAddition))
        await saveDb(db)
      } catch (e) {
        console.warn("[WeiYun] failed to persist cookies:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "pikpak" ||
    normDriver === "pikpakshare" ||
    normDriver.includes("pikpak")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new PikPakDriver(addition, async (tokens) => {
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
        stAddition.refresh_token = tokens.refreshToken
        if (tokens.captchaToken) {
          stAddition.captcha_token = tokens.captchaToken
        }
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[PikPak] failed to persist tokens:", e)
      }
    })
    await driver.init?.()
  } else if (normDriver === "seafile" || normDriver.includes("seafile")) {
    const addition = parseAddition(storageConfig)
    driver = new SeafileDriver(addition, async (token) => {
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
        stAddition.token = token
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[Seafile] failed to persist token:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "yandex" ||
    normDriver === "yandexdisk" ||
    normDriver === "yandexdrive" ||
    normDriver.includes("yandex")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new YandexDriver(addition, async (tokens) => {
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
        stAddition.refresh_token = tokens.refreshToken
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[Yandex] failed to persist token:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "terabox" ||
    normDriver === "dubox" ||
    normDriver.includes("terabox")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new TeraboxDriver(addition)
    await driver.init?.()
  } else if (
    normDriver === "mediatrack" ||
    normDriver === "fenmiao" ||
    normDriver.includes("mediatrack")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new MediatrackDriver(addition)
    await driver.init?.()
  } else if (normDriver === "alias" || normDriver.includes("alias")) {
    const addition = parseAddition(storageConfig)
    driver = new AliasDriver(addition)
    await driver.init?.()
  } else if (normDriver === "dropbox" || normDriver.includes("dropbox")) {
    const addition = parseAddition(storageConfig)
    driver = new DropboxDriver(addition, async (tokens) => {
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
        stAddition.access_token = tokens.accessToken
        stAddition.refresh_token = tokens.refreshToken
        st.addition = JSON.stringify(stAddition)
        await saveDb(db)
      } catch (e) {
        console.warn("[Dropbox] failed to persist token:", e)
      }
    })
    await driver.init?.()
  } else if (
    normDriver === "wps" ||
    normDriver.includes("wps") ||
    normDriver.includes("kdocs")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new WpsDriver(addition)
    await driver.init?.()
  } else if (
    normDriver === "139" ||
    normDriver === "139yun" ||
    normDriver === "caiyun" ||
    normDriver === "hecaiyun" ||
    normDriver.includes("139")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new Yun139Driver(addition)
    await driver.init?.()
  } else if (
    normDriver === "mega" ||
    normDriver === "meganz" ||
    normDriver.includes("mega")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new MegaDriver(addition)
    await driver.init?.()
  } else if (
    normDriver === "115share" ||
    normDriver === "115sharelink" ||
    (normDriver.includes("115") && normDriver.includes("share"))
  ) {
    const addition = parseAddition(storageConfig)
    driver = new Pan115ShareDriver(addition)
    await driver.init?.()
  } else if (
    normDriver === "123share" ||
    normDriver === "123panshare" ||
    normDriver === "123link" ||
    (normDriver.includes("123") && normDriver.includes("share"))
  ) {
    const addition = parseAddition(storageConfig)
    driver = new Pan123ShareDriver(addition)
    await driver.init?.()
  } else if (
    normDriver === "aliyundriveshare" ||
    normDriver === "aliyunshare" ||
    normDriver === "alishare" ||
    (normDriver.includes("ali") && normDriver.includes("share"))
  ) {
    const addition = parseAddition(storageConfig)
    driver = new AliyundriveShareDriver(addition)
    await driver.init?.()
  } else if (
    normDriver === "onedrivesharelink" ||
    normDriver === "onedriveshare" ||
    normDriver === "sharepointshare" ||
    (normDriver.includes("onedrive") && normDriver.includes("share"))
  ) {
    const addition = parseAddition(storageConfig)
    driver = new OnedriveSharelinkDriver(addition)
    await driver.init?.()
  } else if (
    normDriver === "pikpakshare" ||
    (normDriver.includes("pikpak") && normDriver.includes("share"))
  ) {
    const addition = parseAddition(storageConfig)
    driver = new PikPakShareDriver(addition)
    await driver.init?.()
  } else if (
    normDriver === "smb" ||
    normDriver === "samba" ||
    normDriver === "cifs" ||
    normDriver.includes("smb")
  ) {
    const addition = parseAddition(storageConfig)
    driver = new SMBDriver(addition)
    await driver.init?.()
  } else {
    throw new Error(
      "failed get driver: unsupported driver '" + driverName + "'",
    )
  }

  return driver
}

export async function getDriver(
  driverName: string,
  storageConfig?: any,
): Promise<StorageDriver> {
  const normDriver = (driverName || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  if (normDriver === "local") {
    return createDriver(driverName, storageConfig)
  }

  if (!storageConfig) {
    throw new Error(
      "failed get driver: storage config not found for driver " + driverName,
    )
  }

  const cacheKey = `${storageConfig.id}_${storageConfig.modified}`
  const cached = driverCache.get(cacheKey)
  if (cached) return cached

  return getOrCreateDriver(driverInitCache, cacheKey, async () => {
    const ready = driverCache.get(cacheKey)
    if (ready) return ready
    const driver = await createDriver(driverName, storageConfig)
    driverCache.set(cacheKey, driver)
    return driver
  })
}

function isCloud189Driver(driverName: string): boolean {
  const normDriver = (driverName || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return (
    normDriver === "189" ||
    normDriver === "189cloud" ||
    normDriver === "cloud189" ||
    normDriver === "ctyun" ||
    normDriver === "189pan"
  )
}

export async function scheduleStoragePersistence(
  waitUntil: StorageRequestContext["waitUntil"],
  persistence: Promise<unknown>,
): Promise<void> {
  if (waitUntil) {
    try {
      waitUntil(persistence)
      return
    } catch {
      // Fall back to awaiting when the execution context is unavailable.
    }
  }
  await persistence
}

async function persistStorageCookie(
  storageConfig: any,
  cookie: string,
): Promise<void> {
  const storageId = String(storageConfig?.id || "")
  if (!storageId) return

  const previous = cookiePersistenceCache.get(storageId)
  const task = (previous || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const db = await getDb()
      const st = (db.storages || []).find(
        (candidate: any) => String(candidate.id) === storageId,
      )
      if (!st) return

      const stAddition =
        typeof st.addition === "string"
          ? JSON.parse(st.addition || "{}")
          : st.addition || {}
      if (
        stAddition.cookies !== undefined ||
        isWeiyunDriver(storageConfig?.driver)
      ) {
        stAddition.cookies = cookie
      } else {
        stAddition.cookie = cookie
      }
      st.addition = JSON.stringify(stAddition)
      if (String(storageConfig?.id) === storageId) {
        storageConfig.addition = st.addition
      }
      await saveDb(db)
    })

  cookiePersistenceCache.set(storageId, task)
  try {
    await task
  } finally {
    if (cookiePersistenceCache.get(storageId) === task) {
      cookiePersistenceCache.delete(storageId)
    }
  }
}

function isWeiyunDriver(driverName: string): boolean {
  const normDriver = (driverName || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return (
    normDriver === "weiyun" ||
    normDriver === "tencentweiyun" ||
    normDriver === "txweiyun" ||
    normDriver.includes("weiyun")
  )
}

export async function flushPendingDriverState(
  driverName: string,
  storageConfig: any,
  driver: StorageDriver,
  requestContext?: StorageRequestContext,
): Promise<void> {
  if (!isCloud189Driver(driverName) && !isWeiyunDriver(driverName)) return

  const consumePendingCookie = (
    driver as StorageDriver & {
      consumePendingCookie?: () => string | null
    }
  ).consumePendingCookie
  const cookie = consumePendingCookie?.call(driver)
  if (!cookie) return

  const persistence = persistStorageCookie(storageConfig, cookie).catch((e) => {
    console.warn(`[${driverName}] failed to persist cookie:`, e)
  })
  await scheduleStoragePersistence(requestContext?.waitUntil, persistence)
}

export async function listItems(
  virtualPath: string,
  requestContext?: StorageRequestContext,
): Promise<{ content: FileItem[]; provider: string; storage?: any }> {
  const resolved = await resolvePath(virtualPath)
  let items: FileItem[] = []
  let driverName = "Virtual"

  if (resolved.storage) {
    driverName = resolved.storage.driver
    try {
      const driver = await getDriver(driverName, resolved.storage)
      // Get raw items from driver
      try {
        items = await driver.list(virtualPath, resolved.physical!)
      } finally {
        await flushPendingDriverState(
          driverName,
          resolved.storage,
          driver,
          requestContext,
        )
      }
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

  return { content: items, provider: driverName, storage: resolved.storage }
}

export async function getItem(
  virtualPath: string,
  requestContext?: StorageRequestContext,
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

  if (resolved.storage && resolved.relative === "/") {
    const name = resolved.cleanPath.split("/").filter(Boolean).pop() || "root"
    const addition = parseAddition(resolved.storage)
    return {
      item: {
        name,
        size: 0,
        is_dir: true,
        modified: resolved.storage.modified || new Date().toISOString(),
        sign: String(addition.root_folder_id || ""),
        type: 1,
        raw_url: "",
      },
      provider: resolved.storage.driver,
      rawUrl: `/api/p${virtualPath.startsWith("/") ? "" : "/"}${virtualPath}`,
    }
  }

  const driverName = resolved.storage ? resolved.storage.driver : "Local"
  const driver = await getDriver(driverName, resolved.storage)
  let item: FileItem
  try {
    item = await driver.get(virtualPath, resolved.physical!)
  } finally {
    await flushPendingDriverState(
      driverName,
      resolved.storage,
      driver,
      requestContext,
    )
  }
  if (!item.type) {
    item.type = calcFileType(item.name, item.is_dir)
  }
  return {
    item,
    provider: driverName,
    rawUrl: `/api/p${virtualPath.startsWith("/") ? "" : "/"}${virtualPath}`,
  }
}

export async function makeDirectory(
  virtualPath: string,
  requestContext?: StorageRequestContext,
): Promise<void> {
  const resolved = await resolvePath(virtualPath)
  if (resolved.isVirtual) {
    throw new Error("failed get storage: storage not found")
  }
  const driver = await getDriver(resolved.storage!.driver, resolved.storage)
  try {
    await driver.mkdir(virtualPath, resolved.physical!)
  } finally {
    await flushPendingDriverState(
      resolved.storage!.driver,
      resolved.storage,
      driver,
      requestContext,
    )
  }
}

export async function renameItem(
  virtualPath: string,
  newName: string,
  requestContext?: StorageRequestContext,
): Promise<void> {
  const resolved = await resolvePath(virtualPath)
  if (resolved.isVirtual) {
    throw new Error("failed get storage: storage not found")
  }
  const driver = await getDriver(resolved.storage!.driver, resolved.storage)
  try {
    await driver.rename(virtualPath, resolved.physical!, newName)
  } finally {
    await flushPendingDriverState(
      resolved.storage!.driver,
      resolved.storage,
      driver,
      requestContext,
    )
  }
}

export async function removeItems(
  dir: string,
  names: string[],
  requestContext?: StorageRequestContext,
): Promise<void> {
  for (const name of names) {
    const itemVirtual = `${dir}/${name}`
    const resolved = await resolvePath(itemVirtual)
    if (resolved.isVirtual) {
      throw new Error("failed get storage: storage not found")
    }
    const driver = await getDriver(resolved.storage!.driver, resolved.storage)
    try {
      await driver.remove(itemVirtual, resolved.physical!, [name])
    } finally {
      await flushPendingDriverState(
        resolved.storage!.driver,
        resolved.storage,
        driver,
        requestContext,
      )
    }
  }
}

export async function moveItems(
  srcDir: string,
  dstDir: string,
  names: string[],
  requestContext?: StorageRequestContext,
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
    try {
      await driver.move(
        srcDir,
        dstDir,
        [name],
        srcResolved.physical!,
        dstResolved.physical!,
      )
    } finally {
      await flushPendingDriverState(
        srcResolved.storage!.driver,
        srcResolved.storage,
        driver,
        requestContext,
      )
    }
  }
}

export async function copyItems(
  srcDir: string,
  dstDir: string,
  names: string[],
  requestContext?: StorageRequestContext,
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
    try {
      await driver.copy(
        srcDir,
        dstDir,
        [name],
        srcResolved.physical!,
        dstResolved.physical!,
      )
    } finally {
      await flushPendingDriverState(
        srcResolved.storage!.driver,
        srcResolved.storage,
        driver,
        requestContext,
      )
    }
  }
}

export async function putItem(
  virtualPath: string,
  content: Buffer,
  requestContext?: StorageRequestContext,
): Promise<void> {
  const resolved = await resolvePath(virtualPath)
  if (resolved.isVirtual) {
    throw new Error("failed get storage: storage not found")
  }
  const driver = await getDriver(resolved.storage!.driver, resolved.storage)
  try {
    await driver.put(virtualPath, resolved.physical!, content)
  } finally {
    await flushPendingDriverState(
      resolved.storage!.driver,
      resolved.storage,
      driver,
      requestContext,
    )
  }
}
