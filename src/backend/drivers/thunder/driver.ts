import {
  calcFileType,
  FileItem,
  StorageDriver,
} from "../../internal/driver/base"
import { sortFileItems } from "../../internal/driver/sort"
import {
  ThunderAddition,
  ThunderExpertAddition,
  ThunderFile,
  ThunderFileListResp,
  ThunderTokenResp,
  ThunderUploadTaskResp,
} from "./types"
import {
  calcGcid,
  FILE,
  FILE_API_URL,
  FOLDER,
  md5,
  ThunderClient,
  UPLOAD_TYPE_RESUMABLE,
} from "./util"

function thunderFileToFileItem(
  f: ThunderFile,
  downloadUserAgent: string,
  useVideoUrl?: boolean,
): FileItem {
  const isDir = f.kind === FOLDER
  let rawUrl = f.web_content_link || ""

  if (useVideoUrl && f.medias && f.medias.length > 0) {
    for (const m of f.medias) {
      if (m.link?.url) {
        rawUrl = m.link.url
        break
      }
    }
  }

  return {
    name: f.name,
    size: parseInt(f.size || "0", 10),
    is_dir: isDir,
    modified: f.modified_time || f.created_time || new Date().toISOString(),
    sign: "",
    type: calcFileType(f.name, isDir),
    thumb: f.thumbnail_link || f.icon_link || "",
    raw_url: rawUrl,
    raw_url_headers: {
      "User-Agent": downloadUserAgent,
    },
  }
}

export function generateThunderDeviceId(addition?: any): string {
  if (addition?.device_id && addition.device_id.trim().length === 32) {
    return addition.device_id.trim()
  }
  const seed = `${addition?.username || ""}${addition?.password || ""}`
  if (seed.trim()) {
    return md5(seed)
  }
  return md5(Math.random().toString(36) + Date.now().toString(36))
}

export class ThunderDriver implements StorageDriver {
  protected client: ThunderClient
  protected addition: ThunderAddition | ThunderExpertAddition
  protected identity: string = ""
  protected onPersistCallback?: (tokens: any) => Promise<void> | void

  constructor(
    addition: ThunderAddition,
    onPersistCallback?: (tokens: any) => Promise<void> | void,
  ) {
    this.addition = addition
    this.onPersistCallback = onPersistCallback

    const deviceId = generateThunderDeviceId(addition)
    addition.device_id = deviceId

    this.client = new ThunderClient({
      deviceId,
      clientId: "Xp6vsxz_7IYVw2BB",
      clientSecret: "Xp6vsy4tN9toTVdMSpomVdXpRmES",
      clientVersion: "8.31.0.9726",
      packageName: "com.xunlei.downloadprovider",
      userAgent:
        "ANDROID-com.xunlei.downloadprovider/8.31.0.9726 netWorkType/5G appid/40 deviceName/Xiaomi_M2004j7ac deviceModel/M2004J7AC OSVersion/12 protocolVersion/301 platformVersion/10 sdkVersion/512000 Oauth2Client/0.9 (Linux 4_14_186-perf-gddfs8vbb238b) (JAVA 0)",
      downloadUserAgent:
        "Dalvik/2.1.0 (Linux; U; Android 12; M2004J7AC Build/SP1A.210812.016)",
      algorithms: [
        "9uJNVj/wLmdwKrJaVj/omlQ",
        "Oz64Lp0GigmChHMf/6TNfxx7O9PyopcczMsnf",
        "Eb+L7Ce+Ej48u",
        "jKY0",
        "ASr0zCl6v8W4aidjPK5KHd1Lq3t+vBFf41dqv5+fnOd",
        "wQlozdg6r1qxh0eRmt3QgNXOvSZO6q/GXK",
        "gmirk+ciAvIgA/cxUUCema47jr/YToixTT+Q6O",
        "5IiCoM9B1/788ntB",
        "P07JH0h6qoM6TSUAK2aL9T5s2QBVeY9JWvalf",
        "+oK0AN",
      ],
      space: addition.space || "",
      captchaToken: addition.captcha_token || "",
      creditKey: addition.credit_key || "",
      onPersistToken: async (token: ThunderTokenResp) => {
        if (this.onPersistCallback) {
          await this.onPersistCallback({
            refresh_token: token.refresh_token,
            captcha_token: this.client.captchaToken,
            device_id: deviceId,
          })
        }
      },
      onPersistCaptchaToken: async (cToken: string) => {
        if (this.onPersistCallback) {
          await this.onPersistCallback({
            captcha_token: cToken,
          })
        }
      },
    })
  }

