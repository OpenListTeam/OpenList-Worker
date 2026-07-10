import {
  Badge,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  useColorModeValue,
  VStack,
} from "@hope-ui/solid"
import { useFetch, useT } from "~/hooks"
import { createSignal, Show } from "solid-js"
import { Flag, PEmptyResp, PResp, Type } from "~/types"
import { formatDate, handleResp, handleRespWithNotifySuccess, r } from "~/utils"
import { FolderChooseInput } from "~/components"

type Progress = {
  obj_count: number
  is_done: boolean
}

const Scan = () => {
  const t = useT()
  const [progress, setProgress] = createSignal<Progress>()
  const [progressLoading, getProgressReq] = useFetch(
    (): PResp<Progress> => r.get("/admin/scan/progress"),
  )
  const [refreshTimeout, setRefreshTimeout] = createSignal<number | undefined>()
  const resetRefreshTimeout = (run: boolean) => {
    if (refreshTimeout()) {
      clearTimeout(refreshTimeout())
    }
    if (run) {
      setRefreshTimeout(window.setTimeout(refreshProgress, 5000))
    } else {
      setRefreshTimeout(undefined)
    }
  }
  const refreshProgress = async () => {
    const resp = await getProgressReq()
    handleResp(
      resp,
      (data) => {
        setProgress(data)
        resetRefreshTimeout(!data.is_done)
      },
      () => {
        resetRefreshTimeout(true)
      },
    )
  }
  refreshProgress()
  const [stopLoading, stopReq] = useFetch(
    (): PEmptyResp => r.post("/admin/scan/stop"),
  )
  const stop = async () => {
    const resp = await stopReq()
    handleRespWithNotifySuccess(resp)
    refreshProgress()
  }
  const [scanPath, setScanPath] = createSignal<string>("/")
  const [rateLimit, setRateLimit] = createSignal<number>(0.0)
  const [startLoading, startReq] = useFetch(
    (): PEmptyResp =>
      r.post("/admin/scan/start", { path: scanPath(), limit: rateLimit() }),
  )
  const start = async () => {
    const resp = await startReq()
    handleRespWithNotifySuccess(resp)
    refreshProgress()
  }
  return (
    <>
      <Heading>{t("indexes.scan_header")}</Heading>
      <Show when={progress()}>
        <VStack
          alignItems="start"
          spacing="$2"
          w="fit-content"
          p="$2"
          shadow="$md"
          rounded="$lg"
          bg={useColorModeValue("", "$neutral3")()}
        >
          <Text>
            {t("indexes.task_status")}:
            <Badge
              colorScheme={progress()?.is_done ? "accent" : "success"}
              ml="$2"
            >
              {progress()?.is_done ? t("indexes.idle") : t("indexes.running")}
            </Badge>
          </Text>
          <Text>
            {t("indexes.obj_count")}:
            <Badge colorScheme="info" ml="$2">
              {progress()?.obj_count}
            </Badge>
          </Text>
          <Button
            colorScheme="danger"
            onClick={stop}
            loading={stopLoading()}
            disabled={progress()?.is_done}
          >
            {t("indexes.stop")}
          </Button>
        </VStack>
      </Show>
      <FormControl w="100%" display="flex" flexDirection="column">
        <FormLabel display="flex" alignItems="center">
          {t("indexes.path_to_scan")}
        </FormLabel>
        <FolderChooseInput
          value={scanPath()}
          onChange={(path) => setScanPath(path)}
        />
        <FormLabel display="flex" alignItems="center">
          {t("indexes.rate_limit")}
        </FormLabel>
        <Input
          type="number"
          value={rateLimit()}
          step={0.1}
          onInput={(e) => setRateLimit(parseFloat(e.currentTarget.value))}
        />
      </FormControl>
      <Button colorScheme="info" onClick={start} loading={startLoading()}>
        {t("indexes.start")}
      </Button>
    </>
  )
}

export default Scan
