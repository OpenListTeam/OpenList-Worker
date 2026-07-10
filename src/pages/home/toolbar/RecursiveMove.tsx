import {
  Button,
  createDisclosure,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleOption,
  SimpleSelect,
} from "@hope-ui/solid"
import { ModalFolderChoose } from "~/components"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import { bus, fsRecursiveMove, handleRespWithNotifySuccess } from "~/utils"
import { createSignal, onCleanup } from "solid-js"
import { CreateFolderButton } from "./CopyMove"

export const RecursiveMove = () => {
  const {
    isOpen: isConfirmModalOpen,
    onOpen: openConfirmModal,
    onClose: closeConfirmModal,
  } = createDisclosure()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [loading, ok] = useFetch(fsRecursiveMove)
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [conflictPolicy, setConflictPolicy] = createSignal("cancel")
  const handler = (name: string) => {
    if (name === "recursiveMove") {
      openConfirmModal()
      setConflictPolicy("cancel")
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })
  const t = useT()
  return (
    <>
      <Modal
        blockScrollOnMount={false}
        opened={isConfirmModalOpen()}
        onClose={() => closeConfirmModal()}
        size={{
          "@initial": "xs",
          "@md": "md",
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t("home.toolbar.recursive_move")}</ModalHeader>
          <ModalBody>
            <p>{t("home.toolbar.recursive_move_directory-tips")}</p>
          </ModalBody>
          <ModalFooter display="flex" gap="$2">
            <Button onClick={() => closeConfirmModal()} colorScheme="neutral">
              {t("global.cancel")}
            </Button>
            <Button
              onClick={() => {
                closeConfirmModal()
                onOpen()
              }}
              colorScheme="danger"
            >
              {t("global.confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ModalFolderChoose
        header={t("home.toolbar.choose_dst_folder")}
        opened={isOpen()}
        onClose={onClose}
        loading={loading()}
        headerSlot={(handler) => <CreateFolderButton handler={handler} />}
        footerSlot={
          <HStack mr="auto" flex="0.8" spacing="$1">
            <SimpleSelect
              value={conflictPolicy()}
              onChange={(value) => setConflictPolicy(value)}
            >
              <SimpleOption value="cancel">
                {t("home.conflict_policy.cancel_if_exists")}
              </SimpleOption>
              <SimpleOption value="overwrite">
                {t("home.conflict_policy.overwrite_existing")}
              </SimpleOption>
              <SimpleOption value="skip">
                {t("home.conflict_policy.skip_existing")}
              </SimpleOption>
            </SimpleSelect>
          </HStack>
        }
        onSubmit={async (dst) => {
          const resp = await ok(pathname(), dst, conflictPolicy())
          handleRespWithNotifySuccess(resp, () => {
            refresh()
            onClose()
          })
        }}
      />
    </>
  )
}
