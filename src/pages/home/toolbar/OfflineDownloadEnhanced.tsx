import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Heading,
  createDisclosure,
  notificationService,
} from "@hope-ui/solid"
import { SelectWrapper, FolderChooseInput } from "~/components"
import { useFetch, useRouter, useT } from "~/hooks"
import {
  offlineDownload,
  fsGet,
  torrentParse,
  torrentRapidUpload,
  bus,
  handleRespWithNotifySuccess,
  handleResp,
  r,
} from "~/utils"
import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  createMemo,
  createEffect,
} from "solid-js"
import { PResp, TorrentInfo } from "~/types"
import bencode from "bencode"
import crypto from "crypto-js"
import { TorrentFileList } from "./TorrentFileList"

const deletePolicies = [
  "upload_download_stream",
  "delete_on_upload_succeed",
  "delete_on_upload_failed",
  "delete_never",
  "delete_always",
] as const

type DeletePolicy = (typeof deletePolicies)[number]

// Tab 类型
type TabType = "link" | "bt"

function utf8Decode(data: Uint8Array): string {
  return crypto.enc.Utf8.stringify(crypto.lib.WordArray.create(data))
}

function toMagnetUrl(torrentBuffer: Uint8Array) {
  const data = bencode.decode(torrentBuffer as any)
  const infoEncode = bencode.encode(data.info) as unknown as Uint8Array
  const infoHash = crypto
    .SHA1(crypto.lib.WordArray.create(infoEncode))
    .toString()
  let params = {} as any
  if (Number.isInteger(data?.info?.length)) {
    params.xl = data.info.length
  }
  if (data.info.name) {
    params.dn = utf8Decode(data.info.name)
  }
  if (data.announce) {
    params.tr = utf8Decode(data.announce)
  }
  const paramStr = new URLSearchParams(params).toString()
  return `magnet:?xt=urn:btih:${infoHash}${paramStr ? "&" + paramStr : ""}`
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export const OfflineDownloadEnhanced = () => {
  const t = useT()
  const { pathname } = useRouter()

  // 下载工具列表
  const [tools, setTools] = createSignal([] as string[])
  const [toolsLoading, reqTool] = useFetch((): PResp<string[]> => {
    return r.get("/public/offline_download_tools")
  })
  const [tool, setTool] = createSignal("")
  const [deletePolicy, setDeletePolicy] = createSignal<DeletePolicy>(
    "upload_download_stream",
  )

  // 对话框状态
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [activeTab, setActiveTab] = createSignal<TabType>("link")

  // 链接下载状态
  const [linkValue, setLinkValue] = createSignal("")
  const [linkLoading, submitLink] = useFetch(offlineDownload)

  // BT 下载状态
  const [torrentInfo, setTorrentInfo] = createSignal<TorrentInfo | null>(null)
  const [torrentData, setTorrentData] = createSignal<string>("") // Base64 编码
  const [selectedFiles, setSelectedFiles] = createSignal<number[]>([])
  const [btLoading, setBtLoading] = createSignal(false)
  const [parsing, setParsing] = createSignal(false)

  // 保存路径
  const [savePath, setSavePath] = createSignal("")
  const [savePathProvider, setSavePathProvider] = createSignal("")
  const savePathProviderCache = new Map<string, string>()
  let savePathProviderTimer: ReturnType<typeof setTimeout> | undefined

  let savePathProviderRequestSeq = 0
  const clearSavePathProviderTimer = () => {
    if (savePathProviderTimer) {
      clearTimeout(savePathProviderTimer)
      savePathProviderTimer = undefined
    }
  }

  const updateSavePathProvider = (path: string) => {
    const normalizedPath = path.trim()
    clearSavePathProviderTimer()
    if (!normalizedPath) {
      setSavePathProvider("")
      return
    }

    const cachedProvider = savePathProviderCache.get(normalizedPath)
    if (cachedProvider !== undefined) {
      setSavePathProvider(cachedProvider)
      return
    }

    // Clear stale provider immediately to avoid using previous path's provider.
    setSavePathProvider("")
    const requestSeq = ++savePathProviderRequestSeq
    savePathProviderTimer = setTimeout(async () => {
      try {
        const resp = await fsGet(normalizedPath)
        if (requestSeq !== savePathProviderRequestSeq) {
          return
        }
        if (resp.code === 200) {
          const provider = resp.data.provider || ""
          savePathProviderCache.set(normalizedPath, provider)
          setSavePathProvider(provider)
        } else {
          setSavePathProvider("")
        }
      } catch {
        if (requestSeq === savePathProviderRequestSeq) {
          setSavePathProvider("")
        }
      }
    }, 250)
  }

  // 秒传状态
  const [rapidUploading, setRapidUploading] = createSignal(false)
  const [rapidUploadResult, setRapidUploadResult] = createSignal<string>("")
  // 秒传失败后允许回退到普通离线下载
  const [casRapidUploadFailed, setCasRapidUploadFailed] =
    createSignal<boolean>(false)

  // 检测输入中是否包含 ed2k 链接
  const hasEd2kLinks = createMemo(() => {
    return linkValue()
      .split("\n")
      .some((line) => line.trim().toLowerCase().startsWith("ed2k://"))
  })

  // 当有 CAS 信息且秒传尚未失败时，默认使用天翼云秒传（不需要 aria2）
  const shouldUseCasRapidUpload = createMemo(() => {
    return (
      activeTab() === "bt" &&
      !!torrentInfo()?.has_cas &&
      savePathProvider() === "189CloudPC" &&
      !casRapidUploadFailed()
    )
  })

  // 仅在 BT 且包含 CAS 信息时才查询目标路径 provider，减少无效请求。
  createEffect(() => {
    const shouldCheckProvider = activeTab() === "bt" && !!torrentInfo()?.has_cas
    if (!shouldCheckProvider) {
      clearSavePathProviderTimer()
      setSavePathProvider("")
      return
    }
    updateSavePathProvider(savePath())
  })

  // 检测输入中是否包含磁力链
  const hasMagnetLinks = createMemo(() => {
    return linkValue()
      .split("\n")
      .some((line) => line.trim().toLowerCase().startsWith("magnet:?"))
  })

  // 是否应该禁用 SimpleHttp（BT种子/磁力链/ed2k 场景不支持）
  const shouldDisableSimpleHttp = createMemo(() => {
    return activeTab() === "bt" || hasEd2kLinks() || hasMagnetLinks()
  })

  // 可用的工具列表（根据场景过滤）
  const availableTools = createMemo(() => {
    if (shouldDisableSimpleHttp()) {
      return tools().filter((t) => t !== "SimpleHttp")
    }
    return tools()
  })

  // 当 SimpleHttp 被禁用时，自动切换到第一个可用工具
  createEffect(() => {
    if (shouldDisableSimpleHttp() && tool() === "SimpleHttp") {
      const available = availableTools()
      if (available.length > 0) {
        setTool(available[0])
      }
    }
  })

  onMount(async () => {
    const resp = await reqTool()
    handleResp(resp, (data) => {
      setTools(data)
      setTool(data[0])
    })
  })

  // 监听 bus 事件
  const handler = (name: string) => {
    if (name === "offline_download") {
      const currentPath = pathname()
      setSavePath(currentPath)
      onOpen()
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  // 监听从右键菜单触发的 torrent 解析事件
  const torrentHandler = (data: { torrentData: string; info: TorrentInfo }) => {
    setTorrentData(data.torrentData)
    setTorrentInfo(data.info)
    setSelectedFiles(data.info.files.map((_, i) => i))
    setActiveTab("bt")
    const currentPath = pathname()
    setSavePath(currentPath)
    onOpen()
  }
  bus.on("torrent_parsed", torrentHandler)
  onCleanup(() => {
    bus.off("torrent_parsed", torrentHandler)
  })

  // 生成 CAS 文件并下载（纯前端）
  const handleGenerateCASFile = () => {
    const info = torrentInfo()
    if (!info?.has_cas || !info.cas) return
    try {
      const casJson = JSON.stringify({
        md5: info.cas.file_md5,
        name: info.name,
        size: info.total_size,
        sliceMd5: info.cas.slice_md5,
      })
      const casContent = btoa(casJson)
      const blob = new Blob([casContent], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${info.name}.cas`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      notificationService.show({
        status: "success",
        title: t("home.toolbar.offline_download_enhanced.cas_file_generated"),
      })
    } catch (err) {
      notificationService.show({
        status: "danger",
        title: t(
          "home.toolbar.offline_download_enhanced.cas_file_generate_failed",
        ),
        description: String(err),
      })
    }
  }

  // 重置状态
  const resetState = () => {
    clearSavePathProviderTimer()
    savePathProviderRequestSeq += 1
    setLinkValue("")
    setTorrentInfo(null)
    setTorrentData("")
    setSelectedFiles([])
    setSavePathProvider("")
    setRapidUploadResult("")
    setCasRapidUploadFailed(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  onCleanup(() => {
    clearSavePathProviderTimer()
  })

  // 处理 torrent 文件拖拽/选择
  const handleTorrentFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      notificationService.show({
        status: "danger",
        title: t("home.toolbar.offline_download_enhanced.torrent_too_large"),
      })
      return
    }

    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const base64Data = arrayBufferToBase64(buffer)

      const resp = await torrentParse(base64Data)
      handleResp(resp, (data) => {
        setTorrentInfo(data)
        setTorrentData(base64Data)
        setSelectedFiles(data.files.map((_, i) => i))
      })
    } catch (err) {
      notificationService.show({
        status: "danger",
        title: t("home.toolbar.offline_download_enhanced.parse_failed"),
        description: String(err),
      })
    } finally {
      setParsing(false)
    }
  }

  // 拖拽处理
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.dataTransfer?.files.length) return

    if (activeTab() === "bt") {
      // BT Tab: 解析第一个 torrent 文件
      for (const file of e.dataTransfer.files) {
        if (file.name.toLowerCase().endsWith(".torrent")) {
          handleTorrentFile(file)
          return
        }
      }
    } else {
      // Link Tab: 将 torrent 文件转换为磁力链追加到输入框
      const processFiles = async () => {
        const values: string[] = []
        for (const file of e.dataTransfer!.files) {
          if (file.name.toLowerCase().endsWith(".torrent")) {
            try {
              const buffer = await file.arrayBuffer()
              values.push(toMagnetUrl(new Uint8Array(buffer)))
            } catch (err) {
              console.error("Failed to convert torrent:", err)
            }
          }
        }
        if (values.length) {
          setLinkValue((prev) =>
            prev ? prev + "\n" + values.join("\n") : values.join("\n"),
          )
        }
      }
      processFiles()
    }
  }

  // 文件选择处理
  const handleFileSelect = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".torrent"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleTorrentFile(file)
      }
    }
    input.click()
  }

  // 提交链接下载
  const handleLinkSubmit = async () => {
    if (!linkValue().trim()) return
    const urls = linkValue()
      .split("\n")
      .filter((u) => u.trim())
    const resp = await submitLink(savePath(), urls, tool(), deletePolicy())
    handleRespWithNotifySuccess(resp, () => {
      handleClose()
    })
  }

  // 提交 BT 下载
  const handleBtSubmit = async () => {
    const info = torrentInfo()
    if (!info || !torrentData()) return

    setBtLoading(true)
    try {
      // 有 CAS 信息且秒传尚未失败时，默认直接走天翼云秒传
      if (shouldUseCasRapidUpload()) {
        setRapidUploading(true)
        try {
          const resp = await torrentRapidUpload(torrentData(), savePath())
          if (resp.code === 200) {
            setRapidUploadResult("success")
            notificationService.show({
              status: "success",
              title: t(
                "home.toolbar.offline_download_enhanced.rapid_upload_success",
              ),
              description: resp.data.file_name,
            })
            handleClose()
            return
          } else {
            // 秒传失败，标记允许回退到普通离线下载
            setCasRapidUploadFailed(true)
            notificationService.show({
              status: "warning",
              title: t(
                "home.toolbar.offline_download_enhanced.cas_rapid_upload_failed",
              ),
              description: resp.message,
            })
          }
        } catch (err) {
          // 秒传异常，标记允许回退到普通离线下载
          setCasRapidUploadFailed(true)
          notificationService.show({
            status: "danger",
            title: t(
              "home.toolbar.offline_download_enhanced.cas_rapid_upload_failed",
            ),
            description: String(err),
          })
        } finally {
          setRapidUploading(false)
        }
        // 秒传失败后返回，让用户选择是否继续普通离线下载
        return
      }

      // 无 CAS 信息或秒传失败后，走正常离线下载流程
      // SimpleHttp 不支持磁力链/BT 下载
      if (tool() === "SimpleHttp") {
        notificationService.show({
          status: "warning",
          title: t(
            "home.toolbar.offline_download_enhanced.simplehttp_not_supported",
          ),
        })
        return
      }

      // 正常离线下载：将 torrent 转为磁力链提交
      const buffer = Uint8Array.from(atob(torrentData()), (c) =>
        c.charCodeAt(0),
      )
      const magnetUrl = toMagnetUrl(buffer)
      const resp = await offlineDownload(
        savePath(),
        [magnetUrl],
        tool(),
        deletePolicy(),
      )
      handleRespWithNotifySuccess(resp, () => {
        handleClose()
      })
    } finally {
      setBtLoading(false)
    }
  }

  return (
    <Modal
      size="xl"
      blockScrollOnMount={false}
      opened={isOpen()}
      onClose={handleClose}
    >
      <ModalOverlay />
      <ModalContent
        onDragOver={(e: DragEvent) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={handleDrop}
      >
        <ModalHeader>{t("home.toolbar.offline_download")}</ModalHeader>
        <ModalBody>
          {/* Tab 切换 */}
          <HStack spacing="$2" mb="$3">
            <Button
              size="sm"
              variant={activeTab() === "link" ? "solid" : "outline"}
              onClick={() => setActiveTab("link")}
            >
              {t("home.toolbar.offline_download_enhanced.tab_link")}
            </Button>
            <Button
              size="sm"
              variant={activeTab() === "bt" ? "solid" : "outline"}
              onClick={() => setActiveTab("bt")}
            >
              {t("home.toolbar.offline_download_enhanced.tab_bt")}
            </Button>
          </HStack>

          {/* 链接下载 Tab */}
          <Show when={activeTab() === "link"}>
            <VStack spacing="$2" alignItems="stretch">
              <Textarea
                placeholder={t(
                  "home.toolbar.offline_download_enhanced.link_placeholder",
                )}
                value={linkValue()}
                onInput={(e) => setLinkValue(e.currentTarget.value)}
                minH="120px"
              />
              <Text fontSize="$xs" color="$neutral10">
                {t("home.toolbar.offline_download_enhanced.link_tips")}
              </Text>
            </VStack>
          </Show>

          {/* BT 下载 Tab */}
          <Show when={activeTab() === "bt"}>
            <VStack spacing="$3" alignItems="stretch">
              {/* 未解析时显示上传区域 */}
              <Show when={!torrentInfo()}>
                <Box
                  border="2px dashed $neutral7"
                  borderRadius="$md"
                  p="$6"
                  textAlign="center"
                  cursor="pointer"
                  onClick={handleFileSelect}
                  _hover={{ borderColor: "$primary9", bg: "$primary3" }}
                >
                  <Show
                    when={parsing()}
                    fallback={
                      <VStack spacing="$2">
                        <Text fontSize="$lg" fontWeight="$bold">
                          {t(
                            "home.toolbar.offline_download_enhanced.drop_torrent",
                          )}
                        </Text>
                        <Text fontSize="$sm" color="$neutral10">
                          {t(
                            "home.toolbar.offline_download_enhanced.click_to_select",
                          )}
                        </Text>
                      </VStack>
                    }
                  >
                    <Text>
                      {t("home.toolbar.offline_download_enhanced.parsing")}
                    </Text>
                  </Show>
                </Box>
              </Show>

              {/* 已解析时显示文件列表 */}
              <Show when={torrentInfo()}>
                <VStack spacing="$2" alignItems="stretch">
                  {/* 种子信息头部 */}
                  <HStack justifyContent="space-between" alignItems="center">
                    <VStack alignItems="flex-start" spacing="$1">
                      <Heading size="sm" css={{ wordBreak: "break-all" }}>
                        {torrentInfo()!.name}
                      </Heading>
                      <HStack spacing="$2">
                        <Text fontSize="$xs" color="$neutral10">
                          {formatFileSize(torrentInfo()!.total_size)}
                        </Text>
                        <Text fontSize="$xs" color="$neutral10">
                          {torrentInfo()!.files.length}{" "}
                          {t(
                            "home.toolbar.offline_download_enhanced.files_count",
                          )}
                        </Text>
                      </HStack>
                    </VStack>
                    <HStack spacing="$2">
                      <Show when={torrentInfo()!.has_cas}>
                        <Badge colorScheme="success">
                          {t(
                            "home.toolbar.offline_download_enhanced.cas_supported",
                          )}
                        </Badge>
                      </Show>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setTorrentInfo(null)
                          setTorrentData("")
                          setSelectedFiles([])
                        }}
                      >
                        {t("home.toolbar.offline_download_enhanced.reselect")}
                      </Button>
                    </HStack>
                  </HStack>

                  {/* 文件列表 */}
                  <TorrentFileList
                    files={torrentInfo()!.files}
                    selectedFiles={selectedFiles()}
                    onSelectionChange={setSelectedFiles}
                  />
                  <Text fontSize="$xs" color="$neutral9" mt="$1">
                    {t(
                      "home.toolbar.offline_download_enhanced.file_selection_hint",
                    )}
                  </Text>
                </VStack>
              </Show>
            </VStack>
          </Show>

          {/* 公共选项区域 */}
          <VStack spacing="$2" mt="$3" alignItems="stretch">
            {/* 保存路径 */}
            <Box>
              <Text fontSize="$sm" mb="$1" fontWeight="$medium">
                {t("home.toolbar.offline_download_enhanced.save_path")}
              </Text>
              <FolderChooseInput
                value={savePath()}
                onChange={setSavePath}
                id="offline-download-path"
              />
            </Box>

            {/* 下载工具选择（CAS 秒传模式下隐藏） */}
            <Show when={!shouldUseCasRapidUpload()}>
              <Box>
                <Text fontSize="$sm" mb="$1" fontWeight="$medium">
                  {t("home.toolbar.offline_download_enhanced.download_tool")}
                </Text>
                <SelectWrapper
                  value={
                    shouldDisableSimpleHttp() && tool() === "SimpleHttp"
                      ? availableTools()[0] || ""
                      : tool()
                  }
                  onChange={(v) => {
                    if (
                      v !== "SimpleHttp" &&
                      deletePolicy() === "upload_download_stream"
                    ) {
                      setDeletePolicy("delete_on_upload_succeed")
                    }
                    setTool(v)
                  }}
                  options={availableTools().map((t) => ({
                    value: t,
                    label: t,
                  }))}
                />
                <Show
                  when={
                    shouldDisableSimpleHttp() && tools().includes("SimpleHttp")
                  }
                >
                  <Text fontSize="$xs" color="$neutral9" mt="$1">
                    {t(
                      "home.toolbar.offline_download_enhanced.simplehttp_not_supported",
                    )}
                  </Text>
                </Show>
              </Box>

              {/* 删除策略 */}
              <Box>
                <Text fontSize="$sm" mb="$1" fontWeight="$medium">
                  {t("home.toolbar.offline_download_enhanced.delete_policy")}
                </Text>
                <SelectWrapper
                  value={deletePolicy()}
                  onChange={(v) => setDeletePolicy(v as DeletePolicy)}
                  options={deletePolicies
                    .filter((policy) =>
                      policy === "upload_download_stream"
                        ? tool() === "SimpleHttp"
                        : true,
                    )
                    .map((policy) => ({
                      value: policy,
                      label: t(`home.toolbar.delete_policy.${policy}`),
                    }))}
                />
              </Box>
            </Show>

            {/* CAS 秒传提示 */}
            <Show when={shouldUseCasRapidUpload()}>
              <Box
                p="$2"
                bg="$success3"
                borderRadius="$sm"
                border="1px solid $success7"
              >
                <Text fontSize="$sm" color="$success11">
                  {t(
                    "home.toolbar.offline_download_enhanced.cas_rapid_upload_mode",
                  )}
                </Text>
              </Box>
              {/* 生成 CAS 文件按钮 */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateCASFile}
              >
                {t("home.toolbar.offline_download_enhanced.generate_cas_file")}
              </Button>
            </Show>

            {/* CAS 秒传失败后，提示用户可继续普通离线下载 */}
            <Show
              when={
                activeTab() === "bt" &&
                torrentInfo()?.has_cas &&
                casRapidUploadFailed()
              }
            >
              <Box
                p="$2"
                bg="$warning3"
                borderRadius="$sm"
                border="1px solid $warning7"
              >
                <Text fontSize="$sm" color="$warning11">
                  {t(
                    "home.toolbar.offline_download_enhanced.cas_failed_fallback_hint",
                  )}
                </Text>
              </Box>
            </Show>

            <Show
              when={
                activeTab() === "bt" && torrentInfo() && !torrentInfo()!.has_cas
              }
            >
              <Box
                p="$2"
                bg="$warning3"
                borderRadius="$sm"
                border="1px solid $warning7"
              >
                <Text fontSize="$sm" color="$warning11">
                  {t("home.toolbar.offline_download_enhanced.no_cas_hint")}
                </Text>
              </Box>
            </Show>

            {/* ed2k 链接工具提示 */}
            <Show
              when={
                activeTab() === "link" &&
                hasEd2kLinks() &&
                (tool() === "aria2" ||
                  tool() === "SimpleHttp" ||
                  tool() === "qBittorrent")
              }
            >
              <Box
                p="$2"
                bg="$warning3"
                borderRadius="$sm"
                border="1px solid $warning7"
              >
                <Text fontSize="$sm" color="$warning11">
                  {t("home.toolbar.offline_download_enhanced.ed2k_tool_hint")}
                </Text>
              </Box>
            </Show>
          </VStack>
        </ModalBody>

        <ModalFooter display="flex" gap="$2">
          <Button onClick={handleClose} colorScheme="neutral">
            {t("global.cancel")}
          </Button>
          <Show when={activeTab() === "link"}>
            <Button
              loading={linkLoading()}
              onClick={handleLinkSubmit}
              disabled={!linkValue().trim()}
            >
              {t("home.toolbar.offline_download_enhanced.start_download")}
            </Button>
          </Show>
          <Show when={activeTab() === "bt"}>
            <Button
              loading={btLoading() || rapidUploading()}
              onClick={handleBtSubmit}
              disabled={!torrentInfo()}
            >
              <Show
                when={shouldUseCasRapidUpload() && !rapidUploading()}
                fallback={t(
                  "home.toolbar.offline_download_enhanced.start_download",
                )}
              >
                {t(
                  "home.toolbar.offline_download_enhanced.rapid_upload_and_download",
                )}
              </Show>
            </Button>
          </Show>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
