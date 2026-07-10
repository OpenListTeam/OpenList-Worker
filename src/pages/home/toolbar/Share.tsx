import { useFetch, useRouter, useT, useUtil } from "~/hooks"
import {
  bus,
  getExpireDate,
  handleResp,
  makeTemplateData,
  matchTemplate,
  r,
  randomPwd,
} from "~/utils"
import { batch, createSignal, Match, onCleanup, Switch } from "solid-js"
import {
  Button,
  createDisclosure,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Textarea,
  VStack,
} from "@hope-ui/solid"
import {
  ExtractFolder,
  OrderBy,
  OrderDirection,
  PResp,
  Share as ShareType,
  ShareInfo,
} from "~/types"
import { createStore } from "solid-js/store"
import { getSetting, me, selectedObjs } from "~/store"
import { TbRefresh } from "solid-icons/tb"
import { SelectOptions, MultiPathInput } from "~/components"

export const Share = () => {
  const t = useT()
  const [link, setLink] = createSignal("")
  const { pathname } = useRouter()
  const handler = (name: string) => {
    if (name === "share") {
      batch(() => {
        setLink("")
        setExpireString("")
        setExpireValid(true)
        const paths = selectedObjs().map((obj) => {
          const split =
            pathname().endsWith("/") || obj.name.startsWith("/") ? "" : "/"
          return `${me().base_path}${pathname()}${split}${obj.name}`
        })
        setShare({
          files: paths,
          expires: null,
          pwd: "",
          max_accessed: 0,
          order_by: OrderBy.None,
          order_direction: OrderDirection.None,
          extract_folder: ExtractFolder.None,
          remark: "",
          readme: "",
          header: "",
        } as ShareType)
      })
      onOpen()
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })
  const { isOpen, onOpen, onClose } = createDisclosure()
  const { copy } = useUtil()
  const [expireString, setExpireString] = createSignal("")
  const [expireValid, setExpireValid] = createSignal(true)
  const [share, setShare] = createStore<ShareType>({} as ShareType)
  const [okLoading, ok] = useFetch((): PResp<ShareInfo> => {
    return r.post(`/share/create`, share)
  })
  return (
    <Modal
      blockScrollOnMount={false}
      opened={isOpen()}
      onClose={onClose}
      size={{
        "@initial": "xs",
        "@md": "md",
        "@lg": "lg",
        "@xl": "xl",
        "@2xl": "2xl",
      }}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t("home.toolbar.share")}</ModalHeader>
        <Switch
          fallback={
            <>
              <ModalBody>
                <Textarea variant="filled" value={link()} readonly />
              </ModalBody>
              <ModalFooter display="flex" gap="$2">
                <Button
                  colorScheme="primary"
                  onClick={() => {
                    copy(link())
                  }}
                >
                  {t("shares.copy_msg")}
                </Button>
                <Button colorScheme="info" onClick={onClose}>
                  {t("global.confirm")}
                </Button>
              </ModalFooter>
            </>
          }
        >
          <Match when={link() === ""}>
            <ModalBody>
              <VStack spacing="$1" alignItems="flex-start">
                <Text size="sm">{t("shares.id")}</Text>
                <Input
                  size="sm"
                  value={share.id ?? ""}
                  maxLength={64}
                  placeholder={t("shares.id_placeholder")}
                  onInput={(e) => {
                    setShare("id", e.currentTarget.value)
                  }}
                />
                <Text size="sm">{t("shares.remark")}</Text>
                <Textarea
                  size="sm"
                  value={share.remark}
                  onInput={(e) => {
                    setShare("remark", e.currentTarget.value)
                  }}
                />
                <Text size="sm">{t("shares.extract_folder")}</Text>
                <Select
                  size="sm"
                  value={share.extract_folder}
                  onChange={(e) => {
                    setShare("extract_folder", e)
                  }}
                >
                  <SelectOptions
                    options={[
                      {
                        key: ExtractFolder.Front,
                        label: t("shares.extract_folders.front"),
                      },
                      {
                        key: ExtractFolder.Back,
                        label: t("shares.extract_folders.back"),
                      },
                    ]}
                  />
                </Select>
                <Text size="sm">{t("shares.order_by")}</Text>
                <Select
                  size="sm"
                  value={share.order_by}
                  onChange={(e) => {
                    setShare("order_by", e)
                  }}
                >
                  <SelectOptions
                    options={[
                      { key: OrderBy.Name, label: t("shares.order_bys.name") },
                      { key: OrderBy.Size, label: t("shares.order_bys.size") },
                      {
                        key: OrderBy.Modified,
                        label: t("shares.order_bys.modified"),
                      },
                    ]}
                  />
                </Select>
                <Text size="sm">{t("shares.order_direction")}</Text>
                <Select
                  size="sm"
                  value={share.order_direction}
                  onChange={(e) => {
                    setShare("order_direction", e)
                  }}
                >
                  <SelectOptions
                    options={[
                      {
                        key: OrderDirection.Asc,
                        label: t("shares.order_directions.asc"),
                      },
                      {
                        key: OrderDirection.Desc,
                        label: t("shares.order_directions.desc"),
                      },
                    ]}
                  />
                </Select>
                <Text size="sm">{t("shares.pwd")}</Text>
                <HStack spacing="$1" w="$full">
                  <Input
                    size="sm"
                    value={share.pwd}
                    onInput={(e) => {
                      setShare("pwd", e.currentTarget.value)
                    }}
                  />
                  <IconButton
                    colorScheme="neutral"
                    size="sm"
                    aria-label="random"
                    icon={<TbRefresh />}
                    onClick={() => {
                      setShare("pwd", randomPwd())
                    }}
                  />
                </HStack>
                <Text size="sm">{t("shares.max_accessed")}</Text>
                <Input
                  type="number"
                  size="sm"
                  value={share.max_accessed}
                  onInput={(e) => {
                    setShare("max_accessed", parseInt(e.currentTarget.value))
                  }}
                />
                <Text size="sm">{t("shares.expires")}</Text>
                <Input
                  size="sm"
                  invalid={!expireValid()}
                  value={expireString()}
                  placeholder="yyyy-MM-dd HH:mm:ss or +1w1d1H1m1s1ms"
                  onInput={(e) => {
                    setExpireString(e.currentTarget.value)
                    if (e.currentTarget.value === "") {
                      setExpireValid(true)
                      setShare("expires", null)
                      return
                    }
                    const date = getExpireDate(e.currentTarget.value)
                    if (isNaN(date.getTime())) {
                      setExpireValid(false)
                    } else {
                      setExpireValid(true)
                      setShare("expires", date.toISOString())
                    }
                  }}
                />
                <Text size="sm">{t("shares.readme")}</Text>
                <Textarea
                  size="sm"
                  value={share.readme}
                  onInput={(e) => {
                    setShare("readme", e.currentTarget.value)
                  }}
                />
                <Text size="sm">{t("shares.header")}</Text>
                <Textarea
                  size="sm"
                  value={share.header}
                  onInput={(e) => {
                    setShare("header", e.currentTarget.value)
                  }}
                />
              </VStack>
            </ModalBody>
            <ModalFooter display="flex" gap="$2">
              <Button colorScheme="neutral" onClick={onClose}>
                {t("global.cancel")}
              </Button>
              <Button
                colorScheme="info"
                disabled={!expireValid()}
                loading={okLoading()}
                onClick={async () => {
                  const resp = await ok()
                  handleResp(resp, (data) => {
                    const templateData = makeTemplateData(data, {
                      site_title: getSetting("site_title"),
                    })
                    const msg = matchTemplate(
                      getSetting("share_summary_content"),
                      templateData,
                    )
                    setLink(msg)
                  })
                }}
              >
                {t("global.confirm")}
              </Button>
            </ModalFooter>
          </Match>
        </Switch>
      </ModalContent>
    </Modal>
  )
}
