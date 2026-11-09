import CryptoJS from "crypto-js"
import { Yun139Addition } from "./types"

const KEY_HEX_1 = "73634235495062495331515373756c734e7253306c673d3d"
const KEY_HEX_2 = "7150714477323633586746674c337538"
const MAIL_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnsOHTFtwW5rq/8gGhPlM5Z3RPdeN/d+FYIHb5JmcfBOCozXuT8c+0anvxtkjzghixwNlnmBuhN8OYfS789YuH/qReQbHC7OdlisLildNWPHRNUYcPa0W3lXSG3+81CXK7FDXPvXo5ubw2GqVbIsccMarI1dyfXdi4ITiCXvmM9wYBdUs9yXtoorhlpyYUI2GV8HNsQjWK9P5QZHT3ox5Qy+mjRmvv6RUFJLPOMkOS/pGZ0DwC1ypFZBxstW0/ftVupdOmGWvW7J2/e3dq3A/UvIkC4YUY/diL1wighJx1G9MiRROISjNMvNyUDSTqPJy516+l3sgHEbc067QIJx2NQIDAQAB"
const MAIL_PASSWORD_URL = "https://mail.10086.cn/Login/Login.ashx"
const MAIL_SMS_URL = "https://mail.10086.cn/s"
const SSO_LOGIN_URL = "https://user-njs.yun.139.com/user/thirdlogin"

export interface Yun139LoginResult {
  authorization: string
  account: string
  userDomainId: string
  mailCookies: string
  smsCode: string
}

/** 邮箱登录触发了短信风控，需要用户填写 sms_code 后重新保存。 */
export class Yun139SmsRequiredError extends Error {
  constructor(
    message: string,
    public readonly mailCookies: string,
  ) {
    super(message)
    this.name = "Yun139SmsRequiredError"
  }
}

type MailLoginResponse = {
  code: string
  summary: string
  loginSuccessUrl: string
}

export function sha1Hex(value: string): string {
  return CryptoJS.SHA1(value).toString(CryptoJS.enc.Hex)
}

