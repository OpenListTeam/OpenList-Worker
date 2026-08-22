import {
  Badge,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  Switch as HopeSwitch,
  Text,
  useColorModeValue,
  VStack,
} from "@hope-ui/solid"
import { createSignal, Show } from "solid-js"
import { FiUploadCloud } from "solid-icons/fi"
import { FaSolidPuzzlePiece } from "solid-icons/fa"
import { useManageTitle, useRouter, useT } from "~/hooks"
import { PluginItem, Resp } from "~/types"
import { handleResp, notify, parsePluginZip, pluginEngine, r } from "~/utils"

const AddPlugin = () => {
  const t = useT()
  const { back, to } = useRouter()
  useManageTitle("plugins.actions.install")

  const [loading, setLoading] = createSignal(false)
  const [installMethod, setInstallMethod] = createSignal<"zip" | "url">("zip")

  // ZIP upload state
  const [zipFile, setZipFile] = createSignal<File | null>(null)
  const [zipParsedManifest, setZipParsedManifest] =
    createSignal<Partial<PluginItem> | null>(null)
  const [isDragging, setIsDragging] = createSignal(false)

  // URL state
  const [manifestUrl, setManifestUrl] = createSignal("")

  // High privilege state
  const [highPrivilege, setHighPrivilege] = createSignal(false)

  const borderColor = useColorModeValue("$neutral4", "$neutral5")
  const dropBg = useColorModeValue("$neutral1", "$neutral2")

  const handleFileChange = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      notify.error("请选择 .zip 格式的插件压缩包")
      return
    }
    setZipFile(file)
    setLoading(true)
    try {
      const extracted = await parsePluginZip(file)
      setZipParsedManifest(extracted.manifest)
      if (extracted.manifest.high_privilege) {
        setHighPrivilege(true)
      }
      notify.success("ZIP 插件包解析成功")
    } catch (err: any) {
      notify.error("ZIP 解析失败: " + err.message)
      setZipFile(null)
      setZipParsedManifest(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async () => {
    setLoading(true)
    try {
      if (installMethod() === "zip") {
        const manifest = zipParsedManifest()
        if (!manifest || !manifest.id) {
          notify.warning("请先上传有效的插件 ZIP 文件")
          return
        }
        const resp: Resp<PluginItem> = await r.post("/admin/plugin/install", {
          ...manifest,
          high_privilege: highPrivilege(),
          enabled: true,
        })
        handleResp(resp, (installed) => {
          if (installed.enabled) {
            pluginEngine.loadPlugin(installed)
          }
          notify.success(t("global.add") + " " + t("global.success"))
          to("/@manage/plugins")
        })
      } else {
        const url = manifestUrl().trim()
        if (!url) {
          notify.warning("请输入插件清单 Manifest URL")
          return
        }
        const resp: Resp<PluginItem> = await r.post("/admin/plugin/install", {
          manifest_url: url,
          high_privilege: highPrivilege(),
        })
        handleResp(resp, (installed) => {
          if (installed.enabled) {
            pluginEngine.loadPlugin(installed)
          }
          notify.success(t("global.add") + " " + t("global.success"))
          to("/@manage/plugins")
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <VStack spacing="$5" alignItems="start" w="$full" maxW="$3xl">
      <Heading mb="$1">{t("plugins.actions.install")}</Heading>

      {/* 1. Install Method Select */}
      <FormControl
        w="$full"
        display="flex"
        flexDirection="column"
        alignItems="start"
        gap="$1_5"
      >
        <FormLabel for="install_method">
          {t("plugins.install_modal.install_type")}
        </FormLabel>
        <Select
          id="install_method"
          value={installMethod()}
          onChange={(v: any) => setInstallMethod(v)}
        >
          <SelectTrigger w="$full" maxW="$sm">
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectListbox>
              <SelectOption value="zip">
                <SelectOptionText>
                  {t("plugins.install_modal.zip_tab")}
                </SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
              <SelectOption value="url">
                <SelectOptionText>
                  {t("plugins.install_modal.url_tab")}
                </SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
            </SelectListbox>
          </SelectContent>
        </Select>
      </FormControl>

      {/* 2. ZIP Mode */}
      <Show
        when={installMethod() === "zip"}
        fallback={
          <FormControl
            w="$full"
            display="flex"
            flexDirection="column"
            alignItems="start"
            gap="$1_5"
            required
          >
            <FormLabel for="manifest_url">
              {t("plugins.install_modal.url_label")}
            </FormLabel>
            <Input
              id="manifest_url"
              w="$full"
              maxW="$2xl"
              placeholder={t("plugins.install_modal.url_placeholder")}
              value={manifestUrl()}
              onInput={(e: any) => setManifestUrl(e.target.value)}
            />
            <FormHelperText color="$neutral10" fontSize="$xs" mt="$0_5">
              {t("plugins.install_modal.url_help")}
            </FormHelperText>
          </FormControl>
        }
      >
        <FormControl
          w="$full"
          display="flex"
          flexDirection="column"
          alignItems="start"
          gap="$1_5"
          required
        >
          <FormLabel>{t("plugins.install_modal.zip_file_label")}</FormLabel>
          <Box
            w="$full"
            maxW="$2xl"
            p="$6"
            rounded="$md"
            borderWidth="2px"
            borderStyle="dashed"
            borderColor={isDragging() ? "$accent8" : borderColor()}
            bgColor={isDragging() ? "$accent1" : dropBg()}
            textAlign="center"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{ borderColor: "$accent8" }}
            onDragOver={(e: DragEvent) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e: DragEvent) => {
              e.preventDefault()
              setIsDragging(false)
              if (e.dataTransfer?.files?.[0]) {
                handleFileChange(e.dataTransfer.files[0])
              }
            }}
            onClick={() => {
              const input = document.createElement("input")
              input.type = "file"
              input.accept = ".zip"
              input.onchange = (e: any) => {
                if (e.target.files?.[0]) {
                  handleFileChange(e.target.files[0])
                }
              }
              input.click()
            }}
          >
            <VStack spacing="$2" alignItems="center">
              <Icon as={FiUploadCloud} boxSize="$8" color="$accent9" />
              <Text fontWeight="$medium" fontSize="$sm">
                {zipFile()
                  ? zipFile()?.name
                  : t("plugins.install_modal.zip_drop_title")}
              </Text>
              <Text fontSize="$xs" color="$neutral10">
                {t("plugins.install_modal.zip_drop_help")}
              </Text>
            </VStack>
          </Box>
        </FormControl>

        {/* Extracted Preview */}
        <Show when={zipParsedManifest()}>
          <Box
            w="$full"
            maxW="$2xl"
            p="$3"
            rounded="$md"
            borderWidth="1px"
            borderColor="$accent6"
            bgColor="$accent1"
          >
            <HStack spacing="$3" alignItems="center">
              <Box
                w="$9"
                h="$9"
                rounded="$md"
                bgColor="$accent3"
                color="$accent9"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
                overflow="hidden"
              >
                <Show
                  when={zipParsedManifest()?.icon}
                  fallback={<Icon as={FaSolidPuzzlePiece} boxSize="$5" />}
                >
                  <img
                    src={zipParsedManifest()?.icon}
                    alt="plugin icon"
                    style={{
                      width: "22px",
                      height: "22px",
                      "object-fit": "contain",
                    }}
                  />
                </Show>
              </Box>
              <VStack alignItems="flex-start" spacing="$0_5" flex={1}>
                <HStack spacing="$2" wrap="wrap">
                  <Text fontWeight="$bold" fontSize="$sm">
                    {zipParsedManifest()?.name}
                  </Text>
                  <Badge colorScheme="accent" variant="subtle">
                    v{zipParsedManifest()?.version}
                  </Badge>
                  <Badge colorScheme="neutral" variant="outline">
                    {zipParsedManifest()?.id}
                  </Badge>
                </HStack>
                <Text fontSize="$xs" color="$neutral10" noOfLines={1}>
                  {zipParsedManifest()?.description || "已成功解析 ZIP 插件包"}
                </Text>
              </VStack>
            </HStack>
          </Box>
        </Show>
      </Show>

      {/* 3. High Privilege Option */}
      <FormControl
        w="$full"
        display="flex"
        flexDirection="column"
        alignItems="start"
        gap="$1_5"
      >
        <FormLabel for="high_privilege">
          {t("plugins.install_modal.high_privilege_label")}
        </FormLabel>
        <HStack spacing="$2">
          <HopeSwitch
            id="high_privilege"
            checked={highPrivilege()}
            onChange={(e: any) => setHighPrivilege(e.target.checked)}
          />
          <Show when={highPrivilege()}>
            <Badge colorScheme="danger">Root Access</Badge>
          </Show>
        </HStack>
        <FormHelperText color="$neutral10" fontSize="$xs" mt="$0_5">
          {t("plugins.install_modal.high_privilege_help")}
        </FormHelperText>
      </FormControl>

      {/* 4. Operations */}
      <HStack spacing="$2" mt="$2">
        <Button loading={loading()} onClick={handleInstall}>
          {t("global.add")}
        </Button>
        <Button colorScheme="neutral" onClick={() => back()}>
          {t("global.back")}
        </Button>
      </HStack>
    </VStack>
  )
}

export default AddPlugin