  protected get downloadUserAgent(): string {
    return (
      (this.addition as ThunderExpertAddition).download_user_agent ||
      "Dalvik/2.1.0 (Linux; U; Android 12; M2004J7AC Build/SP1A.210812.016)"
    )
  }

  protected get useVideoUrl(): boolean {
    return !!(this.addition as ThunderExpertAddition).use_video_url
  }

  async init(): Promise<void> {
    const username = this.addition.username || ""
    const password = this.addition.password || ""
    const identity = md5(`${username}${password}`)

    if (this.identity !== identity || !(await this.client.isLogin())) {
      this.identity = identity
      await this.client.login(username, password)
    }
  }

  protected resolveFolderId(physicalPath: string): string {
    if (!physicalPath || physicalPath === "/" || physicalPath === "0") {
      return this.addition.root_folder_id || ""
    }
    const parts = physicalPath.split("/").filter(Boolean)
    return parts[parts.length - 1] || this.addition.root_folder_id || ""
  }

  async list(_virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const folderId = this.resolveFolderId(physicalPath)
    const items: FileItem[] = []
    let pageToken = ""

    while (true) {
      const url = new URL(FILE_API_URL)
      url.searchParams.set("space", this.addition.space || "")
      url.searchParams.set("__type", "drive")
      url.searchParams.set("refresh", "true")
      url.searchParams.set("__sync", "true")
      url.searchParams.set("parent_id", folderId)
      url.searchParams.set("page_token", pageToken)
      url.searchParams.set("with_audit", "true")
      url.searchParams.set("limit", "100")
      url.searchParams.set(
        "filters",
        JSON.stringify({
          phase: { eq: "PHASE_TYPE_COMPLETE" },
          trashed: { eq: false },
        }),
      )

      const res = await this.client.authRequest<ThunderFileListResp>(
        url.toString(),
        { method: "GET" },
      )

      if (res.files && res.files.length > 0) {
        for (const f of res.files) {
          items.push(
            thunderFileToFileItem(f, this.downloadUserAgent, this.useVideoUrl),
          )
        }
      }

      if (!res.next_page_token) {
        break
      }
      pageToken = res.next_page_token
    }

    return sortFileItems(
      items,
      this.addition.order_by,
      this.addition.order_direction,
    )
  }

  async get(_virtualPath: string, physicalPath: string): Promise<FileItem> {
    const fileId = this.resolveFolderId(physicalPath)
    const url = new URL(`${FILE_API_URL}/${fileId}`)
    url.searchParams.set("space", this.addition.space || "")

    const res = await this.client.authRequest<ThunderFile>(url.toString(), {
      method: "GET",
    })
    return thunderFileToFileItem(res, this.downloadUserAgent, this.useVideoUrl)
  }

  async mkdir(_virtualPath: string, physicalPath: string): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const dirName = parts.pop() || "new_folder"
    const parentPath = "/" + parts.join("/")
    const parentId = this.resolveFolderId(parentPath)

    await this.client.authRequest(FILE_API_URL, {
      method: "POST",
      body: {
        kind: FOLDER,
        name: dirName,
        parent_id: parentId,
        space: this.addition.space || "",
      },
    })
  }

  async rename(
    _virtualPath: string,
    physicalPath: string,
    newName: string,
  ): Promise<void> {
    const fileId = this.resolveFolderId(physicalPath)
    await this.client.authRequest(`${FILE_API_URL}/${fileId}`, {
      method: "PATCH",
      body: {
        name: newName,
        space: this.addition.space || "",
      },
    })
  }

  async remove(
    _virtualPath: string,
    physicalPath: string,
    _names: string[],
  ): Promise<void> {
    const fileId = this.resolveFolderId(physicalPath)
    const url = new URL(`${FILE_API_URL}/${fileId}/trash`)
    url.searchParams.set("space", this.addition.space || "")

    await this.client.authRequest(url.toString(), {
      method: "PATCH",
      body: {},
    })
  }

  async move(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhys: string,
    _dstPhys: string,
  ): Promise<void> {
    const srcFileId = this.resolveFolderId(srcPhys)
    const dstDirId = this.resolveFolderId(dstDir)

    await this.client.authRequest(`${FILE_API_URL}:batchMove`, {
      method: "POST",
      body: {
        to: { parent_id: dstDirId },
        ids: [srcFileId],
        space: this.addition.space || "",
      },
    })
  }

  async copy(
    _srcDir: string,
    dstDir: string,
    _names: string[],
    srcPhys: string,
    _dstPhys: string,
  ): Promise<void> {
    const srcFileId = this.resolveFolderId(srcPhys)
    const dstDirId = this.resolveFolderId(dstDir)

    await this.client.authRequest(`${FILE_API_URL}:batchCopy`, {
      method: "POST",
      body: {
        to: { parent_id: dstDirId },
        ids: [srcFileId],
        space: this.addition.space || "",
      },
    })
  }

  async put(
    _virtualPath: string,
    physicalPath: string,
    content: Buffer,
  ): Promise<void> {
    const parts = physicalPath.split("/").filter(Boolean)
    const fileName = parts.pop() || "file"
    const parentPath = "/" + parts.join("/")
    const parentId = this.resolveFolderId(parentPath)
    const gcid = calcGcid(content)

    const resp = await this.client.authRequest<ThunderUploadTaskResp>(
      FILE_API_URL,
      {
        method: "POST",
        body: {
          kind: FILE,
          parent_id: parentId,
          name: fileName,
          size: content.length.toString(),
          hash: gcid,
          upload_type: UPLOAD_TYPE_RESUMABLE,
          space: this.addition.space || "",
        },
      },
    )

    if (resp.upload_type === UPLOAD_TYPE_RESUMABLE && resp.resumable?.params) {
      const params = resp.resumable.params
      let endpoint = params.endpoint
      if (endpoint.startsWith(params.bucket + ".")) {
        endpoint = endpoint.slice(params.bucket.length + 1)
      }
      if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
        endpoint = `https://${endpoint}`
      }

      const uploadUrl = `${endpoint.replace(/\/$/, "")}/${params.bucket}/${params.key}`
      const headers: Record<string, string> = {
        "x-amz-security-token": params.security_token,
      }

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: content as any,
      })

      if (!uploadRes.ok) {
        throw new Error(
          `S3 Upload failed: ${uploadRes.status} ${uploadRes.statusText}`,
        )
      }
    }
  }
}

