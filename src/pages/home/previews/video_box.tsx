import {
  Flex,
  VStack,
  Image,
  Anchor,
  Tooltip,
  HStack,
  Switch,
  Icon,
  IconButton,
} from "@hope-ui/solid"
import { For, JSXElement, createSignal, createMemo, Show } from "solid-js"
import { useRouter, useLink, useT, usePath, getGlobalPage } from "~/hooks"
import { getPagination, objStore, setShouldKeepState } from "~/store"
import { ObjType } from "~/types"
import { convertURL, getPlatform, pathDir } from "~/utils"
import Artplayer from "artplayer"
import { SelectWrapper } from "~/components"
import { BsArrowRight } from "solid-icons/bs"

Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
Artplayer.REMOVE_SRC_WHEN_DESTROY = true

export const players: {
  icon: string
  name: string
  scheme: string
  platforms: string[]
}[] = [
  {
    icon: "iina",
    name: "IINA",
    scheme: "iina://weblink?url=$edurl",
    platforms: ["MacOS"],
  },
  {
    icon: "potplayer",
    name: "PotPlayer",
    scheme: "potplayer://$durl",
    platforms: ["Windows"],
  },
  {
    icon: "vlc",
    name: "VLC",
    scheme: "vlc://$durl",
    platforms: ["Windows", "MacOS", "Linux", "Android", "iOS"],
  },
  {
    icon: "android",
    name: "Android",
    scheme: "intent:$durl#Intent;type=video/*;S.title=$name;end",
    platforms: ["Android"],
  },
  {
    icon: "nplayer",
    name: "nPlayer",
    scheme: "nplayer-$durl",
    platforms: ["Android", "iOS"],
  },
  {
    icon: "omniplayer",
    name: "OmniPlayer",
    scheme: "omniplayer://weblink?url=$durl",
    platforms: ["MacOS"],
  },
  {
    icon: "figplayer",
    name: "Fig Player",
    scheme: "figplayer://weblink?url=$durl",
    platforms: ["Windows", "MacOS"],
  },
  {
    icon: "infuse",
    name: "Infuse",
    scheme: "infuse://x-callback-url/play?url=$durl",
    platforms: ["MacOS", "iOS"],
  },
  {
    icon: "fileball",
    name: "Fileball",
    scheme: "filebox://play?url=$durl",
    platforms: ["MacOS", "iOS"],
  },
  {
    icon: "mxplayer",
    name: "MX Player",
    scheme:
      "intent:$durl#Intent;package=com.mxtech.videoplayer.ad;S.title=$name;end",
    platforms: ["Android"],
  },
  {
    icon: "mxplayer-pro",
    name: "MX Player Pro",
    scheme:
      "intent:$durl#Intent;package=com.mxtech.videoplayer.pro;S.title=$name;end",
    platforms: ["Android"],
  },
  {
    icon: "iPlay",
    name: "iPlay",
    scheme: "iplay://play/any?type=url&url=$bdurl",
    platforms: ["iOS"],
  },
  {
    icon: "mpv",
    name: "mpv",
    scheme: "mpv://$edurl",
    platforms: ["Windows", "MacOS", "Linux", "Android"],
  },
]

export const AutoHeightPlugin = (player: Artplayer) => {
  const { $container, $video } = player.template
  const $videoBox = $container.parentElement!

  player.on("ready", () => {
    const offsetBottom = "1.75rem" // position bottom of "More" button + padding
    $videoBox.style.maxHeight = `calc(100vh - ${$videoBox.offsetTop}px - ${offsetBottom})`
    $videoBox.style.minHeight = "320px" // min width of mobile phone
    player.autoHeight()
  })
  player.on("resize", () => {
    player.autoHeight()
  })
  player.on("error", () => {
    if ($video.style.height) return
    $container.style.height = "60vh"
    $video.style.height = "100%"
  })
}

export const VideoBox = (props: {
  children: JSXElement
  onAutoNextChange: (v: boolean) => void
}) => {
  const { replace, pathname } = useRouter()
  const { currentObjLink } = useLink()
  const { handleFolder } = usePath()
  const [videoName, setVideoName] = createSignal("")
  const videos = createMemo(() => {
    let isLoadMore = true,
      isLast = false
    const videos = objStore.objs.filter((obj) => {
      if (obj.type !== ObjType.VIDEO) return false
      if (obj.name === objStore.obj.name) {
        isLoadMore = false
        isLast = true
        setVideoName(obj.name)
      } else isLast = false
      return true
    })
    if (isLast) {
      isLoadMore = getPagination().type !== "all"
    }
    if (isLoadMore) {
      let path = pathname()
      if (!path.endsWith(objStore.obj.name)) {
        // 单文件分享
        videos.push(objStore.obj)
        setVideoName(objStore.obj.name)
        return videos
      }
      const append = objStore.objs.length > 0
      handleFolder(
        pathDir(path),
        getGlobalPage() + (append ? 1 : 0),
        undefined,
        append,
        false,
        true,
      )
    }
    return videos
  })
  const t = useT()
  let autoNext = localStorage.getItem("video_auto_next")
  if (!autoNext) {
    autoNext = "true"
  }
  props.onAutoNextChange(autoNext === "true")

  const [showAll, setShowAll] = createSignal(
    localStorage.getItem("video_show_all_players") === "true",
  )
  const platform = getPlatform()
  const platformPlayers = createMemo(() => {
    if (showAll() || platform === "Unknown") {
      return players
    }
    return players.filter((p) => p.platforms.includes(platform))
  })

  return (
    <VStack w="$full" spacing="$2">
      {props.children}
      <Show when={videoName() !== ""}>
        <HStack spacing="$2" w="$full">
          <SelectWrapper
            onChange={(name: string) => {
              replace(name)
            }}
            value={videoName()}
            options={videos().map((obj) => ({ value: obj.name }))}
          />
          <Switch
            css={{
              whiteSpace: "nowrap",
            }}
            defaultChecked={autoNext === "true"}
            onChange={(e: { currentTarget: HTMLInputElement }) => {
              props.onAutoNextChange(e.currentTarget.checked)
              localStorage.setItem(
                "video_auto_next",
                e.currentTarget.checked.toString(),
              )
            }}
          >
            {t("home.preview.auto_next")}
          </Switch>
        </HStack>
      </Show>
      <Flex wrap="wrap" gap="$1" justifyContent="center" alignItems="center">
        <For each={platformPlayers()}>
          {(item) => {
            return (
              <Tooltip placement="top" withArrow label={item.name}>
                <Anchor
                  // external
                  href={convertURL(item.scheme, {
                    raw_url: objStore.raw_url,
                    name: objStore.obj.name,
                    d_url: currentObjLink(true),
                  })}
                >
                  <Image
                    m="0 auto"
                    boxSize="$8"
                    src={`${window.__dynamic_base__}/images/${item.icon}.webp`}
                  />
                </Anchor>
              </Tooltip>
            )
          }}
        </For>
        <IconButton
          aria-label="Show all players"
          variant="ghost"
          onClick={() => {
            const newShowAll = !showAll()
            setShowAll(newShowAll)
            localStorage.setItem(
              "video_show_all_players",
              newShowAll.toString(),
            )
          }}
          icon={
            <Icon
              as={BsArrowRight}
              boxSize="$6"
              color="accent.500"
              transform={showAll() ? "rotate(180deg)" : "none"}
              transition="transform 0.2s"
            />
          }
        />
      </Flex>
    </VStack>
  )
}
