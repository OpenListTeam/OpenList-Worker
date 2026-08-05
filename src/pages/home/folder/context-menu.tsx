import { Menu, Item, Submenu } from "solid-contextmenu"
import { useCopyLink, useDownload, useLink, useRouter, useT } from "~/hooks"
import "solid-contextmenu/dist/style.css"
import { HStack, Icon, Text, useColorMode, Image } from "@hope-ui/solid"
import { operations } from "../toolbar/operations"
import { For, Show } from "solid-js"
import { bus, convertURL, notify, torrentParse } from "~/utils"
import { ObjType, UserMethods } from "~/types"
import {
  getSettingBool,
  haveSelected,
  me,
  objStore,
  oneChecked,
  selectedObjs,
  userCan,
} from "~/store"
import { players } from "../previews/video_box"
import { FiExternalLink } from "solid-icons/fi"
import { isArchive } from "~/store/archive"
import axios from "axios"

const ItemContent = (props: { name: string }) => {
  const t = useT()
  const op = operations[props.name]
  if (!op) return <Text>{props.name}</Text>
  return (
    <HStack spacing="$2">
      <Icon
        p={op.p ? "$1" : undefined}
        as={op.icon}
        boxSize="$7"
        color={op.color}
      />
      <Text>{t(`home.toolbar.${props.name}`)}</Text>
    </HStack>
  )
}

