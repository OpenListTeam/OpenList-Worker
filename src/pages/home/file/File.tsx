import { HStack, VStack } from "@hope-ui/solid"
import { createMemo, ErrorBoundary, Show, Suspense } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Error, FullLoading, SelectWrapper } from "~/components"
import { objStore } from "~/store"
import { useRouter } from "~/hooks"
import { Download } from "../previews/download"
import { OpenWith } from "./open-with"
import { getPreviews } from "../previews"

const File = () => {
  const { searchParams, setSearchParams } = useRouter()
  const previews = getPreviews({ ...objStore.obj, provider: objStore.provider })
  const cur = createMemo(() => {
    if (!previews.length) return undefined
    const selected = searchParams["preview"]
    if (selected) {
      const found = previews.find((item) => item.key === selected)
      if (found) return found
    }
    return previews[0]
  })

  return (
    <Show when={previews.length > 1} fallback={<Download openWith />}>
      <VStack w="$full" spacing="$2">
        <HStack w="$full" spacing="$2">
          <SelectWrapper
            alwaysShowBorder
            value={cur()?.key || ""}
            onChange={(key) => {
              setSearchParams({ preview: key }, { replace: true })
            }}
            options={previews.map((item) => ({
              value: item.key,
              label: item.name,
            }))}
          />
          <OpenWith />
        </HStack>
        <ErrorBoundary fallback={(err) => <Error msg={String(err)} />}>
          <Suspense fallback={<FullLoading />}>
            <Dynamic component={cur()?.component} />
          </Suspense>
        </ErrorBoundary>
      </VStack>
    </Show>
  )
}

export default File
