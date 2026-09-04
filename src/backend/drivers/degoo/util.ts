// Degoo GraphQL API 客户端
import {
  DriverDegooAddition,
  DegooFileItem,
  DegooLoginResp,
  DegooAccessTokenResp,
  DegooGraphqlResp,
} from "./types"

const LOGIN_URL = "https://rest-api.degoo.com/login"
const ACCESS_TOKEN_URL = "https://rest-api.degoo.com/access-token/v2"
const API_URL = "https://production-appsync.degoo.com/graphql"
const API_KEY = "da2-vs6twz5vnjdavpqndtbzg3prra"
const FOLDER_CHECKSUM = "CgAQAg"

export class ClientDegoo {
  private addition: DriverDegooAddition
  private accessToken = ""
  private refreshToken = ""
  private rootId = "0"
  private persist?: (tokens: {
    accessToken?: string
    refreshToken?: string
  }) => void | Promise<void>

  constructor(
    addition: DriverDegooAddition,
    persist?: (tokens: {
      accessToken?: string
      refreshToken?: string
    }) => void | Promise<void>,
  ) {
    this.addition = addition
    this.accessToken = addition.access_token || ""
    this.refreshToken = addition.refresh_token || ""
    this.persist = persist
  }

  async init(): Promise<void> {
    await this.ensureValidToken()
    await this.getDevices()
  }

  getRootId(): string {
    return this.rootId
  }

  private async saveTokens(): Promise<void> {
    if (this.persist) {
      await this.persist({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
      })
    }
  }

