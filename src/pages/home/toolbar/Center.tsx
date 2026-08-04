import { Box, HStack, useColorModeValue } from "@hope-ui/solid"
import { createMemo, Show } from "solid-js"
import {
  checkboxOpen,
  haveSelected,
  objStore,
  selectAll,
  selectedObjs,
  State,
  userCan,
} from "~/store"
import { isArchive } from "~/store/archive"
import { CopyLink } from "./CopyLink"
import { CenterIcon } from "./Icon"
import { bus } from "~/utils"
import { Download } from "./Download"
import { Motion, Presence } from "solid-motionone"
import { useRouter } from "~/hooks"

export const Center = () => {
  const show = createMemo(
    () =>
      [State.Folder, State.FetchingMore].includes(objStore.state) &&
      checkboxOpen() &&
      haveSelected(),
  )
  const { isShare } = useRouter()

  const selected = createMemo(() => selectedObjs())
  const count = createMemo(() => selected().length)
  const canDecompress = createMemo(
    () =>
      count() > 0 && selected().every((o) => !o.is_dir && isArchive(o.name)),
  )

  return (
    <Presence exitBeforeEnter>
      <Show when={show()}>
        <Box
          class="center-toolbar"
          pos="fixed"
          bottom="$4"
          left="50%"
          w="max-content"
          color="$neutral11"
          transform="translateX(-50%)"
        >
          <Box
            as={Motion.div}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            // @ts-ignore
            transition={{ duration: 0.2 }}
          >
            <HStack
              p="$2"
              bgColor={useColorModeValue("white", "#000000d0")()}
              spacing="$1"
              shadow="0px 10px 30px -5px rgba(0, 0, 0, 0.3)"
              rounded="$lg"
              css={{
                backdropFilter: "blur(8px)",
              }}
            >
              <Show
                when={
                  !isShare() && (objStore.write || userCan("write_content"))
                }
              >
                <Show when={count() === 1 && userCan("rename")}>
                  <CenterIcon
                    name="rename"
                    onClick={() => {
                      bus.emit("tool", "rename")
                    }}
                  />
                </Show>
                <Show when={userCan("move")}>
                  <CenterIcon
                    name="move"
                    onClick={() => {
                      bus.emit("tool", "move")
                    }}
                  />
                </Show>
                <Show when={userCan("copy")}>
                  <CenterIcon
                    name="copy"
                    onClick={() => {
                      bus.emit("tool", "copy")
                    }}
                  />
                </Show>
                <Show when={userCan("delete")}>
                  <CenterIcon
                    name="delete"
                    onClick={() => {
                      bus.emit("tool", "delete")
                    }}
                  />
                </Show>
                <Show when={canDecompress() && userCan("decompress")}>
                  <CenterIcon
                    name="decompress"
                    onClick={() => {
                      bus.emit("tool", "decompress")
                    }}
                  />
                </Show>
              </Show>
              <Show when={userCan("share") && !isShare()}>
                <CenterIcon
                  name="share"
                  onClick={() => {
                    bus.emit("tool", "share")
                  }}
                />
              </Show>
              <CopyLink />
              <Download />
              <CenterIcon
                name="cancel_select"
                onClick={() => {
                  selectAll(false)
                }}
              />
            </HStack>
          </Box>
        </Box>
      </Show>
    </Presence>
  )
}