export class ThunderExpertDriver extends ThunderDriver {
  constructor(
    addition: ThunderExpertAddition,
    onPersistCallback?: (tokens: any) => Promise<void> | void,
  ) {
    super(addition, onPersistCallback)

    const deviceId = generateThunderDeviceId(addition)
    addition.device_id = deviceId

    const algorithms =
      addition.sign_type === "captcha_sign"
        ? undefined
        : (addition.algorithms || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)

    this.client = new ThunderClient({
      deviceId,
      clientId: addition.client_id || "Xp6vsxz_7IYVw2BB",
      clientSecret: addition.client_secret || "Xp6vsy4tN9toTVdMSpomVdXpRmES",
      clientVersion: addition.client_version || "8.31.0.9726",
      packageName: addition.package_name || "com.xunlei.downloadprovider",
      userAgent:
        addition.user_agent ||
        "ANDROID-com.xunlei.downloadprovider/8.31.0.9726 netWorkType/5G appid/40 deviceName/Xiaomi_M2004j7ac deviceModel/M2004J7AC OSVersion/12 protocolVersion/301 platformVersion/10 sdkVersion/512000 Oauth2Client/0.9 (Linux 4_14_186-perf-gddfs8vbb238b) (JAVA 0)",
      downloadUserAgent:
        addition.download_user_agent ||
        "Dalvik/2.1.0 (Linux; U; Android 12; M2004J7AC Build/SP1A.210812.016)",
      algorithms: algorithms && algorithms.length > 0 ? algorithms : undefined,
      timestamp: addition.timestamp,
      captchaSign: addition.captcha_sign,
      useVideoUrl: addition.use_video_url,
      space: addition.space || "",
      captchaToken: addition.captcha_token || "",
      creditKey: addition.credit_key || "",
      onPersistToken: async (token: ThunderTokenResp) => {
        if (this.onPersistCallback) {
          await this.onPersistCallback({
            refresh_token: token.refresh_token,
            captcha_token: this.client.captchaToken,
            device_id: deviceId,
          })
        }
      },
      onPersistCaptchaToken: async (cToken: string) => {
        if (this.onPersistCallback) {
          await this.onPersistCallback({
            captcha_token: cToken,
          })
        }
      },
    })
  }

  async init(): Promise<void> {
    const expAddition = this.addition as ThunderExpertAddition
    let identity = ""
    if (expAddition.login_type === "refresh_token") {
      identity = md5(expAddition.refresh_token || "")
    } else {
      identity = md5(
        `${expAddition.username || ""}${expAddition.password || ""}`,
      )
    }

    if (this.identity !== identity || !(await this.client.isLogin())) {
      this.identity = identity

      if (
        expAddition.login_type === "refresh_token" &&
        expAddition.refresh_token
      ) {
        await this.client.refreshToken(expAddition.refresh_token)
      } else if (expAddition.username && expAddition.password) {
        await this.client.login(expAddition.username, expAddition.password)
      }
    }
  }
}
