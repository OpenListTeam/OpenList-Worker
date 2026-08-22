import mitt from "mitt"
import { TorrentInfo } from "~/types"

type Events = {
  to: string
  gallery: string
  tool: string
  pathname: string
  extract: string
  torrent_parsed: { torrentData: string; info: TorrentInfo }
  "plugin:file_action_registered": any
  "plugin:header_action_registered": any
  [key: string]: any
}

export const bus = mitt<Events>()
