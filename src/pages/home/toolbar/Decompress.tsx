import {
  Checkbox,
  createDisclosure,
  HStack,
  Input,
  Text,
  VStack,
} from "@hope-ui/solid"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import { bus, fsArchiveDecompress, handleRespWithNotifySuccess } from "~/utils"
import { batch, createSignal, onCleanup } from "solid-js"
import { ModalFolderChoose } from "~/components"
import { selectedObjs } from "~/store"
import { CreateFolderButton } from "./CopyMove"

export const Decompress = () => {
  const t = useT()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [loading, ok] = useFetch(fsArchiveDecompress)
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [innerPath, setInnerPath] = createSignal("")
  const [archivePass, setArchivePass] = createSignal("")
  const [cacheFull, setCacheFull] = createSignal(true)
  const [putIntoNewDir, setPutIntoNewDir] = createSignal(false)
  const [overwrite, setOverwrite] = createSignal(false)
  const [srcPath, setSrcPath] = createSignal("")
  const [srcName, setSrcName] = createSignal<string[]>()
  const handler = (name: string) => {
    if (name === "decompress") {
      const path = pathname()
      batch(() => {
        setSrcPath(path)
        setSrcName(selectedObjs().map((o) => o.name))
        setCacheFull(true)
        setInnerPath("/")
        setArchivePass("")
      })
      onOpen()
    }
  }
  const extractHandler = (args: string) => {
    const { inner, pass } = JSON.parse(args)
    const path = pathname()
    const idx = path.lastIndexOf("/")
    batch(() => {
      setSrcPath(path.slice(0, idx))
      setSrcName([path.slice(idx + 1)])
      setCacheFull(false)
      setInnerPath(inner)
      setArchivePass(pass)
    })
    onOpen()
  }
  bus.on("tool", handler)
  bus.on("extract", extractHandler)
  onCleanup(() => {
    bus.off("tool", handler)
    bus.off("extract", extractHandler)
  })
  const header = () => {
    if (innerPath() === "/") {
      return t("home.toolbar.choose_dst_folder")
    }
    return t("home.toolbar.archive.extract_header", { path: innerPath() })
  }
  return (
    <ModalFolderChoose
      header={header()}
      opened={isOpen()}
      onClose={onClose}
      loading={loading()}
      defaultValue={srcPath}
      headerSlot={(handler) => <CreateFolderButton handler={handler} />}
      footerSlot={
        <VStack w="$full" spacing="$2">
          <Checkbox
            mr="auto"
            checked={overwrite()}
            onChange={() => setOverwrite(!overwrite())}
          >
            {t("home.conflict_policy.overwrite_existing")}
          </Checkbox>
        </VStack>
      }
      onSubmit={async (dst) => {
        const resp = await ok(
          srcPath(),
          dst,
          srcName(),
          archivePass(),
          innerPath(),
          cacheFull(),
          putIntoNewDir(),
          overwrite(),
        )
        handleRespWithNotifySuccess(resp, () => {
          refresh()
          onClose()
        })
      }}
    >
      <VStack spacing="$1" alignItems="flex-start">
        <HStack width="100%" spacing="$1">
          <Text size="sm" css={{ whiteSpace: "nowrap" }}>
            {t(`home.toolbar.decompress-pass`)}
          </Text>
          <Input
            value={archivePass()}
            onInput={(e: any) => setArchivePass(e.target.value as string)}
            size="sm"
            flexGrow="1"
          />
        </HStack>
        <Checkbox
          checked={cacheFull()}
          onChange={(e: any) => setCacheFull(e.target.checked as boolean)}
        >
          {t(`home.toolbar.decompress-cache-full`)}
        </Checkbox>
        <Checkbox
          checked={putIntoNewDir()}
          onChange={(e: any) => setPutIntoNewDir(e.target.checked as boolean)}
        >
          {t(`home.toolbar.decompress-put-into-new`)}
        </Checkbox>
        <div />
      </VStack>
    </ModalFolderChoose>
  )
}