export function sortedJsonStringify(value: any): string {
  if (value === null || value === undefined) return "null"
  if (typeof value === "string") {
    try {
      return sortedJsonStringify(JSON.parse(value))
    } catch {
      return JSON.stringify(value)
    }
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => sortedJsonStringify(item)).join(",")}]`
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort()
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${sortedJsonStringify(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex string")
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    const value = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    if (Number.isNaN(value)) throw new Error("invalid hex string")
    bytes[i] = value
  }
  return bytes
}

function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  return CryptoJS.enc.Hex.parse(bytesToHex(bytes))
}

function bytesToBase64(bytes: Uint8Array): string {
  return CryptoJS.enc.Base64.stringify(bytesToWordArray(bytes))
}

function base64ToBytes(value: string): Uint8Array {
  const hex = CryptoJS.enc.Base64.parse(value).toString(CryptoJS.enc.Hex)
  return hexToBytes(hex)
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

export function aesCbcEncrypt(
  plaintext: string,
  keyHex: string,
): { iv: Uint8Array; ciphertext: Uint8Array } {
  const key = CryptoJS.enc.Hex.parse(keyHex)
  const iv = randomBytes(16)
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(plaintext),
    key,
    {
      iv: bytesToWordArray(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  )
  return {
    iv,
    ciphertext: hexToBytes(encrypted.ciphertext.toString(CryptoJS.enc.Hex)),
  }
}

export function aesCbcDecrypt(
  ciphertext: Uint8Array,
  keyHex: string,
  iv: Uint8Array,
): string {
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: bytesToWordArray(ciphertext) } as any,
    CryptoJS.enc.Hex.parse(keyHex),
    {
      iv: bytesToWordArray(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  )
  return decrypted.toString(CryptoJS.enc.Utf8)
}

export function aesEcbDecrypt(ciphertext: Uint8Array, keyHex: string): string {
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: bytesToWordArray(ciphertext) } as any,
    CryptoJS.enc.Hex.parse(keyHex),
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    },
  )
  return decrypted.toString(CryptoJS.enc.Utf8)
}

export function aesEcbEncrypt(plaintext: string, keyHex: string): Uint8Array {
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(plaintext),
    CryptoJS.enc.Hex.parse(keyHex),
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    },
  )
  return hexToBytes(encrypted.ciphertext.toString(CryptoJS.enc.Hex))
}

type DerElement = { tag: number; start: number; end: number }

function readDer(bytes: Uint8Array, offset: number): DerElement {
  if (offset + 2 > bytes.length) throw new Error("invalid DER")
  const tag = bytes[offset]
  let length = bytes[offset + 1]
  offset += 2
  if (length & 0x80) {
    const count = length & 0x7f
    if (count === 0 || offset + count > bytes.length) {
      throw new Error("invalid DER length")
    }
    length = 0
    for (let i = 0; i < count; i++) {
      length = (length << 8) | bytes[offset + i]
    }
    offset += count
  }
  if (offset + length > bytes.length) throw new Error("invalid DER payload")
  return { tag, start: offset, end: offset + length }
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = bytesToHex(bytes)
  hex = hex.replace(/^0+/, "")
  return hex ? BigInt(`0x${hex}`) : 0n
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  let b = base % modulus
  let e = exponent
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus
    b = (b * b) % modulus
    e >>= 1n
  }
  return result
}

export function parseRsaPublicKey(der: Uint8Array): {
  modulus: bigint
  exponent: bigint
} {
  const outer = readDer(der, 0)
  if (outer.tag !== 0x30) throw new Error("invalid RSA public key")
  const algorithm = readDer(der, outer.start)
  const bitString = readDer(der, algorithm.end)
  if (bitString.tag !== 0x03)
    throw new Error("invalid RSA public key bit string")
  const inner = readDer(der, bitString.start + 1) // skip unused-bits byte
  const modulusElement = readDer(der, inner.start)
  const exponentElement = readDer(der, modulusElement.end)
  if (modulusElement.tag !== 0x02 || exponentElement.tag !== 0x02) {
    throw new Error("invalid RSA public key integers")
  }
  return {
    modulus: bytesToBigInt(der.slice(modulusElement.start, modulusElement.end)),
    exponent: bytesToBigInt(
      der.slice(exponentElement.start, exponentElement.end),
    ),
  }
}

/** RSAES-PKCS1-v1_5，对应 Go 的 rsa.EncryptPKCS1v15。 */
export function rsaEncryptPKCS1v15(
  message: Uint8Array,
  publicKeyDerBase64: string,
): Uint8Array {
  const der = base64ToBytes(publicKeyDerBase64)
  const { modulus, exponent } = parseRsaPublicKey(der)
  const keyLength = Math.ceil(modulus.toString(16).length / 2)
  if (message.length > keyLength - 11) {
    throw new Error("RSA message too long")
  }

  const padding = randomBytes(keyLength - message.length - 3)
  for (let i = 0; i < padding.length; i++) {
    while (padding[i] === 0) padding[i] = randomBytes(1)[0]
  }

  const encoded = new Uint8Array(keyLength)
  encoded[0] = 0
  encoded[1] = 2
  encoded.set(padding, 2)
  encoded[2 + padding.length] = 0
  encoded.set(message, 3 + padding.length)

  const ciphertext = modPow(bytesToBigInt(encoded), exponent, modulus).toString(
    16,
  )
  return hexToBytes(ciphertext.padStart(keyLength * 2, "0"))
}

export function parseCookies(
  raw: string,
): Array<{ name: string; value: string }> {
  const cookies: Array<{ name: string; value: string }> = []
  for (const part of (raw || "").split(";")) {
    const item = part.trim()
    if (!item) continue
    const index = item.indexOf("=")
    if (index <= 0) continue
    const name = item.slice(0, index).trim()
    const value = item.slice(index + 1).trim()
    if (!name) continue
    const existing = cookies.find((cookie) => cookie.name === name)
    if (existing) existing.value = value
    else cookies.push({ name, value })
  }
  return cookies
}

export function cookiesToString(
  cookies: Array<{ name: string; value: string }>,
): string {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join(";")
}

export function setCookie(raw: string, name: string, value: string): string {
  const cookies = parseCookies(raw)
  const existing = cookies.find((cookie) => cookie.name === name)
  if (existing) existing.value = value
  else cookies.push({ name, value })
  return cookiesToString(cookies)
}

export function getCookie(raw: string, name: string): string {
  return parseCookies(raw).find((cookie) => cookie.name === name)?.value || ""
}

export function hasCookiePair(raw: string): boolean {
  return parseCookies(raw).some(
    (cookie) => cookie.name !== "" && cookie.value !== "",
  )
}

export function extractFastLoginCookies(mailCookies: string): {
  sid: string
  rmkey: string
} {
  const cookies = parseCookies(mailCookies)
  return {
    sid:
      cookies.find((cookie) => cookie.name === "Os_SSo_Sid")?.value ||
      cookies.find((cookie) => cookie.name === "sid")?.value ||
      "",
    rmkey: cookies.find((cookie) => cookie.name === "RMKEY")?.value || "",
  }
}

function getSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & {
    getAll?: (name: string) => string[]
    getSetCookie?: () => string[]
  }
  // Cloudflare Workers exposes Set-Cookie through the non-standard getAll().
  if (typeof headers.getAll === "function") {
    try {
      return headers.getAll("Set-Cookie")
    } catch {
      // fall through to the standard accessors
    }
  }
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie()
  }
  const raw = response.headers.get("set-cookie")
  if (!raw) return []
  // Fallback for runtimes without getSetCookie: the cookies used here do not
  // contain commas in their values, so split before the next `name=`.
  return raw.split(/,(?=\s*[^;,=\s]+=)/)
}

export function mergeResponseCookies(
  mailCookies: string,
  response: Response,
): string {
  let merged = mailCookies
  for (const header of getSetCookieHeaders(response)) {
    const pair = header.split(";")[0].trim()
    const index = pair.indexOf("=")
    if (index <= 0) continue
    const name = pair.slice(0, index).trim()
    const value = pair.slice(index + 1).trim()
    if (!name) continue
    merged = setCookie(merged, name, value)
  }
  return merged
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function mailXmlField(name: string, value: string): string {
  return `<string name="${escapeXml(name)}">${escapeXml(value)}</string>`
}

function parseMailLoginResponse(text: string): MailLoginResponse {
  try {
    const json = JSON.parse(text)
    const response = {
      code: String(json?.code || ""),
      summary: String(json?.summary || ""),
      loginSuccessUrl: String(json?.var?.loginSuccessUrl || ""),
    }
    if (response.code || response.summary || response.loginSuccessUrl) {
      return response
    }
  } catch {
    // Fall back to the regex extraction used by the Go driver.
  }
  const pick = (name: string): string =>
    new RegExp(`['"]?${name}['"]?\\s*:\\s*['"]([^'"]+)`).exec(text)?.[1] || ""
  return {
    code: pick("code"),
    summary: pick("summary"),
    loginSuccessUrl: pick("loginSuccessUrl"),
  }
}

function smsSceneForRisk(riskCode: string): number | null {
  switch (riskCode) {
    case "PML401010062":
      return 2
    case "MW0016":
      return 4
    case "S025":
    case "S035":
      return 1
    default:
      return null
  }
}

function mailRiskCode(location: string): string {
  try {
    return new URL(location, MAIL_PASSWORD_URL).searchParams.get("ec") || ""
  } catch {
    return ""
  }
}

function mailHeaders(cookie: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/xml; charset=utf-8",
    "Accept-Encoding": "gzip",
    "User-Agent": "okhttp/4.12.0",
  }
  if (cookie) headers.Cookie = cookie
  return headers
}

