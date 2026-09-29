// ProtonDrive API client + authentication + key unlocking
import {
  ProtonAddress,
  ProtonAddressesResp,
  ProtonAuthResp,
  ProtonDriveAddition,
  ProtonKey,
  ProtonSalt,
  ProtonSaltsResp,
  ProtonShare,
  ProtonShareResp,
  ProtonUser,
  ProtonUserResp,
} from "./types"
import {
  ProtonAPIBase,
  ProtonAppVersion,
  ProtonAuthInfoURL,
  ProtonAuthURL,
  ProtonAuth2FAURL,
  ProtonJsonMime,
  ProtonRefreshURL,
  ProtonSaltsURL,
  ProtonSDKVersion,
  ProtonSharesURL,
  ProtonUserAgent,
  ProtonUserURL,
  ProtonWebDriveAV,
} from "./consts"
import { computeSRPClientProof } from "./srp"
import {
  KeyRing,
  deriveSaltedKeyPass,
  decryptArmoredText,
  unlockPrivateKey,
} from "./crypto"

export class ProtonDriveClient {
  private accessToken = ""
  private refreshToken = ""
  private uid = ""
  private saltedKeyPass = ""

  constructor(private addition: ProtonDriveAddition) {}

  setAuth(accessToken: string, refreshToken: string, uid: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.uid = uid
  }

  getUID(): string {
    return this.uid
  }

  getSaltedKeyPass(): string {
    return this.saltedKeyPass
  }

  setSaltedKeyPass(v: string) {
    this.saltedKeyPass = v
  }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: ProtonJsonMime,
      "X-Pm-Appversion": ProtonWebDriveAV,
      "X-Pm-Drive-Sdk-Version": ProtonSDKVersion,
      "User-Agent": ProtonUserAgent,
    }
    if (this.accessToken) {
      h.Authorization = `Bearer ${this.accessToken}`
      h["X-Pm-Uid"] = this.uid
    }
    return h
  }

  async request(
    url: string,
    options: { method?: string; body?: any } = {},
  ): Promise<any> {
    const method = options.method || "GET"
    const headers = this.authHeaders()
    const init: RequestInit = { method, headers }
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body)
      headers["Content-Type"] = "application/json"
    }
    const res = await fetch(url, init)
    const text = await res.text()
    let json: any = {}
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      json = {}
    }
    if (!res.ok) {
      throw new Error(
        `Proton request failed: ${res.status} ${(json.Error || text).slice(0, 200)}`,
      )
    }
    return json
  }

  async requestAPI(
    path: string,
    options: { method?: string; body?: any; params?: Record<string, any> } = {},
  ): Promise<any> {
    let url = path.startsWith("http") ? path : `${ProtonAPIBase}${path}`
    if (options.params) {
      const q = new URLSearchParams(
        Object.entries(options.params).map(([k, v]) => [k, String(v)]),
      ).toString()
      url += (url.includes("?") ? "&" : "?") + q
    }
    return this.request(url, { method: options.method, body: options.body })
  }

  // ---------- authentication ----------

  async login(): Promise<void> {
    // 1. auth info
    const info = await this.request(ProtonAuthInfoURL, {
      method: "POST",
      body: { Username: this.addition.email },
    })
    if (!info.Modulus || !info.ServerEphemeral) {
      throw new Error("invalid auth info response")
    }

    // 2. SRP client proof
    const proof = await computeSRPClientProof(
      this.addition.email,
      this.addition.password,
      info,
    )

    // 3. auth
    let auth = (await this.request(ProtonAuthURL, {
      method: "POST",
      body: {
        Username: this.addition.email,
        ClientEphemeral: proof.ClientEphemeral,
        ClientProof: proof.ClientProof,
        SRPSession: proof.SRPSession,
      },
    })) as ProtonAuthResp & { Code: number; TwoFactor?: { Enabled: number } }

    // 4. 2FA if required
    if (auth.Code === 1001 || auth.TwoFactor?.Enabled) {
      if (!this.addition.two_fa_code) {
        throw new Error("2FA is enabled but no two_fa_code provided")
      }
      auth = (await this.request(ProtonAuth2FAURL, {
        method: "POST",
        body: {
          TwoFactorCode: this.addition.two_fa_code,
          SRPSession: proof.SRPSession,
        },
      })) as ProtonAuthResp & { Code: number }
    }

    if (!auth.AccessToken || !auth.UID) {
      throw new Error(`auth failed: code=${auth.Code}`)
    }

    this.setAuth(auth.AccessToken, auth.RefreshToken, auth.UID)
  }

  async refresh(): Promise<void> {
    if (!this.refreshToken) throw new Error("refresh token is empty")
    const out = (await this.request(ProtonRefreshURL, {
      method: "POST",
      body: {
        RefreshToken: this.refreshToken,
        ResponseType: "token",
        GrantType: "refresh_token",
        RedirectURI: "https://drive.proton.me",
      },
    })) as ProtonAuthResp
    if (!out.AccessToken) throw new Error("refresh token failed")
    this.setAuth(out.AccessToken, out.RefreshToken || this.refreshToken, out.UID || this.uid)
  }

  /** Automatically refresh once on 401 and retry. */
  private async requestWithRetry(
    url: string,
    options: { method?: string; body?: any },
  ): Promise<any> {
    try {
      return await this.request(url, options)
    } catch (e: any) {
      if (String(e.message).includes("401") && this.refreshToken) {
        await this.refresh()
        return this.request(url, options)
      }
      throw e
    }
  }

  // ---------- data fetching ----------

  async getSalts(): Promise<ProtonSalt[]> {
    const resp = (await this.requestWithRetry(ProtonSaltsURL, {})) as ProtonSaltsResp
    return resp.KeySalts || []
  }

  async getUser(): Promise<ProtonUser> {
    const resp = (await this.requestWithRetry(ProtonUserURL, {})) as ProtonUserResp
    return resp.User
  }

  async getAddresses(): Promise<ProtonAddress[]> {
    const resp = (await this.requestWithRetry(
      `${ProtonAPIBase}/core/v4/addresses`,
      {},
    )) as ProtonAddressesResp
    return resp.Addresses || []
  }

  async getShares(): Promise<ProtonShare[]> {
    const resp = (await this.requestWithRetry(ProtonSharesURL, {})) as ProtonShareResp
    return resp.Shares || []
  }
}

