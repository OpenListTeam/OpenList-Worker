import {
  HStack,
  Icon,
  Progress,
  ProgressIndicator,
  ProgressLabel,
  Text,
} from "@hope-ui/solid"
import { Motion } from "solid-motionone"
import { useContextMenu } from "solid-contextmenu"
import { batch, Show } from "solid-js"
import { LinkWithPush } from "~/components"
import { usePath, useRouter, useUtil } from "~/hooks"
import {
  checkboxOpen,
  getMainColor,
  getSettingBool,
  local,
  OrderBy,
  selectIndex,
} from "~/store"
import { MountDetails, ObjType, StoreObj } from "~/types"
import {
  bus,
  formatDate,
  getFileSize,
  hoverColor,
  showDiskUsage,
  usedPercentage,
  toReadableUsage,
  nearlyFull,
} from "~/utils"
import { getIconByObj } from "~/utils/icon"
import { ItemCheckbox, useSelectWithMouse } from "./helper"

export interface Col {
  name: OrderBy
  textAlign: "left" | "right"
  w: any
}

export const cols: Col[] = [
  { name: "name", textAlign: "left", w: { "@initial": "76%", "@md": "50%" } },
  { name: "size", textAlign: "right", w: { "@initial": "24%", "@md": "17%" } },
  { name: "modified", textAlign: "right", w: { "@initial": 0, "@md": "33%" } },
]

export const ListItem = (props: { obj: StoreObj; index: number }) => {
  const { isHide } = useUtil()
  if (isHide(props.obj)) {
    return null
  }
  const { setPathAs } = usePath()
  const { show } = useContextMenu({ id: 1 })
  const { pushHref, to } = useRouter()
  const { openWithDoubleClick, toggleWithClick, restoreSelectionCache } =
    useSelectWithMouse()
  const filenameStyle = () => local["list_item_filename_overflow"]
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        width: "100%",
      }}
    >
      <HStack
        classList={{ selected: !!props.obj.selected }}
        class="list-item viselect-item"
        data-index={props.index}
        w="$full"
        p="$2"
        rounded="$lg"
        transition="all 0.3s"
        _hover={{
          transform: "scale(1.01)",
          bgColor: hoverColor(),
        }}
        as={LinkWithPush}
        href={props.obj.name}
        cursor={
          openWithDoubleClick() || toggleWithClick() ? "default" : "pointer"
        }
        bgColor={props.obj.selected ? hoverColor() : undefined}
        onDblClick={() => {
          if (!openWithDoubleClick()) return
          selectIndex(props.index, true, true)
          to(pushHref(props.obj.name))
        }}
        onClick={(e: MouseEvent) => {
          // 所有「只拦截、不导航」的场景统一 preventDefault：
          // router 在 document 上的全局锚点监听检测到 defaultPrevented
          // 后会放弃导航，因此 preventDefault 即可完全拦截。
          // - 双击的第二次 click（e.detail > 1）
          // - 双击打开模式下的单击
          // - 带 ctrl/meta/shift 的修饰键点击
          if (
            e.detail > 1 ||
            openWithDoubleClick() ||
            e.ctrlKey ||
            e.metaKey ||
            e.shiftKey
          ) {
            e.preventDefault()
            return
          }
          if (!restoreSelectionCache()) {
            e.preventDefault()
            return
          }
          if (toggleWithClick()) {
            e.preventDefault()
            selectIndex(props.index, !props.obj.selected)
            return
          }
          // 正常单击打开：这里不 preventDefault、也不手动 to()，
          // 完全交给 <a> 锚点自身的导航（router 只会执行一次）。
          // 从根本上避免「锚点导航 + to()」双重导航导致路径重复
          // （曾导致 /文件名/文件名 → folder not found）。
        }}
        onMouseEnter={() => {
          setPathAs(props.obj.name, props.obj.is_dir, true)
        }}
        onContextMenu={(e: MouseEvent) => {
          batch(() => {
            // if (!checkboxOpen()) {
            //   toggleCheckbox();
            // }
            selectIndex(props.index, true, true)
          })
          show(e, { props: props.obj })
        }}
      >
        <HStack class="name-box" spacing="$1" w={cols[0].w}>
          <Show when={checkboxOpen()}>
            <ItemCheckbox
              // colorScheme="neutral"
              on:mousedown={(e: MouseEvent) => {
                e.stopPropagation()
              }}
              on:click={(e: MouseEvent) => {
                e.stopPropagation()
              }}
              checked={props.obj.selected}
              onChange={(e: any) => {
                selectIndex(props.index, e.target.checked)
              }}
            />
          </Show>
          <Icon
            class="icon"
            boxSize="$6"
            color={getMainColor()}
            as={getIconByObj(props.obj)}
            mr="$1"
            cursor={props.obj.type !== ObjType.IMAGE ? "inherit" : "pointer"}
            on:click={(e: MouseEvent) => {
              if (props.obj.type !== ObjType.IMAGE) return
              if (e.ctrlKey || e.metaKey || e.shiftKey) return
              if (!restoreSelectionCache()) return
              bus.emit("gallery", props.obj.name)
              e.preventDefault()
              e.stopPropagation()
            }}
          />
          <Text
            class="name"
            css={{
              wordBreak: "break-all",
              whiteSpace: filenameStyle() === "multi_line" ? "unset" : "nowrap",
              "overflow-x":
                filenameStyle() === "scrollable" ? "auto" : "hidden",
              textOverflow:
                filenameStyle() === "ellipsis" ? "ellipsis" : "unset",
              "scrollbar-width": "none", // firefox
              "&::-webkit-scrollbar": {
                // webkit
                display: "none",
              },
            }}
            title={props.obj.name}
          >
            {props.obj.name}
          </Text>
        </HStack>
        <Show
          fallback={
            <Text
              class="size"
              w={cols[1].w}
              textAlign={cols[1].textAlign as any}
            >
              {getFileSize(props.obj.size)}
            </Text>
          }
          when={showDiskUsage(props.obj.mount_details)}
        >
          <Show
            fallback={
              <Text
                class="size"
                w={cols[1].w}
                textAlign={cols[1].textAlign as any}
              >
                {toReadableUsage(props.obj.mount_details!)}
              </Text>
            }
            when={!getSettingBool("show_disk_usage_in_plain_text")}
          >
            <Progress
              w={cols[1].w}
              class="disk-usage-percentage"
              trackColor="$info3"
              rounded="$full"
              size="md"
              value={usedPercentage(props.obj.mount_details!)}
            >
              <ProgressIndicator
                color={
                  nearlyFull(props.obj.mount_details!) ? "$danger6" : "$info6"
                }
                rounded="$md"
              />
              <ProgressLabel class="disk-usage-text">
                {toReadableUsage(props.obj.mount_details!)}
              </ProgressLabel>
            </Progress>
          </Show>
        </Show>
        <Text
          class="modified"
          display={{ "@initial": "none", "@md": "inline" }}
          w={cols[2].w}
          textAlign={cols[2].textAlign as any}
        >
          {formatDate(props.obj.modified)}
        </Text>
      </HStack>
    </Motion.div>
  )
}
