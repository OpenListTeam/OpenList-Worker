import "aplayer/dist/APlayer.min.css"
import "./audio.css"
import APlayer from "aplayer"
import { Box } from "@hope-ui/solid"
import { onCleanup, onMount } from "solid-js"
import { useLink, useRouter, useTitle } from "~/hooks"
import { getMainColor, getSetting, getSettingBool, objStore } from "~/store"
import { ObjType, StoreObj } from "~/types"
import { baseName, fsGet } from "~/utils"

const Preview = () => {
  const { proxyLink, rawLink, previewPage } = useLink()
  const { searchParams } = useRouter()
  let audios = objStore.objs.filter((obj) => obj.type === ObjType.AUDIO)
  if (audios.length === 0 || searchParams["from"] === "search") {
    audios = [objStore.obj]
  }
  let ap: any
  const objToAudio = (obj: StoreObj) => {
    let lrc = undefined
    const lrcObj = objStore.objs.find((o) => {
      return baseName(o.name) === baseName(obj.name) && o.name.endsWith(".lrc")
    })
    if (lrcObj) {
      lrc = proxyLink(lrcObj, true)
    }
    let cover = undefined
    const coverObj = objStore.objs.find((o) => {
      return (
        o.type === ObjType.IMAGE &&
        (baseName(o.name).toLowerCase() === baseName(obj.name).toLowerCase() ||
          baseName(o.name).toLowerCase() === "front" ||
          baseName(o.name).toLowerCase() === "cover" ||
          baseName(o.name).toLowerCase() === "folder")
      )
    })
    if (coverObj) {
      cover = rawLink(coverObj, true)
    } else {
      cover =
        obj.thumb ||
        getSetting("audio_cover") ||
        "https://res.oplist.org/logo/logo.svg"
    }
    const audio = {
      name: obj.name,
      artist: "Unknown",
      // Use objStore.raw_url for current file (has correct auth tokens from backend)
      // Use rawLink for other files in playlist
      url:
        obj.name === objStore.obj.name ? objStore.raw_url : rawLink(obj, true),
      cover: cover,
      lrc: lrc,
    }
    if (objStore.provider === "NeteaseMusic") {
      const matched = obj.name.match(/((.+)\s-\s)?(.+)\.(mp3|flac)/)
      audio.artist = matched?.[2] || "Unknown"
      audio.name = matched?.[3] || obj.name
      const lrcURL = new URL(previewPage(obj).replace(/\.(mp3|flac)/, ".lrc"))
      audio.lrc = decodeURIComponent(lrcURL.pathname)
    }
    return audio
  }
  onMount(() => {
    ap = new APlayer({
      container: document.querySelector("#audio-player"),
      mini: false,
      autoplay: getSettingBool("audio_autoplay"),
      theme: getMainColor(),
      loop: "all",
      order: "list",
      preload: "auto",
      volume: 1.0,
      mutex: true,
      listFolded: false,
      lrcType: objStore.provider === "NeteaseMusic" ? 1 : 3,
      audio: audios.map(objToAudio),
    })

    // Apply monkey patch to fix https://github.com/DIYgod/APlayer/issues/283
    const _switch = ap.lrc.switch
    const _update = ap.lrc.update
    ap.lrc.switch = (index: any) => {
      ap.lrc.update = () => {}
      _switch.call(ap.lrc, index)
      ap.lrc.update = _update
    }

    if (objStore.provider === "NeteaseMusic") {
      ap.on("loadstart", () => {
        const i = ap.list.index
        if (!ap.list.audios[i].lrc) return
        const lrcURL = ap.list.audios[i].lrc
        fsGet(lrcURL).then((resp) => {
          ap.lrc.async = true
          ap.lrc.parsed[i] = undefined
          ap.list.audios[i].lrc = resp.data.raw_url
          ap.lrc.switch(i) // fetch lrc into `parsed`
          ap.list.audios[i].lrc = ""
          ap.lrc.async = false
        })
      })
    }
    const curIndex = audios.findIndex((obj) => obj.name === objStore.obj.name)
    if (curIndex !== -1) {
      ap.list.switch(curIndex)
    }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("seekto", (evt) =>
        ap.seek(evt.seekTime),
      )
      if (ap.list.audios.length > 1) {
        navigator.mediaSession.setActionHandler("previoustrack", () => {
          ap.skipBack()
        })
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          ap.skipForward()
        })
      }
      ap.on("play", () => {
        const current = ap.list.audios[ap.list.index]
        useTitle(current.name)
        navigator.mediaSession.metadata = new MediaMetadata({
          title: current.name,
          artist: current.artist === "Unknown" ? undefined : current.artist,
          artwork: [
            {
              src: current.cover,
            },
          ],
        })
      })
    }
  })
  onCleanup(() => {
    ap?.destroy()
  })
  return <Box w="$full" id="audio-player" />
}

export default Preview
