import { Button, Flex, Text } from "@hope-ui/solid"
import { createMemo, Match, onCleanup, onMount, Show, Switch } from "solid-js"
import { FullLoading, Paginator } from "~/components"
import { getGlobalPage, usePath, useRouter, useT } from "~/hooks"
import { clearHistory, getPagination, objStore, State } from "~/store"

const Pagination = () => {
  const { pathname, setSearchParams } = useRouter()
  const pageSize = createMemo(() => {
    if (objStore.page_size && objStore.page_size > 0) {
      return objStore.page_size
    }
    return getPagination().size
  })
  return (
    <Flex
      w="$full"
      justifyContent="flex-end"
      alignItems="center"
      mt="$3"
      pr="$1"
    >
      <Paginator
        total={objStore.total}
        defaultCurrent={getGlobalPage()}
        defaultPageSize={pageSize()}
        onChange={(page) => {
          clearHistory(pathname(), page)
          setSearchParams({ page })
        }}
      />
    </Flex>
  )
}
const LoadMore = () => {
  const { loadMore, allLoaded } = usePath()
  const t = useT()
  return (
    <Show
      when={!allLoaded()}
      fallback={<Text fontStyle="italic">{t("home.no_more")}</Text>}
    >
      <Button onClick={loadMore}>{t("home.load_more")}</Button>
    </Show>
  )
}

const AutoLoadMore = () => {
  const { loadMore, allLoaded } = usePath()
  const t = useT()
  const ob = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadMore()
      }
    },
    {
      threshold: 0.1,
    },
  )
  let el!: HTMLDivElement
  onMount(() => {
    if (!allLoaded()) {
      ob.observe(el)
    }
  })
  onCleanup(() => {
    ob.disconnect()
  })
  return (
    <Show
      when={!allLoaded()}
      fallback={<Text fontStyle="italic">{t("home.no_more")}</Text>}
    >
      <FullLoading py="$2" size="md" thickness={3} ref={el} />
    </Show>
  )
}

export const Pager = () => {
  const paginationType = createMemo(() => getPagination().type)
  return (
    <Switch>
      <Match when={objStore.state === State.FetchingMore}>
        <FullLoading py="$2" size="md" thickness={3} />
      </Match>
      <Match when={paginationType() === "pagination"}>
        <Pagination />
      </Match>
      <Match when={paginationType() === "load_more"}>
        <LoadMore />
      </Match>
      <Match when={paginationType() === "auto_load_more"}>
        <AutoLoadMore />
      </Match>
    </Switch>
  )
}
