import { Box } from "@hope-ui/solid"
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"
import { useRouter, useLink } from "~/hooks"
import {
  getMainColor,
  getSettingBool,
  objStore,
  setShouldKeepState,
} from "~/store"
import { Obj, ObjType } from "~/types"
import { ext, pathDir, pathJoin } from "~/utils"
import Artplayer from "artplayer"
import { type Option } from "artplayer"
import { type Setting } from "artplayer"
import { type Events } from "artplayer"
import artplayerPluginDanmuku from "artplayer-plugin-danmuku"
import { type Option as DanmukuOption } from "artplayer-plugin-danmuku"
import artplayerPluginAss from "~/components/artplayer-plugin-ass"
import mpegts from "mpegts.js"
import Hls from "hls.js"
import { currentLang } from "~/app/i18n"
import { AutoHeightPlugin, VideoBox } from "./video_box"
import { ArtPlayerIconsSubtitle } from "~/components/icons"
import { useNavigate } from "@solidjs/router"
import "./artplayer.css"

const Preview = () => {
  const { pathname, searchParams } = useRouter()
  const { proxyLink } = useLink()
  const navigate = useNavigate()
  const videos = createMemo(() =>
    objStore.objs.filter((obj) => obj.type === ObjType.VIDEO),
  )
  const next_video = () => {
    const index = videos().findIndex((f) => f.name === objStore.obj.name)
    if (index < videos().length - 1) {
      navigate(
        pathJoin(pathDir(location.pathname), videos()[index + 1].name) +
          "?auto_fullscreen=" +
          player.fullscreen,
      )
    }
  }
  const previous_video = () => {
    const index = videos().findIndex((f) => f.name === objStore.obj.name)
    if (index > 0) {
      navigate(
        pathJoin(pathDir(location.pathname), videos()[index - 1].name) +
          "?auto_fullscreen=" +
          player.fullscreen,
      )
    }
  }
  let player: Artplayer
  let flvPlayer: mpegts.Player
  let hlsPlayer: Hls
  let option: Option = {
    container: "#video-player",
    volume: 1.0,
    autoplay: getSettingBool("video_autoplay"),
    autoSize: false,
    autoMini: true,
    loop: false,
    flip: true,
    playbackRate: true,
    aspectRatio: true,
    screenshot: true,
    setting: true,
    hotkey: true,
    pip: true,
    mutex: true,
    fullscreen: true,
    fullscreenWeb: true,
    subtitleOffset: true,
    miniProgressBar: false,
    playsInline: true,
    theme: getMainColor(),
    // layers: [],
    // settings: [],
    // contextmenu: [],
    controls: [
      {
        name: "previous-button",
        index: 10,
        position: "left",
        html: '<svg fill="none" stroke-width="2" xmlns="http://www.w3.org/2000/svg" height="22" width="22" class="icon icon-tabler icon-tabler-player-track-prev-filled" width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="overflow: visible; color: currentcolor;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M20.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647 .565 1.659 .106 1.659 -.753v-14c0 -.86 -1.012 -1.318 -1.659 -.753z" stroke-width="0" fill="currentColor"></path><path d="M9.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647 .565 1.659 .106 1.659 -.753v-14c0 -.86 -1.012 -1.318 -1.659 -.753z" stroke-width="0" fill="currentColor"></path></svg>',
        tooltip: "Previous",
        click: function () {
          previous_video()
        },
      },
      {
        name: "next-button",
        index: 11,
        position: "left",
        html: '<svg fill="none" stroke-width="2" xmlns="http://www.w3.org/2000/svg" height="22" width="22" class="icon icon-tabler icon-tabler-player-track-next-filled" width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="overflow: visible; color: currentcolor;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M2 5v14c0 .86 1.012 1.318 1.659 .753l8 -7a1 1 0 0 0 0 -1.506l-8 -7c-.647 -.565 -1.659 -.106 -1.659 .753z" stroke-width="0" fill="currentColor"></path><path d="M13 5v14c0 .86 1.012 1.318 1.659 .753l8 -7a1 1 0 0 0 0 -1.506l-8 -7c-.647 -.565 -1.659 -.106 -1.659 .753z" stroke-width="0" fill="currentColor"></path></svg>',
        tooltip: "Next",
        click: function () {
          next_video()
        },
      },
    ],
    quality: [],
    // highlight: [],
    plugins: [AutoHeightPlugin],
    whitelist: [],
    settings: [],
    // subtitle:{}
    moreVideoAttr: {
      // @ts-ignore
      "webkit-playsinline": true,
      playsInline: true,
      crossOrigin: "anonymous",
    },
    customType: {
      flv: function (video: HTMLMediaElement, url: string) {
        flvPlayer?.destroy()
        flvPlayer = mpegts.createPlayer(
          {
            type: "flv",
            url: url,
          },
          { referrerPolicy: "same-origin" },
        )
        flvPlayer.attachMediaElement(video)
        flvPlayer.load()
      },
      m2ts: function (video: HTMLMediaElement, url: string) {
        flvPlayer?.destroy()
        flvPlayer = mpegts.createPlayer(
          {
            type: "m2ts",
            url: url,
          },
          { referrerPolicy: "same-origin" },
        )
        flvPlayer.attachMediaElement(video)
        flvPlayer.load()
      },
      m3u8: function (video: HTMLMediaElement, url: string) {
        hlsPlayer?.destroy()
        hlsPlayer = new Hls()
        hlsPlayer.loadSource(url)
        hlsPlayer.attachMedia(video)
        if (!video.src) {
          video.src = url
        }
      },
    },
    lang: ["en", "zh-cn", "zh-tw"].includes(currentLang().toLowerCase())
      ? (currentLang().toLowerCase() as string)
      : "en",
    lock: true,
    fastForward: true,
    autoPlayback: true,
    autoOrientation: true,
    airplay: true,
  }
  const subtitleAndDanmu = createMemo(() => {
    const subtitle: Obj[] = []
    let danmu: Obj | undefined
    for (const obj of objStore.related) {
      const name = obj.name.toLowerCase()
      if (
        name.endsWith(".srt") ||
        name.endsWith(".ass") ||
        name.endsWith(".vtt")
      ) {
        subtitle.push(obj)
      } else if (!danmu && name.endsWith(".xml")) {
        danmu = obj
      }
    }
    return { subtitle, danmu }
  })

  // TODO: add a switch in manage panel to choose whether to enable `libass-wasm`
  const enableEnhanceAss = true

  const switchUrl = (url: string) => {
    const { playing } = player
    player.pause()
    player.option.id = pathname()
    player.option.type = ext(objStore.obj.name)
    player.switchUrl(url).finally(() => playing && player.play())

    const { subtitle, danmu } = subtitleAndDanmu()
    let isEnhanceAssMode = false
    const setSubtitleVisible = (visible: boolean) => {
      const type = isEnhanceAssMode ? "ass" : "webvtt"

      switch (type) {
        case "ass":
          player.subtitle.show = false
          player.emit("artplayer-plugin-ass:visible" as keyof Events, visible)
          break

        case "webvtt":
        default:
          player.subtitle.show = visible
          player.emit("artplayer-plugin-ass:visible" as keyof Events, false)
          break
      }
    }
    if (subtitle.length) {
      // render subtitle toggle menu
      const innerMenu: Setting[] = [
        {
          name: "setting_subtitle_display",
          html: "Display",
          tooltip: "Show",
          switch: true,
          onSwitch: function (item: Setting) {
            item.tooltip = item.switch ? "Hide" : "Show"
            setSubtitleVisible(!item.switch)

            // sync menu subtitle tooltip
            const menu_sub = this.setting.find("setting_subtitle")
            menu_sub && (menu_sub.tooltip = item.tooltip)

            return !item.switch
          },
        },
      ]
      subtitle.forEach((item, i) => {
        innerMenu.push({
          default: i === 0,
          html: (
            <span
              title={item.name}
              style={{
                "max-width": "200px",
                overflow: "hidden",
                "text-overflow": "ellipsis",
                "word-break": "break-all",
                "white-space": "normal",
                display: "-webkit-box",
                "-webkit-line-clamp": "2",
                "-webkit-box-orient": "vertical",
                "font-size": "12px",
              }}
            >
              {item.name}
            </span>
          ) as HTMLElement,
          name: item.name,
          url: proxyLink(item, true),
        })
      })

      const onSelect = function (this: Artplayer, item: Setting) {
        if (enableEnhanceAss && ext(item.name).toLowerCase() === "ass") {
          isEnhanceAssMode = true
          if (!player.plugins.artplayerPluginAss) {
            player.plugins.add(artplayerPluginAss({ subUrl: item.url }))
          } else {
            this.emit("artplayer-plugin-ass:switch" as keyof Events, item.url)
          }
          setSubtitleVisible(true)
        } else {
          isEnhanceAssMode = false
          this.subtitle.switch(item.url, { name: item.name })
          this.once("subtitleLoad", setSubtitleVisible.bind(this, true))
        }

        const switcher = innerMenu.find(
          (_) => _.name === "setting_subtitle_display",
        )

        if (switcher && !switcher.switch) switcher.$html?.click?.()

        // sync from display switcher
        return switcher?.tooltip
      }
      player.setting.update({
        name: "setting_subtitle",
        html: "Subtitle",
        tooltip: "Show",
        icon: ArtPlayerIconsSubtitle({ size: 24 }) as HTMLElement,
        selector: innerMenu,
        onSelect,
      })
      onSelect.call(player, innerMenu[1])
    } else {
      player.setting.find("setting_subtitle") &&
        player.setting.remove("setting_subtitle")
      setSubtitleVisible(false)
    }
    const danmukuPlugin = player.plugins.artplayerPluginDanmuku as ReturnType<
      ReturnType<typeof artplayerPluginDanmuku>
    >
    if (danmukuPlugin) {
      danmukuPlugin.reset()
      danmukuPlugin.option.danmuku = []
      danmukuPlugin.load(danmu ? proxyLink(danmu, true) : undefined)
    } else if (danmu) {
      player.plugins.add(
        artplayerPluginDanmuku({
          speed: 5,
          opacity: 1,
          fontSize: 25,
          mode: 0,
          antiOverlap: false,
          synchronousPlayback: false,
          theme: "dark",
          heatmap: true,
          ...JSON.parse(localStorage.getItem("danmuku_config") || "{}"),
          emitter: false,
          danmuku: proxyLink(danmu, true),
        }),
      )
      player.on("artplayerPluginDanmuku:config", (option) => {
        const {
          speed,
          margin,
          opacity,
          mode,
          modes,
          fontSize,
          antiOverlap,
          synchronousPlayback,
          heatmap,
          visible,
        } = option as DanmukuOption
        localStorage.setItem(
          "danmuku_config",
          JSON.stringify({
            speed,
            margin,
            opacity,
            mode,
            modes,
            fontSize,
            antiOverlap,
            synchronousPlayback,
            heatmap,
            visible,
          }),
        )
      })
    }
  }

  onMount(() => {
    player = new Artplayer(option)
    createEffect(on(() => objStore.raw_url, switchUrl))
    let auto_fullscreen: boolean
    switch (searchParams["auto_fullscreen"]) {
      case "true":
        auto_fullscreen = true
      case "false":
        auto_fullscreen = false
      default:
        auto_fullscreen = false
    }
    player.on("ready", () => {
      player.fullscreen = auto_fullscreen
    })
    const onFullscreen = () =>
      setShouldKeepState(player.fullscreen || player.fullscreenWeb)
    player.on("fullscreen", onFullscreen)
    player.on("fullscreenWeb", onFullscreen)
    player.on("video:ended", () => {
      if (!autoNext()) return
      next_video()
    })
    player.on("error", () => {
      if (player.video.crossOrigin) {
        console.log(
          "Error detected. Trying to remove Cross-Origin attribute. Screenshot may not be available.",
        )
        player.video.crossOrigin = null
      }
    })
  })
  onCleanup(() => {
    setShouldKeepState(false)
    if (player) {
      player.fullscreenWeb = false
      player.fullscreen = false
      player.pip && (player.pip = false)
      player.destroy()
    }
    flvPlayer?.destroy()
    hlsPlayer?.destroy()
  })
  const [autoNext, setAutoNext] = createSignal()
  return (
    <VideoBox onAutoNextChange={setAutoNext}>
      <Box w="$full" h="60vh" id="video-player" />
    </VideoBox>
  )
}

export default Preview
