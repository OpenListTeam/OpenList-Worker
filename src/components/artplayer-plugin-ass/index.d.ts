import type Artplayer from "artplayer"
import type SubtitlesOctopus from "@jellyfin/libass-wasm"
import { type Options } from "@jellyfin/libass-wasm"

export = artplayerPluginAss
export as namespace artplayerPluginAss
type Ass = {
  name: "artplayerPluginAss"
  instance: SubtitlesOctopus
}

declare const artplayerPluginAss: (options: Options) => (art: Artplayer) => Ass
