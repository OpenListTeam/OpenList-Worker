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
  Text,
  VStack,
  Radio,
  RadioGroup,
  Input,
} from "@hope-ui/solid"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import {
  bus,
  fsBatchRename,
  handleRespWithNotifySuccess,
  notify,
  validateFilename,
} from "~/utils"
import { createSignal, For, onCleanup, Show } from "solid-js"
import { selectedObjs } from "~/store"
import { RenameObj } from "~/types"
import { RenameItem } from "~/pages/home/toolbar/RenameItem"

export const BatchRename = () => {
  const {
    isOpen: isPreviewModalOpen,
    onOpen: openPreviewModal,
    onClose: closePreviewModal,
  } = createDisclosure()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [loading, ok] = useFetch(fsBatchRename)
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [type, setType] = createSignal("1")
  const [srcName, setSrcName] = createSignal("")
  const [newName, setNewName] = createSignal("")
  const [paddingZeros, setPaddingZeros] = createSignal("")
  const [newNameType, setNewNameType] = createSignal("string")
  const [matchNames, setMatchNames] = createSignal<RenameObj[]>([])
  const [validationErrorSrc, setValidationErrorSrc] = createSignal<string>("")
  const [validationErrorNew, setValidationErrorNew] = createSignal<string>("")
  const t = useT()

  const validateRegex = (pattern: string) => {
    try {
      // eslint-disable-next-line no-new
      new RegExp(pattern)
      return { valid: true as const }
    } catch (e) {
      return { valid: false as const, error: "invalid_regex" }
    }
  }

  const handleInputSrc = (newValue: string) => {
    setSrcName(newValue)
    if (type() === "2" || type() === "3") {
      const validation = validateFilename(newValue)
      setValidationErrorSrc(validation.valid ? "" : validation.error || "")
    } else if (type() === "1") {
      const validation = validateRegex(newValue)
      setValidationErrorSrc(validation.valid ? "" : validation.error || "")
    } else {
      setValidationErrorSrc("")
    }
  }

  const handleInputNew = (newValue: string) => {
    setNewName(newValue)
    if (type() === "2" || type() === "3") {
      const validation = validateFilename(newValue)
      setValidationErrorNew(validation.valid ? "" : validation.error || "")
    } else {
      setValidationErrorNew("")
    }
  }

  const itemProps = () => {
    return {
      fontWeight: "bold",
      fontSize: "$sm",
      color: "$neutral11",
      textAlign: "left" as any,
      cursor: "pointer",
    }
  }
  const handler = (name: string) => {
    if (name === "batchRename") {
      onOpen()
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  const submit = () => {
    if (!srcName()) {
      // Check if both input values are not empty
      notify.warning(t("global.empty_input"))
      return
    }
    if (type() === "1") {
      const validationSrc = validateRegex(srcName())
      if (!validationSrc.valid) {
        notify.warning(t(`global.${validationSrc.error}`))
        return
      }
    }
    if (type() === "2" || type() === "3") {
      const validationSrc = validateFilename(srcName())
      if (!validationSrc.valid) {
        notify.warning(t(`global.${validationSrc.error}`))
        return
      }
      const validationNew = validateFilename(newName())
      if (!validationNew.valid) {
        notify.warning(t(`global.${validationNew.error}`))
        return
      }
    }
    let matchNames: RenameObj[]
    if (type() === "1") {
      const replaceRegexp = new RegExp(srcName(), "g")

      matchNames = selectedObjs()
        .filter((obj) => obj.name.match(srcName()))
        .map((obj) => {
          const created = new Date(obj.created)
          const modified = new Date(obj.modified)
          const renameObj: RenameObj = {
            src_name: obj.name,
            new_name: obj.name
              .replace(replaceRegexp, newName())
              .replace(
                "{created_year}",
                created.getFullYear().toString().padStart(4, "0"),
              )
              .replace(
                "{created_month}",
                (created.getMonth() + 1).toString().padStart(2, "0"),
              )
              .replace(
                "{created_date}",
                created.getDate().toString().padStart(2, "0"),
              )
              .replace(
                "{created_hour}",
                created.getHours().toString().padStart(2, "0"),
              )
              .replace(
                "{created_minute}",
                created.getMinutes().toString().padStart(2, "0"),
              )
              .replace(
                "{created_second}",
                created.getSeconds().toString().padStart(2, "0"),
              )
              .replace(
                "{modified_year}",
                modified.getFullYear().toString().padStart(4, "0"),
              )
              .replace(
                "{modified_month}",
                (modified.getMonth() + 1).toString().padStart(2, "0"),
              )
              .replace(
                "{modified_date}",
                modified.getDate().toString().padStart(2, "0"),
              )
              .replace(
                "{modified_hour}",
                modified.getHours().toString().padStart(2, "0"),
              )
              .replace(
                "{modified_minute}",
                modified.getMinutes().toString().padStart(2, "0"),
              )
              .replace(
                "{modified_second}",
                modified.getSeconds().toString().padStart(2, "0"),
              ),
          }
          return renameObj
        })
    } else if (type() === "2") {
      let tempNum = newName()
      const hasNumberPlaceholder = srcName().includes("{number}")
      const paddingLength = parseInt(paddingZeros()) || 0

      matchNames = selectedObjs().map((obj) => {
        const lastDotIndex = obj.name.lastIndexOf(".")
        const suffix =
          lastDotIndex !== -1 ? obj.name.substring(lastDotIndex) : ""
        const paddedNum =
          paddingLength > 0 ? tempNum.padStart(paddingLength, "0") : tempNum

        let newFileName: string
        if (hasNumberPlaceholder) {
          newFileName = srcName().replace("{number}", paddedNum) + suffix
        } else {
          newFileName = srcName() + paddedNum + suffix
        }

        const renameObj: RenameObj = {
          src_name: obj.name,
          new_name: newFileName,
        }
        tempNum = (parseInt(tempNum) + 1)
          .toString()
          .padStart(tempNum.length, "0")
        return renameObj
      })
    } else {
      matchNames = selectedObjs()
        .filter((obj) => obj.name.indexOf(srcName()) !== -1)
        .map((obj) => {
          const renameObj: RenameObj = {
            src_name: obj.name,
            new_name: obj.name.replace(srcName(), newName()),
          }
          return renameObj
        })
    }

    setMatchNames(matchNames)
    openPreviewModal()
    onClose()
  }

  return (
    <>
      <Modal
        blockScrollOnMount={false}
        opened={isOpen()}
        onClose={onClose}
        initialFocus="#modal-input1"
        size={{
          "@initial": "xs",
          "@md": "md",
        }}
      >
        <ModalOverlay />
        <ModalContent>
          {/* <ModalCloseButton /> */}
          <ModalHeader>{t("home.toolbar.batch_rename")}</ModalHeader>
          <ModalBody>
            <RadioGroup
              defaultValue="1"
              onChange={(event: string) => {
                setType(event)
                if (event === "1" || event === "3") {
                  setNewNameType("string")
                } else if (event === "2") {
                  setNewNameType("number")
                }
                // Clear validation errors when switching type
                setValidationErrorSrc("")
                setValidationErrorNew("")
              }}
            >
              <HStack spacing="$4">
                <Radio value="1">{t("home.toolbar.regex_rename")}</Radio>
                <Radio value="2">{t("home.toolbar.sequential_renaming")}</Radio>
                <Radio value="3">{t("home.toolbar.find_replace")}</Radio>
              </HStack>
            </RadioGroup>
            <VStack spacing="$2">
              <p style={{ margin: "10px 0" }}>
                <Show when={type() === "1"}>
                  {t("home.toolbar.regular_rename")}
                </Show>
                <Show when={type() === "2"}>
                  {t("home.toolbar.sequential_renaming_desc")}
                </Show>
                <Show when={type() === "3"}>
                  {t("home.toolbar.find_replace_desc")}
                </Show>
              </p>
              <Input
                id="modal-input1" // Update id to "modal-input1" for first input
                type={"string"}
                value={srcName()} // Update value to value1 for first input
                invalid={!!validationErrorSrc()}
                onInput={(e) => {
                  handleInputSrc(e.currentTarget.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    submit()
                  }
                }}
              />
              <Show when={validationErrorSrc()}>
                <Text color="$danger9" fontSize="$sm">
                  {t(`global.${validationErrorSrc()}`)}
                </Text>
              </Show>
              <Input
                id="modal-input2" // Add second input with id "modal-input2"
                type={newNameType()}
                value={newName()} // Bind value to value2 for second input
                invalid={!!validationErrorNew()}
                onInput={(e) => {
                  handleInputNew(e.currentTarget.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    submit()
                  }
                }}
              />
              <Show when={validationErrorNew()}>
                <Text color="$danger9" fontSize="$sm">
                  {t(`global.${validationErrorNew()}`)}
                </Text>
              </Show>
              <Show when={type() === "2"}>
                <Input
                  id="modal-input3"
                  type="number"
                  min="0"
                  step="1"
                  placeholder={t(
                    "home.toolbar.sequential_renaming_input3_placeholder",
                  )}
                  value={paddingZeros()}
                  onInput={(e) => {
                    setPaddingZeros(e.currentTarget.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      submit()
                    }
                  }}
                />
              </Show>
            </VStack>
          </ModalBody>
          <ModalFooter display="flex" gap="$2">
            <Button
              onClick={() => {
                setType("1")
                setNewNameType("string")
                setPaddingZeros("")
                setValidationErrorSrc("")
                setValidationErrorNew("")
                onClose()
              }}
              colorScheme="neutral"
            >
              {t("global.cancel")}
            </Button>
            <Button
              onClick={() => submit()}
              disabled={
                type() === "2" || type() === "3"
                  ? !srcName() ||
                    !newName() ||
                    !!validationErrorSrc() ||
                    !!validationErrorNew()
                  : !srcName()
              }
            >
              {t("global.ok")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        size="xl"
        opened={isPreviewModalOpen()}
        onClose={closePreviewModal}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t("home.toolbar.regex_rename_preview")}</ModalHeader>
          <ModalBody>
            <VStack class="list" w="$full" spacing="$1">
              <HStack class="title" w="$full" p="$2">
                <Text w={{ "@initial": "50%", "@md": "50%" }} {...itemProps()}>
                  {t("home.toolbar.regex_rename_preview_old_name")}
                </Text>
                <Text w={{ "@initial": "50%", "@md": "50%" }} {...itemProps()}>
                  {t("home.toolbar.regex_rename_preview_new_name")}
                </Text>
              </HStack>
              <For each={matchNames()}>
                {(obj, i) => {
                  return <RenameItem obj={obj} index={i()} />
                }}
              </For>
            </VStack>
          </ModalBody>
          <ModalFooter display="flex" gap="$2">
            <Button
              onClick={() => {
                setMatchNames([])
                setType("1")
                setNewNameType("string")
                setPaddingZeros("")
                setValidationErrorSrc("")
                setValidationErrorNew("")
                closePreviewModal()
                onClose()
              }}
              colorScheme="neutral"
            >
              {t("global.cancel")}
            </Button>
            <Button
              onClick={() => {
                setMatchNames([])
                closePreviewModal()
                onOpen()
              }}
              colorScheme="neutral"
            >
              {t("global.back")}
            </Button>
            <Button
              loading={loading()}
              onClick={async () => {
                const resp = await ok(pathname(), matchNames())
                handleRespWithNotifySuccess(resp, () => {
                  setMatchNames([])
                  setSrcName("")
                  setNewName("")
                  setPaddingZeros("")
                  setType("1")
                  setNewNameType("string")
                  setValidationErrorSrc("")
                  setValidationErrorNew("")
                  refresh()
                  onClose()
                  closePreviewModal()
                })
              }}
              disabled={matchNames().length == 0}
            >
              {t("global.ok")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