// ---------- key unlocking (Proton trust chain) ----------

/** Unlock the primary user key with the salted key pass. */
export async function unlockUserKeys(
  userKeys: ProtonKey[],
  password: string,
  salts: ProtonSalt[],
): Promise<{ userKR: KeyRing; saltedKeyPass: string }> {
  const primary = userKeys.find((k) => k.Primary === 1) || userKeys[0]
  if (!primary) throw new Error("user has no keys")

  const salt = salts.find((s) => s.ID === primary.ID)
  if (!salt) throw new Error("no salt for user key")

  const saltedKeyPass = deriveSaltedKeyPass(password, salt.KeySalt)

  const userKR: KeyRing = []
  for (const key of userKeys) {
    try {
      userKR.push(await unlockPrivateKey(key.PrivateKey, saltedKeyPass))
    } catch {
      // 跳过无法解锁的 key（如非活跃 key）
    }
  }
  if (userKR.length === 0) {
    throw new Error("failed to unlock user keys (wrong password?)")
  }

  return { userKR, saltedKeyPass }
}

/** Unlock address keys. Returns Map<addressID, KeyRing>. */
export async function unlockAddressKeys(
  addresses: ProtonAddress[],
  userKR: KeyRing,
  saltedKeyPass: string,
): Promise<Map<string, KeyRing>> {
  const map = new Map<string, KeyRing>()
  for (const addr of addresses) {
    const kr: KeyRing = []
    for (const key of addr.Keys) {
      try {
        if (key.Token) {
          // token is a passphrase encrypted with the user key
          const passphrase = await decryptArmoredText(key.Token, userKR)
          kr.push(await unlockPrivateKey(key.PrivateKey, passphrase))
        } else {
          kr.push(await unlockPrivateKey(key.PrivateKey, saltedKeyPass))
        }
      } catch {
        // skip
      }
    }
    if (kr.length > 0) map.set(addr.ID, kr)
  }
  return map
}

/** Unlock the main share keyring using the share's address keyring. */
export async function unlockShareKeyring(
  share: ProtonShare,
  addrKRs: Map<string, KeyRing>,
): Promise<KeyRing> {
  const addrKR = addrKRs.get(share.AddressID)
  if (!addrKR) throw new Error("no address keyring for share")

  const passphrase = await decryptArmoredText(share.Passphrase, addrKR)
  const shareKey = await unlockPrivateKey(share.Key, passphrase)
  return [...addrKR, shareKey]
}