function base64Of(value: string): string {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(value))
}

async function sendSmsCode(
  username: string,
  riskCode: string,
  mailCookies: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const scene = smsSceneForRisk(riskCode)
  if (scene === null) {
    throw new Error(
      `139 Mail risk control does not support SMS verification: ${riskCode}`,
    )
  }
  const loginName = bytesToBase64(
    rsaEncryptPKCS1v15(new TextEncoder().encode(username), MAIL_PUBLIC_KEY),
  )
  const body = [
    "<object>",
    mailXmlField("loginName", loginName),
    mailXmlField("fv", "4"),
    mailXmlField("clientId", "1003"),
    mailXmlField("eMode", "1"),
    mailXmlField("loginFailureUrl", ""),
    mailXmlField("loginSuccessUrl", ""),
    mailXmlField("verifyCode", ""),
    mailXmlField("version", "1.0"),
    mailXmlField("scene", String(scene)),
    "</object>",
  ].join("")
  const url = `${MAIL_SMS_URL}?func=${encodeURIComponent("login:sendSmsCodeByScene")}&cguid=${Date.now()}`
  const response = await fetchImpl(url, {
    method: "POST",
    headers: mailHeaders(mailCookies),
    body,
  })
  const merged = mergeResponseCookies(mailCookies, response)
  const result = parseMailLoginResponse(await response.text())
  if (result.code === "S_OK") return merged
  switch (result.code) {
    case "PML401010021":
    case "PML401010022":
      throw new Error(
        `139 Mail requires picture verification before SMS can be sent: ${result.code}`,
      )
    case "PML404010001":
      throw new Error(
        "139 Mail SMS verification code was requested too frequently",
      )
    case "PML401010002":
      throw new Error("139 Mail rejected the SMS verification parameters")
    default:
      throw new Error(
        `send 139 Mail SMS verification code failed: code=${result.code} summary=${result.summary}`,
      )
  }
}

