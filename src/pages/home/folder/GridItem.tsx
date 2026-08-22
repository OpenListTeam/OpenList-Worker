import { Center, VStack, Icon, Text } from "@hope-ui/solid"
import { Motion } from "solid-motionone"
import { useContextMenu } from "solid-contextmenu"
import { batch, Show } from "solid-js"
import { CenterLoading, LinkWithPush, ImageWithError } from "~/components"
import { usePath, useRouter, useUtil } from "~/hooks"
import { checkboxOpen, getMainColor, local, selectIndex } from "~/store"
import { ObjType, StoreObj } from "~/types"
import { bus, hoverColor } from "~/utils"
import { getIconByObj } from "~/utils/icon"
import { ItemCheckbox, useSelectWithMouse } from "./helper"

export const GridItem = (props: { obj: StoreObj; index: number }) => {
  const { isHide } = useUtil()
  if (isHide(props.obj)) {
    return null
  }
  const { setPathAs } = usePath()
  const objIcon = (
    <Icon
      color={getMainColor()}
      boxSize={`${parseInt(local["grid_item_size"]) - 30}px`}
      as={getIconByObj(props.obj)}
    />
  )
  const { show } = useContextMenu({ id: 1 })
  const { pushHref, to } = useRouter()
  const { openWithDoubleClick, toggleWithClick, restoreSelectionCache } =
    useSelectWithMouse()
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        width: "100%",
      }}
    >
      <VStack
        classList={{ selected: !!props.obj.selected }}
        class="grid-item viselect-item"
        data-index={props.index}
        w="$full"
        p="$1"
        spacing="$1"
        rounded="$lg"
        transition="all 0.3s"
        _hover={{
          transform: "scale(1.06)",
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
        <Center
          class="item-thumbnail"
          h={`${parseInt(local["grid_item_size"])}px`}
          w="$full"
          cursor={props.obj.type !== ObjType.IMAGE ? "inherit" : "pointer"}
          on:click={(e: MouseEvent) => {
            if (props.obj.type !== ObjType.IMAGE) return
            if (e.ctrlKey || e.metaKey || e.shiftKey) return
            if (!restoreSelectionCache()) return
            bus.emit("gallery", props.obj.name)
            e.preventDefault()
            e.stopPropagation()
          }}
          pos="relative"
        >
          <Show when={checkboxOpen()}>
            <ItemCheckbox
              pos="absolute"
              left="$1"
              top="$1"
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
          <Show when={props.obj.thumb} fallback={objIcon}>
            <ImageWithError
              maxH="$full"
              maxW="$full"
              rounded="$lg"
              shadow="$md"
              fallback={<CenterLoading size="lg" />}
              fallbackErr={objIcon}
              src={props.obj.thumb}
              loading="lazy"
            />
          </Show>
        </Center>
        <Text
          css={{
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
          w="$full"
          overflow="hidden"
          textAlign="center"
          fontSize="$sm"
          title={props.obj.name}
        >
          {props.obj.name}
        </Text>
      </VStack>
    </Motion.div>
  )
}
