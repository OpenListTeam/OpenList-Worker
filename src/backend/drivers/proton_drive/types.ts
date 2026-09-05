// ProtonDrive driver types
// Ported from: https://github.com/OpenListTeam/OpenList/tree/main/drivers/proton_drive

export interface ProtonDriveAddition {
  email: string
  password: string
  two_fa_code?: string
  root_folder_id?: string
  use_reusable_login?: boolean
  chunk_size?: string
}

export interface ProtonAuthResp {
  AccessToken: string
  RefreshToken: string
  TokenType: string
  Scopes: string[]
  UID: string
}

export interface ProtonUserResp {
  User: {
    ID: string
    Name: string
    Email: string
  }
}

export interface ProtonShareResp {
  Shares: ProtonShare[]
}

export interface ProtonShare {
  ShareID: string
  Type: number
  State: number
  VolumeID: string
  Creator: string
  Flags: number
  LinkID: string
  Key: string
  Passphrase: string
  PassphraseSignature: string
  AddressID: string
  RootLinkID: string
}

export interface ProtonLink {
  LinkID: string
  ParentLinkID: string
  Type: number
  Name: string
  NameSignatureEmail?: string
  Hash: string
  State: number
  ExpirationTime?: number
  Size: number
  MIMEType: string
  Attributes: number
  Permissions: number
  NodeKey: string
  NodePassphrase: string
  NodePassphraseSignature: string
  SignatureAddress: string
  CreateTime: number
  ModifyTime: number
  Trashed?: number
  Shared: number
  FileProperties?: {
    ContentKeyPacket?: string
    ContentKeyPacketSignature?: string
  }
  XAttr?: string
}

export interface ProtonListResp {
  Links: ProtonLink[]
}

export interface ProtonLinkResp {
  Link: ProtonLink
}

export interface ProtonDownloadResp {
  Code: number
  Token: string
  URL: string
}

export interface ProtonUploadResp {
  Code: number
  Link: ProtonLink
}

export interface ProtonRevisionResp {
  Revision: {
    ID: string
    Size: number
    State: number
    Blocks: ProtonBlock[]
  }
}

export interface ProtonBlock {
  Index: number
  BareURL: string
  Token: string
  EncSignature: string
}