export const ContextMenu = () => {
  const t = useT()
  const { colorMode } = useColorMode()
  const { copySelectedRawLink, copySelectedPreviewPage } = useCopyLink()
  const { batchDownloadSelected, sendToAria2, playlistDownloadSelected } =
    useDownload()
  const canPackageDownload = () => {
    return UserMethods.is_admin(me()) || getSettingBool("package_download")
  }
  const { rawLink } = useLink()
  const { isShare, pushHref } = useRouter()

  return (
    <Menu
      id={1}
      animation="scale"
      theme={colorMode() !== "dark" ? "light" : "dark"}
      style="z-index: var(--hope-zIndices-popover)"
    >
      {/* 1. 打开方式 ... (单选文件或目录时显示在首项) */}
      <Show when={oneChecked()}>
        <Submenu label={<ItemContent name="open_with" />}>
          <Item
            onClick={() => {
              const obj = selectedObjs()[0]
              if (!obj) return
              if (obj.is_dir) {
                window.open(location.origin + pushHref(obj.name), "_blank")
              } else {
                window.open(rawLink(obj, true), "_blank")
              }
            }}
          >
            <HStack spacing="$2">
              <Icon as={FiExternalLink} boxSize="$5" color="$info9" />
              <Text>{t("home.preview.open_in_new_window")}</Text>
            </HStack>
          </Item>
          <Show when={selectedObjs()[0]?.type === ObjType.VIDEO}>
            <For each={players}>
              {(player) => (
                <Item
                  onClick={() => {
                    const obj = selectedObjs()[0]
                    if (!obj) return
                    const href = convertURL(player.scheme, {
                      raw_url: "",
                      name: obj.name,
                      d_url: rawLink(obj, true),
                    })
                    window.open(href, "_self")
                  }}
                >
                  <HStack spacing="$2">
                    <Image
                      m="0 auto"
                      boxSize="$6"
                      src={`${window.__dynamic_base__}/images/${player.icon}.webp`}
                    />
                    <Text>{player.name}</Text>
                  </HStack>
                </Item>
              )}
            </For>
          </Show>
        </Submenu>
      </Show>

      {/* 2. 空白处右键选项 (新建文件夹 / 新建文件) */}
      <Show when={!haveSelected()}>
        <Item
          hidden={!objStore.write || isShare()}
          onClick={() => bus.emit("tool", "mkdir")}
        >
          <ItemContent name="mkdir" />
        </Item>
        <Item
          hidden={!objStore.write || isShare()}
          onClick={() => bus.emit("tool", "new_file")}
        >
          <ItemContent name="new_file" />
        </Item>
      </Show>

      {/* 3. 基础文件操作：重命名、移动、复制、删除 */}
      <For each={["rename", "move", "copy", "delete"] as const}>
        {(name) => (
          <Item
            hidden={
              !haveSelected() || !userCan(name) || !objStore.write || isShare()
            }
            onClick={() => {
              bus.emit("tool", name)
            }}
          >
            <ItemContent name={name} />
          </Item>
        )}
      </For>

      {/* 4. 分享 */}
      <Item
        hidden={!haveSelected() || !userCan("share") || isShare()}
        onClick={() => {
          bus.emit("tool", "share")
        }}
      >
        <ItemContent name="share" />
      </Item>

      {/* 5. 解压 (仅解压文件) */}
      <Item
        hidden={() => {
          return (
            !haveSelected() ||
            isShare() ||
            !userCan("decompress") ||
            !objStore.write ||
            selectedObjs().some((o) => o.is_dir) ||
            selectedObjs().some((o) => !isArchive(o.name))
          )
        }}
        onClick={() => {
          bus.emit("tool", "decompress")
        }}
      >
        <ItemContent name="decompress" />
      </Item>

      {/* 6. BT 种子解析离线下载 */}
      <Item
        hidden={() => {
          return (
            !haveSelected() ||
            isShare() ||
            !userCan("offline_download") ||
            !objStore.write ||
            !oneChecked() ||
            selectedObjs().some((o) => o.is_dir) ||
            !selectedObjs().every((o) =>
              o.name.toLowerCase().endsWith(".torrent"),
            )
          )
        }}
        onClick={async () => {
          const obj = selectedObjs()[0]
          if (!obj) return
          try {
            const link = rawLink(obj, false)
            const resp = await axios.get(link, { responseType: "arraybuffer" })
            const buffer = resp.data as ArrayBuffer
            const bytes = new Uint8Array(buffer)
            let binary = ""
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i])
            }
            const base64Data = btoa(binary)

            const parseResp = await torrentParse(base64Data)
            if (parseResp.code === 200) {
              bus.emit("torrent_parsed", {
                torrentData: base64Data,
                info: parseResp.data,
              })
            } else {
              notify.error(parseResp.message || "解析 torrent 失败")
            }
          } catch (err) {
            notify.error(`解析 torrent 失败: ${err}`)
          }
        }}
      >
        <ItemContent name="offline_download_torrent" />
      </Item>

      {/* 7. 复制链接 */}
      <Show when={oneChecked()}>
        <Item
          onClick={({ props }) => {
            if (props.is_dir) {
              copySelectedPreviewPage()
            } else {
              copySelectedRawLink(true)
            }
          }}
        >
          <ItemContent name="copy_link" />
        </Item>
      </Show>
      <Show when={!oneChecked() && haveSelected()}>
        <Submenu label={<ItemContent name="copy_link" />}>
          <Item onClick={copySelectedPreviewPage}>
            {t("home.toolbar.preview_page")}
          </Item>
          <Item onClick={() => copySelectedRawLink()}>
            {t("home.toolbar.down_link")}
          </Item>
          <Item onClick={() => copySelectedRawLink(true)}>
            {t("home.toolbar.encode_down_link")}
          </Item>
        </Submenu>
      </Show>

      {/* 8. 下载 */}
      <Show when={oneChecked()}>
        <Item
          onClick={({ props }) => {
            if (props.is_dir) {
              if (!canPackageDownload()) {
                notify.warning(t("home.toolbar.package_download_disabled"))
                return
              }
              bus.emit("tool", "package_download")
            } else {
              batchDownloadSelected()
            }
          }}
        >
          <ItemContent name="download" />
        </Item>
      </Show>
      <Show when={!oneChecked() && haveSelected()}>
        <Submenu label={<ItemContent name="download" />}>
          <Item onClick={batchDownloadSelected}>
            {t("home.toolbar.batch_download")}
          </Item>
          <Show
            when={
              UserMethods.is_admin(me()) || getSettingBool("package_download")
            }
          >
            <Item onClick={() => bus.emit("tool", "package_download")}>
              {t("home.toolbar.package_download")}
            </Item>
            <Item onClick={playlistDownloadSelected}>
              {t("home.toolbar.playlist_download")}
            </Item>
          </Show>
          <Item onClick={sendToAria2}>{t("home.toolbar.send_aria2")}</Item>
        </Submenu>
      </Show>
    </Menu>
  )
}
