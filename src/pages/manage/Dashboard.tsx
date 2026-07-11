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
} from "@hope-ui/solid"
import { createSignal, onMount, Show, Switch, Match } from "solid-js"
import { useManageTitle, useT, useUtil, useRouter } from "~/hooks"
import { r } from "~/utils"

interface SupabaseStatus {
  configured: boolean
  tableExists: boolean
  error: string | null
  url: string | null
}

interface StorageStatus {
  total: number
  active: number
  disabled: number
}

const Dashboard = () => {
  const t = useT()
  useManageTitle("Supabase Status")
  const { copy } = useUtil()
  const { to } = useRouter()

  const [loading, setLoading] = createSignal(true)
  const [status, setStatus] = createSignal<SupabaseStatus | null>(null)
  const [storageStatus, setStorageStatus] = createSignal<StorageStatus | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const [resp, storageResp] = await Promise.all([
        r.get("/admin/supabase/status"),
        r.get("/admin/storage/list")
      ])
      
      if (resp && resp.data) {
        setStatus(resp.data)
      }

      if (storageResp && storageResp.data && storageResp.data.content) {
        const storages = storageResp.data.content
        const total = storages.length
        const active = storages.filter((s: any) => !s.disabled).length
        const disabled = total - active
        setStorageStatus({ total, active, disabled })
      }
    } catch (err) {
      console.error("Failed to fetch Supabase status:", err)
    } finally {
      setLoading(false)
    }
  }

  onMount(() => {
    fetchStatus()
  })

  const sqlCode = `-- SQL to initialize the Supabase configuration table
CREATE TABLE IF NOT EXISTS public.openlist_config (
  id bigint PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.openlist_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public reads and writes
CREATE POLICY "Allow public read and write" ON public.openlist_config
  FOR ALL
  USING (true)
  WITH CHECK (true);`

  return (
    <Box w="$full" p="$4">
      <VStack spacing="$6" alignItems="stretch">
        <Box>
          <Heading size="lg" fontWeight="$bold">
            {t("manage.title")} Console
          </Heading>
          <Text color="$neutral11" mt="$1">
            Welcome to your administrator space. Manage configurations, storage drives, and settings.
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
            {/* Case: Supabase is Configured, but Table is Missing */}
            <Match when={status()?.configured && !status()?.tableExists}>
              <Box
                border="1px solid"
                borderColor="$warning5"
                rounded="$lg"
                p="$5"
                bgColor={useColorModeValue("$warning1", "$warning2")()}
              >
                <HStack spacing="$3" alignItems="start" mb="$4">
                  <Box color="$warning9" mt="$1">
                    {/* Warning icon */}
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
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </Box>
                  <Box>
                    <Heading size="base" color="$warning11" fontWeight="$semibold">
                      Supabase Setup Required: Missing 'openlist_config' Table
                    </Heading>
                    <Text size="sm" mt="$1" color="$neutral12">
                      The application is successfully connected to your Supabase instance at{" "}
                      <strong>{status()?.url}</strong>, but the required table is missing in the database.
                    </Text>
                  </Box>
                </HStack>

                <VStack spacing="$3" alignItems="stretch" pl="$9">
                  <Text size="sm" fontWeight="$medium">
                    Please follow these quick steps to set it up:
                  </Text>
                  <Box as="ol" style={{ "padding-left": "20px" }} class="space-y-2 text-sm text-neutral11">
                    <li>
                      Log in to your <strong>Supabase Dashboard</strong>.
                    </li>
                    <li>
                      Select your project and click on the <strong>SQL Editor</strong> in the left sidebar (the console icon <code>&gt;_</code>).
                    </li>
                    <li>
                      Click <strong>New query</strong>, paste the SQL snippet below, and click <strong>Run</strong>.
                    </li>
                  </Box>

                  <Box mt="$2">
                    <HStack justifyContent="space-between" mb="$2">
                      <Text size="xs" color="$neutral11" fontWeight="$semibold">
                        SQL SCHEMA SETUP
                      </Text>
                      <Button size="xs" colorScheme="warning" onClick={() => copy(sqlCode)}>
                        Copy SQL
                      </Button>
                    </HStack>
                    <Box
                      as="pre"
                      p="$3"
                      rounded="$md"
                      bgColor={useColorModeValue("$neutral3", "$neutral1")()}
                      color={useColorModeValue("$neutral12", "$neutral11")()}
                      fontSize="$xs"
                      overflowX="auto"
                      fontFamily="monospace"
                      border="1px solid"
                      borderColor="$neutral5"
                    >
                      {sqlCode}
                    </Box>
                  </Box>

                  <HStack spacing="$2" mt="$3">
                    <Button size="sm" colorScheme="warning" onClick={fetchStatus}>
                      Check Status Again
                    </Button>
                    <Text size="xs" color="$neutral10">
                      Currently using local backup JSON storage. Data will sync once the table is online.
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </Match>

            {/* Case: Supabase is Configured and Fully Active */}
            <Match when={status()?.configured && status()?.tableExists}>
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
                  <Box>
                    <Heading size="base" color="$success11" fontWeight="$semibold">
                      Supabase Cloud Sync: Connected & Active
                    </Heading>
                    <Text size="sm" mt="$0.5" color="$neutral12">
                      Your database configuration and drive list are being securely backed up and synced to your remote Supabase instance.
                    </Text>
                  </Box>
                </HStack>
              </Box>
            </Match>

            {/* Case: Supabase is Not Configured */}
            <Match when={!status()?.configured}>
              <Box
                border="1px solid"
                borderColor="$info5"
                rounded="$lg"
                p="$5"
                bgColor={useColorModeValue("$info1", "$info2")()}
              >
                <HStack spacing="$3" alignItems="center">
                  <Box color="$info9">
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
                  <Box>
                    <Heading size="base" color="$info11" fontWeight="$semibold">
                      Local JSON Database Active
                    </Heading>
                    <Text size="sm" mt="$0.5" color="$neutral12">
                      The application is running in local mode. All settings and storages are saved to the local file system.
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
                  <Text size="sm" color="$neutral11" mb="$1">Total Storages</Text>
                  <Heading size="lg" color="$neutral12">{storageStatus()?.total}</Heading>
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
                  <Text size="sm" color="$success11" mb="$1">Active</Text>
                  <Heading size="lg" color="$success11">{storageStatus()?.active}</Heading>
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
                  <Text size="sm" color="$danger11" mb="$1">Disabled</Text>
                  <Heading size="lg" color="$danger11">{storageStatus()?.disabled}</Heading>
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
            <Button variant="outline" size="sm" onClick={() => to("/@manage/settings/common")}>
              General Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => to("/@manage/storages")}>
              Manage Storages
            </Button>
            <Button variant="outline" size="sm" onClick={() => to("/@manage/users")}>
              User Accounts
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Box>
  )
}

export default Dashboard