async function verifySmsCode(
  username: string,
  riskCode: string,
  smsCode: string,
  mailCookies: string,
  fetchImpl: typeof fetch,
): Promise<{ sid: string; mailCookies: string }> {
  if (smsSceneForRisk(riskCode) === null) {
    throw new Error(
      `139 Mail risk control does not support SMS verification: ${riskCode}`,
    )
  }
  const loginName = bytesToBase64(
    rsaEncryptPKCS1v15(new TextEncoder().encode(username), MAIL_PUBLIC_KEY),
  )
  const fields = [
    "<object>",
    mailXmlField("clientId", "1003"),
    mailXmlField("version", "4"),
    mailXmlField("loginType", "0"),
    mailXmlField("authType", "2"),
    mailXmlField("loginName", loginName),
    mailXmlField("eMode", "1"),
    mailXmlField("loginPassword", sha1Hex(`fetion.com.cn:${smsCode}`)),
    mailXmlField("createAutoLoginSecretKey", "1"),
    mailXmlField("verifyCode", ""),
    mailXmlField("verifyAgentId", ""),
    mailXmlField("reqFrom", "3"),
    mailXmlField("needWCookie", "1"),
  ]
  if (riskCode === "MW0016") fields.push(mailXmlField("pwdType", "1"))
  fields.push("</object>")

  const url = `${MAIL_SMS_URL}?func=${encodeURIComponent("/login/inlogin.action")}&cguid=${Date.now()}`
  const response = await fetchImpl(url, {
    method: "POST",
    headers: mailHeaders(mailCookies),
    body: fields.join(""),
  })
  const merged = mergeResponseCookies(mailCookies, response)
  const result = parseMailLoginResponse(await response.text())
  if (result.code !== "S_OK") {
    throw new Error(
      `verify 139 Mail SMS code failed: code=${result.code} summary=${result.summary}`,
    )
  }

  let sid = ""
  if (result.loginSuccessUrl) {
    try {
      sid =
        new URL(result.loginSuccessUrl, MAIL_PASSWORD_URL).searchParams.get(
          "sid",
        ) || ""
    } catch {
      sid = ""
    }
  }
  if (!sid) {
    sid = getCookie(merged, "Os_SSo_Sid") || getCookie(merged, "sid") || ""
  }
  if (!sid) {
    throw new Error(
      "139 Mail SMS verification succeeded but did not return sid",
    )
  }
  return { sid, mailCookies: merged }
}

