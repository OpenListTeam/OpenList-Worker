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
  Textarea,
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, onMount, Show } from "solid-js"
import { FaSolidPuzzlePiece } from "solid-icons/fa"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { PluginConfigField, PluginItem, Resp } from "~/types"
import { handleResp, notify, pluginEngine, r } from "~/utils"
import { MaybeLoading } from "~/components"

const ConfigPlugin = () => {
  const t = useT()
  const { params, back, to } = useRouter()
  const id = decodeURIComponent(params.id || "")
  useManageTitle("plugins.config_modal.title")

  const [plugin, setPlugin] = createSignal<PluginItem | null>(null)
  const [formValues, setFormValues] = createSignal<Record<string, any>>({})
  const [highPrivilege, setHighPrivilege] = createSignal(false)
  const [enabled, setEnabled] = createSignal(true)
  const [saving, setSaving] = createSignal(false)

  const [fetchLoading, fetchPlugin] = useFetch(
    (): Promise<Resp<PluginItem>> =>
      r.get(`/admin/plugin/get?id=${encodeURIComponent(id)}`),
  )

  const initData = async () => {
    const resp = await fetchPlugin()
    handleResp(
      resp,
      (data) => {
        setPlugin(data)
        setHighPrivilege(!!data.high_privilege)
        setEnabled(!!data.enabled)
        const initial: Record<string, any> = {}
        if (data.config_schema) {
          data.config_schema.forEach((field) => {
            if (
              data.config_values &&
              data.config_values[field.key] !== undefined
            ) {
              initial[field.key] = data.config_values[field.key]
            } else if (field.defaultValue !== undefined) {
              initial[field.key] = field.defaultValue
            }
          })
        }
        setFormValues(initial)
      },
      (msg) => {
        notify.error("未找到对应插件: " + msg)
        back()
      },
    )
  }

  onMount(() => {
    if (id) {
      initData()
    }
  })

  const handleFieldChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    const p = plugin()
    if (!p) return
    setSaving(true)
    try {
      const resp: Resp<PluginItem> = await r.post("/admin/plugin/update", {
        id: p.id,
        config_values: formValues(),
        high_privilege: highPrivilege(),
        enabled: enabled(),
      })
      handleResp(resp, (updated) => {
        if (updated.enabled) {
          pluginEngine.loadPlugin(updated)
        } else {
          pluginEngine.unloadPlugin(updated.id)
        }
        notify.success(t("global.save_success"))
        to("/@manage/plugins")
      })
    } finally {
      setSaving(false)
    }
  }

  const renderFieldInput = (field: PluginConfigField) => {
    const value = () => formValues()[field.key]

    switch (field.type) {
      case "string":
        return (
          <Input
            id={field.key}
            w="$full"
            maxW="$2xl"
            value={value() || ""}
            onInput={(e: any) => handleFieldChange(field.key, e.target.value)}
          />
        )
      case "number":
        return (
          <Input
            id={field.key}
            w="$full"
            maxW="$sm"
            type="number"
            value={value() ?? 0}
            onInput={(e: any) =>
              handleFieldChange(field.key, parseFloat(e.target.value) || 0)
            }
          />
        )
      case "bool":
        return (
          <HStack spacing="$2" py="$1">
            <HopeSwitch
              id={field.key}
              checked={!!value()}
              onChange={(e: any) =>
                handleFieldChange(field.key, e.target.checked)
              }
            />
            <Badge colorScheme={value() ? "success" : "neutral"}>
              {t(`global.${value() ? "enable" : "disable"}`)}
            </Badge>
          </HStack>
        )
      case "select":
        return (
          <Select
            id={field.key}
            value={value() ?? field.options?.[0]}
            onChange={(val: any) => handleFieldChange(field.key, val)}
          >
            <SelectTrigger w="$full" maxW="$2xl">
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              <SelectListbox>
                <For each={field.options || []}>
                  {(opt) => (
                    <SelectOption value={opt}>
                      <SelectOptionText>{opt}</SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
        )
      case "text":
        return (
          <Textarea
            id={field.key}
            w="$full"
            maxW="$2xl"
            rows={4}
            value={value() || ""}
            onInput={(e: any) => handleFieldChange(field.key, e.target.value)}
          />
        )
      default:
        return (
          <Input
            id={field.key}
            w="$full"
            maxW="$2xl"
            value={value() || ""}
            onInput={(e: any) => handleFieldChange(field.key, e.target.value)}
          />
        )
    }
  }

  return (
    <MaybeLoading loading={fetchLoading()}>
      <VStack spacing="$5" alignItems="start" w="$full" maxW="$3xl">
        <Heading mb="$1">{t("plugins.config_modal.title")}</Heading>

        {/* Plugin Info Banner */}
        <Show when={plugin()}>
          <Box
            w="$full"
            maxW="$2xl"
            p="$4"
            rounded="$md"
            borderWidth="1px"
            borderColor="$neutral4"
            bgColor="$neutral1"
          >
            <HStack spacing="$3" alignItems="center">
              <Box
                w="$10"
                h="$10"
                rounded="$md"
                bgColor="$neutral3"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
                overflow="hidden"
              >
                <Show
                  when={plugin()?.icon}
                  fallback={<Icon as={FaSolidPuzzlePiece} boxSize="$5" />}
                >
                  <img
                    src={plugin()?.icon}
                    alt="plugin icon"
                    style={{
                      width: "24px",
                      height: "24px",
                      "object-fit": "contain",
                    }}
                  />
                </Show>
              </Box>
              <VStack alignItems="flex-start" spacing="$0_5" flex={1}>
                <HStack spacing="$2" wrap="wrap">
                  <Text fontWeight="$bold" fontSize="$md">
                    {plugin()?.name}
                  </Text>
                  <Badge colorScheme="accent">v{plugin()?.version}</Badge>
                  <Badge colorScheme="neutral">{plugin()?.type || "ui"}</Badge>
                </HStack>
                <Text fontSize="$xs" color="$neutral10">
                  {plugin()?.description || t("plugins.empty_desc")}
                </Text>
              </VStack>
            </HStack>
          </Box>
        </Show>

        {/* Plugin Enable State */}
        <FormControl
          w="$full"
          display="flex"
          flexDirection="column"
          alignItems="start"
          gap="$1_5"
        >
          <FormLabel for="plugin_enable">{t("global.enable")}</FormLabel>
          <HStack spacing="$2">
            <HopeSwitch
              id="plugin_enable"
              checked={enabled()}
              onChange={(e: any) => setEnabled(e.target.checked)}
            />
            <Badge colorScheme={enabled() ? "success" : "neutral"}>
              {t(`global.${enabled() ? "enable" : "disable"}`)}
            </Badge>
          </HStack>
        </FormControl>

        {/* High Privilege Switch */}
        <FormControl
          w="$full"
          display="flex"
          flexDirection="column"
          alignItems="start"
          gap="$1_5"
        >
          <FormLabel for="plugin_high_privilege">
            {t("plugins.install_modal.high_privilege_label")}
          </FormLabel>
          <HStack spacing="$2">
            <HopeSwitch
              id="plugin_high_privilege"
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

        {/* Dynamic Config Schema Form */}
        <Show
          when={plugin()?.config_schema && plugin()!.config_schema!.length > 0}
          fallback={
            <Box py="$2">
              <Text fontSize="$sm" color="$neutral10">
                {t("plugins.config_modal.no_config")}
              </Text>
            </Box>
          }
        >
          <For each={plugin()?.config_schema}>
            {(field) => (
              <FormControl
                w="$full"
                display="flex"
                flexDirection="column"
                alignItems="start"
                gap="$1_5"
              >
                <FormLabel for={field.key}>{field.label}</FormLabel>
                {renderFieldInput(field)}
                <Show when={field.description}>
                  <FormHelperText color="$neutral10" fontSize="$xs" mt="$0_5">
                    {field.description}
                  </FormHelperText>
                </Show>
              </FormControl>
            )}
          </For>
        </Show>

        {/* Operations */}
        <HStack spacing="$2" mt="$2">
          <Button loading={saving()} onClick={handleSave}>
            {t("global.save")}
          </Button>
          <Button colorScheme="neutral" onClick={() => back()}>
            {t("global.back")}
          </Button>
        </HStack>
      </VStack>
    </MaybeLoading>
  )
}

export default ConfigPlugin
