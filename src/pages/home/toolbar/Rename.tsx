import { Checkbox, createDisclosure } from "@hope-ui/solid"
import { createSignal, onCleanup, Show } from "solid-js"
import { ModalInput } from "~/components"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import { oneChecked, selectedObjs } from "~/store"
import { bus, fsRename, handleRespWithNotifySuccess, pathJoin } from "~/utils"

export const Rename = () => {
  const t = useT()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [loading, ok] = useFetch(fsRename)
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [overwrite, setOverwrite] = createSignal(false)
  const handler = (name: string) => {
    if (name === "rename") {
      if (!oneChecked()) {
        bus.emit("tool", "batchRename")
        return
      }
      onOpen()
      setOverwrite(false)
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })
  return (
    <Show when={isOpen()}>
      <ModalInput
        title="home.toolbar.input_new_name"
        validateFilename={true}
        footerSlot={
          <Checkbox
            mr="auto"
            checked={overwrite()}
            onChange={() => {
              setOverwrite(!overwrite())
            }}
          >
            {t("home.conflict_policy.overwrite_existing")}
          </Checkbox>
        }
        isRenamingFile={!selectedObjs()[0].is_dir}
        opened={isOpen()}
        onClose={onClose}
        defaultValue={selectedObjs()[0]?.name ?? ""}
        loading={loading()}
        onSubmit={async (name) => {
          const resp = await ok(
            pathJoin(pathname(), selectedObjs()[0].name),
            name,
            overwrite(),
          )
          handleRespWithNotifySuccess(resp, () => {
            refresh()
            onClose()
          })
        }}
      />
    </Show>
  )
}