async function step1PasswordLogin(
  addition: Yun139Addition,
  fetchImpl: typeof fetch,
): Promise<{ sid: string; mailCookies: string }> {
  const username = (addition.username || "").trim()
  const password = addition.password || ""
  const cguid = String(Date.now())
  const referer =
    `https://mail.10086.cn/default.html?&s=1&v=0&u=${base64Of(username)}` +
    `&m=1&ec=S001&resource=indexLogin&clientid=1003&auto=on&cguid=${cguid}&mtime=45`

  const form = new URLSearchParams({
    UserName: username,
    passOld: "",
    auto: "on",
    Password: sha1Hex(`fetion.com.cn:${password}`),
    webIndexPagePwdLogin: "1",
    pwdType: "1",
    clientId: "1003",
    authType: "2",
  })

  let mailCookies = (addition.mail_cookies || "").trim()
  const headers: Record<string, string> = {
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language":
      "zh-CN,zh;q=0.9,zh-TW;q=0.8,en-US;q=0.7,en;q=0.6,en-GB;q=0.5",
    "cache-control": "max-age=0",
    "content-type": "application/x-www-form-urlencoded",
    dnt: "1",
    origin: "https://mail.10086.cn",
    priority: "u=0, i",
    referer,
    "sec-ch-ua":
      '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  }
  if (mailCookies) headers.Cookie = mailCookies

  const response = await fetchImpl(MAIL_PASSWORD_URL, {
    method: "POST",
    headers,
    body: form.toString(),
    redirect: "manual",
  })
  mailCookies = mergeResponseCookies(mailCookies, response)

  const location = response.headers.get("location") || ""
  const riskCode = mailRiskCode(location)
  if (riskCode) {
    if (smsSceneForRisk(riskCode) === null) {
      throw new Error(`139 Mail risk control triggered: ${riskCode}`)
    }
    if (!(addition.sms_code || "").trim()) {
      mailCookies = await sendSmsCode(
        username,
        riskCode,
        mailCookies,
        fetchImpl,
      )
      throw new Yun139SmsRequiredError(
        "139 Mail SMS verification code sent; fill sms_code and save the storage again",
        mailCookies,
      )
    }
    const verified = await verifySmsCode(
      username,
      riskCode,
      (addition.sms_code || "").trim(),
      mailCookies,
      fetchImpl,
    )
    return { sid: verified.sid, mailCookies: verified.mailCookies }
  }

  let sid = ""
  if (location) {
    try {
      sid = new URL(location, MAIL_PASSWORD_URL).searchParams.get("sid") || ""
    } catch {
      sid = ""
    }
  }
  if (!sid) {
    sid =
      getCookie(mailCookies, "Os_SSo_Sid") ||
      getCookie(mailCookies, "sid") ||
      ""
  }
  if (!sid) {
    throw new Error("failed to extract sid from login response")
  }
  return { sid, mailCookies }
}

async function step2GetArtifact(
  sid: string,
  mailCookies: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const rmkey = getCookie(mailCookies, "RMKEY")
  if (!rmkey) throw new Error("RMKEY not found in MailCookies")
  const url =
    "https://smsrebuild1.mail.10086.cn/setting/s?" +
    `func=${encodeURIComponent("umc:getArtifact")}` +
    `&sid=${encodeURIComponent(sid)}&cguid=${Date.now()}`
  const response = await fetchImpl(url, {
    method: "POST",
    headers: mailHeaders(`RMKEY=${rmkey}`),
  })
  const text = await response.text()
  let artifact = ""
  try {
    artifact = String(JSON.parse(text)?.var?.artifact || "")
  } catch {
    artifact = ""
  }
  if (!artifact)
    throw new Error("failed to extract dycpwd from artifact exchange response")
  return artifact
}

async function encryptedRequest(
  url: string,
  body: any,
  headers: Record<string, string>,
  keyHex: string,
  fetchImpl: typeof fetch,
): Promise<any> {
  const { iv, ciphertext } = aesCbcEncrypt(sortedJsonStringify(body), keyHex)
  const payload = bytesToBase64(concatBytes(iv, ciphertext))
  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    body: payload,
  })
  if (response.status !== 200) {
    throw new Error(
      `139 encrypted request failed (${response.status}): ${await response.text()}`,
    )
  }
  const text = (await response.text()).trim()
  let jsonText: string
  if (text.startsWith("{")) {
    jsonText = text
  } else {
    const decoded = base64ToBytes(text)
    if (decoded.length < 16) {
      throw new Error(
        `139 encrypted response is too short to contain an IV (${decoded.length})`,
      )
    }
    jsonText = aesCbcDecrypt(decoded.slice(16), keyHex, decoded.slice(0, 16))
  }
  try {
    return JSON.parse(jsonText)
  } catch {
    throw new Error("139 encrypted response is not valid JSON")
  }
}

