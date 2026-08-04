import {
  Box,
  Button,
  Center,
  Heading,
  Text,
  VStack,
  HStack,
  useColorModeValue,
  Spinner,
  Badge,
} from "@hope-ui/solid"
import { createSignal, onMount, Show, Switch, Match } from "solid-js"
import { useManageTitle, useT, useRouter } from "~/hooks"
import { r } from "~/utils"

interface KvStatus {
  configured: boolean
  connected: boolean
  platform: string
  mode: "binding" | "api" | "none"
  hasData: boolean
  error: string | null
}

interface StorageStatus {
  total: number
  active: number
  disabled: number
}

const Dashboard = () => {
  const t = useT()
  useManageTitle("KV Storage Status")
  const { to } = useRouter()

  const [loading, setLoading] = createSignal(true)
  const [kvStatus, setKvStatus] = createSignal<KvStatus | null>(null)
  const [storageStatus, setStorageStatus] = createSignal<StorageStatus | null>(
    null,
  )

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const [kvResp, storageResp] = await Promise.all([
        r.get("/admin/kv/status"),
        r.get("/admin/storage/list"),
      ])

      if (kvResp && kvResp.data) {
        setKvStatus(kvResp.data)
      }

      if (storageResp && storageResp.data && storageResp.data.content) {
        const storages = storageResp.data.content
        const total = storages.length
        const active = storages.filter((s: any) => !s.disabled).length
        const disabled = total - active
        setStorageStatus({ total, active, disabled })
      }
    } catch (err) {
      console.error("Failed to fetch KV status:", err)
    } finally {
      setLoading(false)
    }
  }

  onMount(() => {
    fetchStatus()
  })

  return (
    <Box w="$full" p="$4">
      <VStack spacing="$6" alignItems="stretch">
        <Box>
          <Heading size="lg" fontWeight="$bold">
            {t("manage.title")} Console
          </Heading>
          <Text color="$neutral11" mt="$1">
            Welcome to your administrator space. Manage configurations, KV
            storage, and drives.
          </Text>
        </Box>

        <Show
          when={!loading()}
          fallback={
            <Center py="$12">
              <Spinner size="lg" />
            </Center>
          }
        >
          <Switch>
            {/* Case: KV Namespace Binding or API Active */}
            <Match when={kvStatus()?.configured}>
              <Box
                border="1px solid"
                borderColor="$success5"
                rounded="$lg"
                p="$5"
                bgColor={useColorModeValue("$success1", "$success2")()}
              >
                <HStack spacing="$3" alignItems="center">
                  <Box color="$success9">
                    {/* Success icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </Box>
                  <Box flex="1">
                    <HStack spacing="$2" alignItems="center">
                      <Heading
                        size="base"
                        color="$success11"
                        fontWeight="$semibold"
                      >
                        KV Storage Sync: Connected & Active
                      </Heading>
                      <Badge colorScheme="success">
                        {kvStatus()?.platform}
                      </Badge>
                    </HStack>
                    <Text size="sm" mt="$1" color="$neutral12">
                      Your database configuration and drive settings are stored
                      in <strong>{kvStatus()?.platform}</strong>.
                    </Text>
                  </Box>
                  <Button
                    size="xs"
                    variant="outline"
                    colorScheme="success"
                    onClick={fetchStatus}
                  >
                    Refresh
                  </Button>
                </HStack>
              </Box>
            </Match>

            {/* Case: Local Mode Fallback */}
            <Match when={!kvStatus()?.configured}>
              <Box
                border="1px solid"
                borderColor="$info5"
                rounded="$lg"
                p="$5"
                bgColor={useColorModeValue("$info1", "$info2")()}
              >
                <HStack spacing="$3" alignItems="start">
                  <Box color="$info9" mt="$0.5">
                    {/* Info icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </Box>
                  <Box flex="1">
                    <HStack spacing="$2" alignItems="center">
                      <Heading
                        size="base"
                        color="$info11"
                        fontWeight="$semibold"
                      >
                        Local File / Memory Database Mode
                      </Heading>
                      <Badge colorScheme="neutral">Local Mode</Badge>
                    </HStack>
                    <Text size="sm" mt="$1" color="$neutral12">
                      Running in local filesystem mode (
                      <code>public_data/db.json</code>).
                    </Text>
                    <Text size="xs" mt="$2" color="$neutral11">
                      To enable Cloudflare Workers KV or Tencent EdgeOne KV,
                      bind a KV Namespace (e.g. <code>OPENLIST_KV</code>) or set
                      REST API environment variables (<code>CF_ACCOUNT_ID</code>
                      , <code>CF_KV_NAMESPACE_ID</code>,{" "}
                      <code>CF_API_TOKEN</code> or{" "}
                      <code>EDGEONE_KV_NAMESPACE_ID</code>,{" "}
                      <code>EDGEONE_API_TOKEN</code>).
                    </Text>
                  </Box>
                </HStack>
              </Box>
            </Match>
          </Switch>

          {/* Storage Status */}
          <Show when={storageStatus()}>
            <Box mt="$6">
              <Heading size="sm" mb="$3" fontWeight="$semibold">
                Storage Drives Status
              </Heading>
              <HStack spacing="$4" wrap="wrap">
                <Box
                  flex="1"
                  minW="120px"
                  p="$4"
                  rounded="$lg"
                  border="1px solid"
                  borderColor="$neutral5"
                  bgColor={useColorModeValue("$neutral2", "$neutral3")()}
                  textAlign="center"
                >
                  <Text size="sm" color="$neutral11" mb="$1">
                    Total Storages
                  </Text>
                  <Heading size="lg" color="$neutral12">
                    {storageStatus()?.total}
                  </Heading>
                </Box>
                <Box
                  flex="1"
                  minW="120px"
                  p="$4"
                  rounded="$lg"
                  border="1px solid"
                  borderColor="$success5"
                  bgColor={useColorModeValue("$success2", "$success3")()}
                  textAlign="center"
                >
                  <Text size="sm" color="$success11" mb="$1">
                    Active
                  </Text>
                  <Heading size="lg" color="$success11">
                    {storageStatus()?.active}
                  </Heading>
                </Box>
                <Box
                  flex="1"
                  minW="120px"
                  p="$4"
                  rounded="$lg"
                  border="1px solid"
                  borderColor="$danger5"
                  bgColor={useColorModeValue("$danger2", "$danger3")()}
                  textAlign="center"
                >
                  <Text size="sm" color="$danger11" mb="$1">
                    Disabled
                  </Text>
                  <Heading size="lg" color="$danger11">
                    {storageStatus()?.disabled}
                  </Heading>
                </Box>
              </HStack>
            </Box>
          </Show>
        </Show>

        {/* Shortcuts Section */}
        <Box mt="$4">
          <Heading size="sm" mb="$3" fontWeight="$semibold">
            Quick Navigation
          </Heading>
          <HStack spacing="$4" wrap="wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => to("/@manage/settings/site")}
            >
              Site Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => to("/@manage/storages")}
            >
              Manage Storages
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => to("/@manage/users")}
            >
              User Accounts
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Box>
  )
}

export default Dashboard