  private isTokenExpired(): boolean {
    if (!this.accessToken) return true
    try {
      const parts = this.accessToken.split(".")
      if (parts.length !== 3) return true
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
      )
      const exp = Number(payload.exp) * 1000
      return Date.now() + 5 * 60 * 1000 > exp
    } catch {
      return true
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.isTokenExpired()) return
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken()
        return
      } catch {
        // fall through to full login
      }
    }
    if (this.addition.username && this.addition.password) {
      await this.login()
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const resp = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ RefreshToken: this.refreshToken }),
    })
    const data = (await resp.json()) as DegooAccessTokenResp
    if (!data.AccessToken) throw new Error("[Degoo] refresh token failed")
    this.accessToken = data.AccessToken
    await this.saveTokens()
  }

  private async login(): Promise<void> {
    const resp = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://app.degoo.com",
      },
      body: JSON.stringify({
        GenerateToken: true,
        Username: this.addition.username,
        Password: this.addition.password,
      }),
    })
    const data = (await resp.json()) as DegooLoginResp
    if (data.RefreshToken) {
      this.refreshToken = data.RefreshToken
      await this.refreshAccessToken()
    } else if (data.Token) {
      this.accessToken = data.Token
      this.refreshToken = ""
    } else {
      throw new Error("[Degoo] login failed: no valid token")
    }
    await this.saveTokens()
  }

  private async apiCall(
    operationName: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<any> {
    await this.ensureValidToken()
    if (variables.Token !== undefined) {
      variables.Token = this.accessToken
    }
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ operationName, query, variables }),
    })
    const data = (await resp.json()) as DegooGraphqlResp
    if (data.errors && data.errors.length > 0) {
      const err = data.errors[0]
      if (err.errorType === "Unauthorized") {
        await this.login()
        variables.Token = this.accessToken
        return this.apiCall(operationName, query, variables)
      }
      throw new Error(`[Degoo] GraphQL error: ${err.message}`)
    }
    return data.data
  }

  /** 解析设备/根目录 ID（root "0" 时） */
  private async getDevices(): Promise<void> {
    const query = `query GetFileChildren5($Token: String! $ParentID: String $AllParentIDs: [String] $Limit: Int! $Order: Int! $NextToken: String ) { getFileChildren5(Token: $Token ParentID: $ParentID AllParentIDs: $AllParentIDs Limit: $Limit Order: $Order NextToken: $NextToken) { Items { ParentID } NextToken } }`
    const data = await this.apiCall("GetFileChildren5", query, {
      Token: this.accessToken,
      ParentID: "0",
      Limit: 10,
      Order: 3,
    })
    if (this.rootId === "0") {
      const items = data?.getFileChildren5?.Items as DegooFileItem[] | undefined
      if (items && items.length > 0) {
        this.rootId = items[0].ParentID
      }
    }
  }

  async getFileChildren5(parentID: string): Promise<DegooFileItem[]> {
    const query = `query GetFileChildren5($Token: String! $ParentID: String $AllParentIDs: [String] $Limit: Int! $Order: Int! $NextToken: String ) { getFileChildren5(Token: $Token ParentID: $ParentID AllParentIDs: $AllParentIDs Limit: $Limit Order: $Order NextToken: $NextToken) { Items { ID ParentID Name Category Size CreationTime LastModificationTime LastUploadTime FilePath IsInRecycleBin DeviceID MetadataID } NextToken } }`
    const allItems: DegooFileItem[] = []
    let nextToken = ""
    for (;;) {
      const variables: Record<string, unknown> = {
        Token: this.accessToken,
        ParentID: parentID,
        Limit: 1000,
        Order: 3,
      }
      if (nextToken) variables.NextToken = nextToken
      const data = await this.apiCall("GetFileChildren5", query, variables)
      const items = (data?.getFileChildren5?.Items || []) as DegooFileItem[]
      allItems.push(...items)
      nextToken = data?.getFileChildren5?.NextToken || ""
      if (!nextToken) break
    }
    return allItems
  }

  async getOverlay4(id: string): Promise<DegooFileItem> {
    const query = `query GetOverlay4($Token: String!, $ID: IDType!) { getOverlay4(Token: $Token, ID: $ID) { ID ParentID Name Category Size CreationTime LastModificationTime LastUploadTime URL FilePath IsInRecycleBin DeviceID MetadataID } }`
    const data = await this.apiCall("GetOverlay4", query, {
      Token: this.accessToken,
      ID: { FileID: id },
    })
    return data?.getOverlay4 as DegooFileItem
  }

  async mkdir(parentID: string, name: string): Promise<void> {
    const query = `mutation SetUploadFile3($Token: String!, $FileInfos: [FileInfoUpload3]!) { setUploadFile3(Token: $Token, FileInfos: $FileInfos) }`
    await this.apiCall("SetUploadFile3", query, {
      Token: this.accessToken,
      FileInfos: [
        {
          Checksum: FOLDER_CHECKSUM,
          Name: name,
          CreationTime: Date.now(),
          ParentID: parentID,
          Size: 0,
        },
      ],
    })
  }

  async move(id: string, dstID: string): Promise<void> {
    const query = `mutation SetMoveFile($Token: String!, $Copy: Boolean, $NewParentID: String!, $FileIDs: [String]!) { setMoveFile(Token: $Token, Copy: $Copy, NewParentID: $NewParentID, FileIDs: $FileIDs) }`
    await this.apiCall("SetMoveFile", query, {
      Token: this.accessToken,
      Copy: false,
      NewParentID: dstID,
      FileIDs: [id],
    })
  }

  async rename(id: string, newName: string): Promise<void> {
    const query = `mutation SetRenameFile($Token: String!, $FileRenames: [FileRenameInfo]!) { setRenameFile(Token: $Token, FileRenames: $FileRenames) }`
    await this.apiCall("SetRenameFile", query, {
      Token: this.accessToken,
      FileRenames: [{ ID: id, NewName: newName }],
    })
  }

  async remove(id: string): Promise<void> {
    const query = `mutation SetDeleteFile5($Token: String!, $IsInRecycleBin: Boolean!, $IDs: [IDType]!) { setDeleteFile5(Token: $Token, IsInRecycleBin: $IsInRecycleBin, IDs: $IDs) }`
    await this.apiCall("SetDeleteFile5", query, {
      Token: this.accessToken,
      IsInRecycleBin: false,
      IDs: [{ FileID: id }],
    })
  }
}