async function step3ThirdPartyLogin(
  username: string,
  dycpwd: string,
  fetchImpl: typeof fetch,
): Promise<{ authorization: string; account: string; userDomainId: string }> {
  const body = {
    clientkey_decrypt: "l3TryM&Q+X7@dzwk)qP",
    clienttype: "886",
    cpid: "507",
    dycpwd,
    extInfo: { ifOpenAccount: "0" },
    loginMode: "0",
    msisdn: username,
    pintype: "13",
    secinfo: sha1Hex(`fetion.com.cn:${dycpwd}`).toUpperCase(),
    version: "20250901",
  }
  const headers: Record<string, string> = {
    "hcy-cool-flag": "1",
    "x-huawei-channelSrc": "10246600",
    "x-sdk-channelSrc": "",
    "x-MM-Source": "0",
    "x-UserAgent": "android|23116PN5BC|android15|1.2.6|||1440x3200|10246600",
    "x-DeviceInfo":
      "4|127.0.0.1|5|1.2.6|Xiaomi|23116PN5BC||02-00-00-00-00-00|android 15|1440x3200|android|||",
    "Content-Type": "text/plain;charset=UTF-8",
    "Accept-Encoding": "gzip",
    "User-Agent": "okhttp/3.12.2",
  }

  const firstLayer = await encryptedRequest(
    SSO_LOGIN_URL,
    body,
    headers,
    KEY_HEX_1,
    fetchImpl,
  )
  const hexInner = String(firstLayer?.data || "")
  if (!hexInner) {
    throw new Error("missing data field in first layer decryption result")
  }
  const final = JSON.parse(aesEcbDecrypt(hexToBytes(hexInner), KEY_HEX_2))
  const authToken = String(final?.authToken || "")
  const account = String(final?.account || "")
  const userDomainId = String(final?.userDomainId || "")
  if (!authToken || !account || !userDomainId) {
    throw new Error(
      "failed to extract authToken, account or userDomainId from final decryption result",
    )
  }
  return {
    authorization: base64Of(`pc:${account}:${authToken}`),
    account,
    userDomainId,
  }
}

async function loginWithPassword(
  addition: Yun139Addition,
  fetchImpl: typeof fetch,
): Promise<Yun139LoginResult> {
  const username = (addition.username || "").trim()
  const password = addition.password || ""
  if (!username || !password) {
    throw new Error("username or password is empty")
  }
  const step1 = await step1PasswordLogin(addition, fetchImpl)
  const artifact = await step2GetArtifact(
    step1.sid,
    step1.mailCookies,
    fetchImpl,
  )
  const step3 = await step3ThirdPartyLogin(username, artifact, fetchImpl)
  return {
    authorization: step3.authorization,
    account: step3.account,
    userDomainId: step3.userDomainId,
    mailCookies: step1.mailCookies,
    smsCode: "",
  }
}

async function tryFastLoginWithCookies(
  addition: Yun139Addition,
  fetchImpl: typeof fetch,
): Promise<Yun139LoginResult | null> {
  const mailCookies = (addition.mail_cookies || "").trim()
  const { sid, rmkey } = extractFastLoginCookies(mailCookies)
  if (!sid || !rmkey) return null
  try {
    const artifact = await step2GetArtifact(sid, mailCookies, fetchImpl)
    const step3 = await step3ThirdPartyLogin(
      (addition.username || "").trim(),
      artifact,
      fetchImpl,
    )
    return {
      authorization: step3.authorization,
      account: step3.account,
      userDomainId: step3.userDomainId,
      mailCookies,
      smsCode: "",
    }
  } catch {
    return null
  }
}

/**
 * 对齐 Go 主项目的凭证初始化：
 * - Authorization 非空：直接使用；
 * - MailCookies 含 SID/RMKEY：先尝试快速登录；
 * - Username + Password：完整密码登录（必要时走短信风控）。
 */
export async function loginWithCredentials(
  addition: Yun139Addition,
  fetchImpl: typeof fetch = fetch,
  options: { ignoreAuthorization?: boolean; skipFastLogin?: boolean } = {},
): Promise<Yun139LoginResult> {
  const authorization = (addition.authorization || "").trim()
  const username = (addition.username || "").trim()
  const password = addition.password || ""
  const mailCookies = (addition.mail_cookies || "").trim()

  if (authorization && !options.ignoreAuthorization) {
    if (/^basic\s/i.test(authorization)) {
      throw new Error("authorization should not include Basic prefix")
    }
    return {
      authorization,
      account: "",
      userDomainId: (addition.user_domain_id || "").trim(),
      mailCookies,
      smsCode: (addition.sms_code || "").trim(),
    }
  }

  if (mailCookies && !hasCookiePair(mailCookies)) {
    throw new Error(
      "MailCookies format is invalid, please check your configuration",
    )
  }
  const hasUsername = username !== ""
  const hasPassword = password.trim() !== ""
  if (hasUsername !== hasPassword) {
    throw new Error("username and password must be provided together")
  }

  if (mailCookies && !options.skipFastLogin) {
    const fast = await tryFastLoginWithCookies(addition, fetchImpl)
    if (fast) return fast
  }
  if (hasUsername) {
    return loginWithPassword(addition, fetchImpl)
  }
  if (mailCookies) {
    throw new Error(
      "fast login with cookies failed, and cannot fallback to password login (missing username/password)",
    )
  }
  throw new Error("authorization is empty and credentials are not provided")
}
