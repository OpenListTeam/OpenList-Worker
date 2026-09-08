// ProtonDrive driver types

export interface ProtonDriveAddition {
  email: string
  password: string
  two_fa_code?: string
  root_folder_id?: string
  use_reusable_login?: boolean
  chunk_size?: string
  /** 可复用登录凭证（base64 编码的 JSON） */
  reusable_credential?: string
}

export interface ProtonAuthResp {
  AccessToken: string
  RefreshToken: string
  TokenType: string
  Scopes: string[]
  UID: string
}

export interface Proton2FAChallengeResp {
  Code: number
  TwoFactor: { Enabled: number }
}

export interface ProtonSalt {
  ID: string
  KeySalt: string // base64
}

export interface ProtonKey {
  ID: string
  Version: number
  PrivateKey: string // armored
  Token: string
  Signature: string | null
  Primary: number
  Active: number
  Flags: number
}

export interface ProtonUser {
  ID: string
  Name: string
  Email: string
  Keys: ProtonKey[]
}

export interface ProtonAddress {
  ID: string
  Email: string
  Keys: ProtonKey[]
}

export interface ProtonShare {
  ShareID: string
  Type: number
  State: number
  VolumeID: string
  Creator: string
  Flags: number
  LinkID: string
  Key: string // armored public key
  Passphrase: string // encrypted passphrase
  PassphraseSignature: string
  AddressID: string
  RootLinkID: string
}

export interface ProtonLink {
  LinkID: string
  ParentLinkID: string
  Type: number
  Name: string // encrypted
  NameSignatureEmail?: string
  Hash: string
  State: number
  Size: number
  MIMEType: string
  NodeKey: string // armored
  NodePassphrase: string // encrypted
  NodePassphraseSignature: string
  SignatureAddress: string
  CreateTime: number
  ModifyTime: number
  FileProperties?: {
    ContentKeyPacket?: string
    ContentKeyPacketSignature?: string
  }
  XAttr?: string
}

export interface ProtonListResp {
  Code: number
  Links: ProtonLink[]
}

export interface ProtonLinkResp {
  Code: number
  Link: ProtonLink
}

export interface ProtonShareResp {
  Code: number
  Shares: ProtonShare[]
}

export interface ProtonSaltsResp {
  Code: number
  KeySalts: ProtonSalt[]
}

export interface ProtonUserResp {
  Code: number
  User: ProtonUser
}

export interface ProtonAddressesResp {
  Code: number
  Addresses: ProtonAddress[]
}

export interface ProtonCreateLinkResp {
  Code: number
  Link: ProtonLink
}

export interface ProtonUploadBlockResp {
  Code: number
  Blocks: ProtonBlock[]
}

export interface ProtonBlock {
  Index: number
  BareURL: string
  Token: string
  EncSignature: string
}

export interface ProtonRevision {
  ID: string
  Size: number
  State: number
  Blocks: ProtonBlock[]
  SignatureEmail: string
}

export interface ProtonRevisionResp {
  Code: number
  Revision: ProtonRevision
}

export interface ProtonRevisionListResp {
  Code: number
  Revisions: ProtonRevision[]
}

export interface ProtonDraftResp {
  Code: number
  Link: ProtonLink
  RevisionID: string
}

/** 可复用登录凭证（持久化到 addition，避免重复密码认证） */
export interface ProtonReusableCredential {
  UID: string
  AccessToken: string
  RefreshToken: string
  SaltedKeyPass: string // base64
}
