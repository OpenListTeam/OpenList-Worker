import mitt from "mitt"
import { TorrentInfo } from "~/types"

type Events = {
  to: string
  gallery: string
  tool: string
  pathname: string
  extract: string
  torrent_parsed: { torrentData: string; info: TorrentInfo }
}

export const bus = mitt<Events>()
