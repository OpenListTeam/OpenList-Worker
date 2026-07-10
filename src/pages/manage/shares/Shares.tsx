import {
  Box,
  Button,
  HStack,
  Table,
  Tbody,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { PageResp, ShareInfo, UserMethods, UserPermissions } from "~/types"
import { handleResp, r } from "~/utils"
import { ShareListItem } from "./Share"
import { me } from "~/store"

const Shares = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.shares")
  const { to } = useRouter()
  const [getSharesLoading, getShares] = useFetch(
    (): Promise<PageResp<ShareInfo>> => r.get("/share/list"),
  )
  const [shares, setShares] = createSignal<ShareInfo[]>([])
  const refresh = async () => {
    const resp = await getShares()
    handleResp(resp, (data) => setShares(data.content))
  }
  const canShare = UserMethods.can(
    me(),
    UserPermissions.findIndex((item) => item === "share"),
  )
  refresh()
  return (
    <VStack spacing="$3" alignItems="start" w="$full">
      <HStack
        spacing="$2"
        gap="$2"
        w="$full"
        wrap={{
          "@initial": "wrap",
          "@md": "unset",
        }}
      >
        <Button
          colorScheme="accent"
          loading={getSharesLoading()}
          onClick={refresh}
        >
          {t("global.refresh")}
        </Button>
        <Show
          when={!canShare}
          fallback={
            <Button onClick={() => to("/@manage/shares/add")}>
              {t("global.add")}
            </Button>
          }
        >
          <Tooltip
            withArrow
            label={t("shares.no_permission_tip")}
            placement="right"
          >
            <Button disabled> {t("global.add")} </Button>
          </Tooltip>
        </Show>
      </HStack>
      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <For each={["files", "id"]}>
                {(title) => <Th>{t(`shares.${title}`)}</Th>}
              </For>
              <Show when={UserMethods.is_admin(me())}>
                <Th>{t(`shares.creator`)}</Th>
              </Show>
              <For each={["expires", "accessed", "status", "remark"]}>
                {(title) => <Th>{t(`shares.${title}`)}</Th>}
              </For>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={shares()}>
              {(share) => (
                <ShareListItem
                  share={share}
                  refresh={refresh}
                  canShare={canShare}
                />
              )}
            </For>
          </Tbody>
        </Table>
      </Box>
    </VStack>
  )
}

export default Shares
