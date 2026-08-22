import {
  Box,
  Button,
  Grid,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  Table,
  Tbody,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  Switch as HopeSwitch,
} from "@hope-ui/solid"
import { createMemo, createSignal, For, Match, onMount, Switch } from "solid-js"
import { createStorageSignal } from "@solid-primitives/storage"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { EmptyResp, PageResp, PluginItem, Resp } from "~/types"
import { handleResp, notify, pluginEngine, r } from "~/utils"
import { PluginGridItem, PluginListItem } from "./Plugin"

const Plugins = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.plugins")
  const { to } = useRouter()

  const [plugins, setPlugins] = createSignal<PluginItem[]>([])
  const [selectedType, setSelectedType] = createSignal<string>("all")

  // Modals state
  const [importModalOpen, setImportModalOpen] = createSignal(false)
  const [importJsonText, setImportJsonText] = createSignal("")

  const [layout, setLayout] = createStorageSignal(
    "plugins-layout",
    "table" as "grid" | "table",
  )

  const [loading, fetchPlugins] = useFetch(
    (): Promise<PageResp<PluginItem>> => r.get("/admin/plugin/list"),
  )

  const refresh = async () => {
    const resp = await fetchPlugins()
    handleResp(resp, (data) => {
      setPlugins(data.content || [])
    })
  }

  onMount(() => {
    refresh()
  })

  const shownPlugins = createMemo(() => {
    const type = selectedType()
    return plugins().filter((p) => {
      if (type === "all") return true
      return p.type === type
    })
  })

  // Actions
  const handleToggle = async (plugin: PluginItem) => {
    const resp: Resp<{ id: string; enabled: boolean }> = await r.post(
      "/admin/plugin/toggle",
      { id: plugin.id, enabled: !plugin.enabled },
    )
    handleResp(resp, (data) => {
      setPlugins((prev) =>
        prev.map((p) =>
          p.id === data.id ? { ...p, enabled: data.enabled } : p,
        ),
      )
      if (data.enabled) {
        pluginEngine.loadPlugin({ ...plugin, enabled: true })
        notify.success(t("global.enable") + " " + t("global.success"))
      } else {
        pluginEngine.unloadPlugin(plugin.id)
        notify.info(t("global.disable") + " " + t("global.success"))
      }
    })
  }

  const handleDelete = async (plugin: PluginItem) => {
    const resp: EmptyResp = await r.post(`/admin/plugin/delete?id=${plugin.id}`)
    handleResp(resp, () => {
      pluginEngine.unloadPlugin(plugin.id)
      setPlugins((prev) => prev.filter((p) => p.id !== plugin.id))
      notify.success(t("global.delete_success"))
    })
  }

  const handleExportJson = () => {
    const dataStr = JSON.stringify(plugins(), null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `openlistnext-plugins-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    notify.success(t("plugins.actions.export") + " " + t("global.success"))
  }

  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(importJsonText())
      if (!Array.isArray(parsed)) {
        notify.error("JSON 格式错误：必须为插件数组")
        return
      }
      const resp: Resp<{ count: number }> = await r.post(
        "/admin/plugin/batch_save",
        parsed,
      )
      handleResp(resp, () => {
        notify.success(t("global.success"))
        setImportModalOpen(false)
        setImportJsonText("")
        refresh()
      })
    } catch (e: any) {
      notify.error("JSON 解析失败: " + e.message)
    }
  }

  const categories = [
    { key: "all", label: t("plugins.types.all") },
    { key: "ui", label: t("plugins.types.ui") },
    { key: "preview", label: t("plugins.types.preview") },
    { key: "tool", label: t("plugins.types.tool") },
    { key: "theme", label: t("plugins.types.theme") },
    { key: "integration", label: t("plugins.types.integration") },
    { key: "system", label: t("plugins.types.system") },
  ]

  return (
    <VStack spacing="$3" alignItems="start" w="$full">
      {/* Top Operations Bar */}
      <HStack
        spacing="$2"
        gap="$2"
        w="$full"
        wrap={{
          "@initial": "wrap",
          "@md": "unset",
        }}
      >
        <Button colorScheme="accent" loading={loading()} onClick={refresh}>
          {t("global.refresh")}
        </Button>
        <Button
          onClick={() => {
            to("/@manage/plugins/add")
          }}
        >
          {t("global.add")}
        </Button>
        <Button colorScheme="neutral" onClick={() => setImportModalOpen(true)}>
          {t("plugins.actions.import")}
        </Button>
        <Button colorScheme="neutral" onClick={handleExportJson}>
          {t("plugins.actions.export")}
        </Button>

        <HStack spacing="$1">
          <span>{t("storages.other.layout")}</span>
          <HopeSwitch
            checked={layout() === "grid"}
            onChange={(e: any) =>
              setLayout(e.target.checked ? "grid" : "table")
            }
          />
        </HStack>

        <Select
          value={selectedType()}
          onChange={(v: any) => setSelectedType(v)}
        >
          <SelectTrigger w="$40">
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectListbox>
              <For each={categories}>
                {(cat) => (
                  <SelectOption value={cat.key}>
                    <SelectOptionText>{cat.label}</SelectOptionText>
                    <SelectOptionIndicator />
                  </SelectOption>
                )}
              </For>
            </SelectListbox>
          </SelectContent>
        </Select>
      </HStack>

      {/* Main Content Layout */}
      <Switch>
        <Match when={layout() === "table"}>
          <Box w="$full" overflowX="auto">
            <Table highlightOnHover dense>
              <Thead>
                <Tr>
                  <Th>{t("plugins.name")}</Th>
                  <Th>{t("plugins.type")}</Th>
                  <Th>{t("plugins.version")}</Th>
                  <Th>{t("plugins.author")}</Th>
                  <Th>{t("plugins.status")}</Th>
                  <Th>{t("global.operations")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={shownPlugins()}>
                  {(plugin) => (
                    <PluginListItem
                      plugin={plugin}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  )}
                </For>
              </Tbody>
            </Table>
          </Box>
        </Match>

        <Match when={layout() === "grid"}>
          <Grid
            templateColumns={{
              "@initial": "1fr",
              "@md": "repeat(2, 1fr)",
              "@lg": "repeat(3, 1fr)",
            }}
            gap="$3"
            w="$full"
          >
            <For each={shownPlugins()}>
              {(plugin) => (
                <PluginGridItem
                  plugin={plugin}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              )}
            </For>
          </Grid>
        </Match>
      </Switch>

      {/* Import JSON Modal */}
      <Modal
        opened={importModalOpen()}
        onClose={() => setImportModalOpen(false)}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>{t("plugins.import_modal.title")}</ModalHeader>
          <ModalBody>
            <VStack spacing="$3" alignItems="stretch">
              <Text fontSize="$sm" color="$neutral11">
                {t("plugins.import_modal.paste_json")}
              </Text>
              <Textarea
                rows={10}
                placeholder='[{"id": "plugin-1", "name": "...", "enabled": true}]'
                value={importJsonText()}
                onInput={(e: any) => setImportJsonText(e.target.value)}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing="$2">
              <Button
                variant="subtle"
                colorScheme="neutral"
                onClick={() => setImportModalOpen(false)}
              >
                {t("global.cancel")}
              </Button>
              <Button colorScheme="accent" onClick={handleImportJson}>
                {t("plugins.actions.import")}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}

export default Plugins
