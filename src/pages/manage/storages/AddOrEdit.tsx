import {
  Alert,
  AlertIcon,
  Button,
  Heading,
  HStack,
  VStack,
} from "@hope-ui/solid"
import { createMemo, createSignal, For, Show } from "solid-js"
import { MaybeLoading, ModalInput } from "~/components"
import { useFetch, useRouter, useT } from "~/hooks"
import { handleResp, joinBase, notify, r } from "~/utils"
import {
  Addition,
  DriverConfig,
  DriverItem,
  PResp,
  Storage,
  Type,
} from "~/types"
import { createStore, produce } from "solid-js/store"
import { Item } from "./Item"
import { ResponsiveGrid } from "../common/ResponsiveGrid"

interface DriverInfo {
  common: DriverItem[]
  additional: DriverItem[]
  config: DriverConfig
  default_mount_path?: string
}

function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
  return (
    Math.random().toString(16).substring(2).padEnd(16, "0") +
    Math.random().toString(16).substring(2).padEnd(16, "0")
  ).slice(0, 32)
}

function GetDefaultValue(type: Type, value?: string, name?: string) {
  if (name === "device_id" && (!value || value === "")) {
    return generateDeviceId()
  }
  switch (type) {
    case Type.Bool:
      if (value) {
        return value === "true"
      }
      return false
    case Type.Number:
      if (value) {
        return parseInt(value)
      }
      return 0
    case Type.Float:
      if (value) {
        return parseFloat(value)
      }
      return 0
    default:
      if (value) {
        return value
      }
      return ""
  }
}

type Drivers = Record<string, DriverInfo>

const AddOrEdit = () => {
  const t = useT()
  const { params, back, to } = useRouter()
  const { id } = params
  const [driversLoading, loadDrivers] = useFetch(
    (): PResp<Drivers> => r.get("/admin/driver/list"),
    true,
  )
  const [drivers, setDrivers] = createSignal<Drivers>({})
  const initAdd = async () => {
    const resp = await loadDrivers()
    handleResp(resp, setDrivers)
  }

  const [storageLoading, loadStorage] = useFetch(
    (): PResp<Storage> => r.get(`/admin/storage/get?id=${id}`),
    true,
  )
  const [driverLoading, loadDriver] = useFetch(
    (): PResp<DriverInfo> =>
      r.get(`/admin/driver/info?driver=${storage.driver}`),
    true,
  )
  const initEdit = async () => {
    const storageResp = await loadStorage()
    handleResp(storageResp, async (storageData) => {
      setStorage(storageData)
      setAddition(JSON.parse(storageData.addition))
      const driverResp = await loadDriver()
      handleResp(driverResp, (driverData) =>
        setDrivers({ [storage.driver]: driverData }),
      )
    })
  }
  if (id) {
    initEdit()
  } else {
    initAdd()
  }
  const [storage, setStorage] = createStore<Storage>({} as Storage)
  const [addition, setAddition] = createStore<Addition>({})
  const [okLoading, ok] = useFetch((): PResp<{ id: number }> => {
    const isThunder =
      storage.driver?.toLowerCase().includes("thunder") ||
      storage.driver?.toLowerCase().includes("xunlei")
    if (
      isThunder &&
      (!addition.device_id || (addition.device_id as string).trim() === "")
    ) {
      setAddition("device_id", generateDeviceId())
    }
    setStorage("addition", JSON.stringify(addition))
    return r.post(`/admin/storage/${id ? "update" : "create"}`, storage)
  })
  const alert = createMemo(() => {
    const i = drivers()[storage.driver]?.config.alert
    console.log(i)
    if (i) {
      return i.split("|")[0]
    }
  })
  const [exportOpened, setExportOpened] = createSignal(false)
  const [importOpened, setImportOpened] = createSignal(false)
  return (
    <MaybeLoading
      loading={id ? storageLoading() || driverLoading() : driversLoading()}
    >
      <Heading mb="$2">{t(`global.${id ? "edit" : "add"}`)}</Heading>
      <VStack mb="$2" spacing="$2">
        <Item
          name="driver"
          default=""
          readonly={id !== undefined}
          required
          searchable
          type={Type.Select}
          options={id ? storage.driver : Object.keys(drivers()).join(",")}
          value={storage.driver}
          full_name_path="storages.common.driver"
          options_prefix="drivers.drivers"
          driver="drivers"
          onChange={(value) => {
            const driverInfo = drivers()[value]
            for (const item of driverInfo.common) {
              let defaultVal = GetDefaultValue(
                item.type,
                item.default,
                item.name,
              )
              // mount_path 为空时使用驱动配置的 default_mount_path（如 /189、/lanzou），
              // 避免提交空路径被后端规范化成 "/" 而与根挂载冲突
              if (
                item.name === "mount_path" &&
                (defaultVal === "" || defaultVal == null) &&
                driverInfo.default_mount_path
              ) {
                defaultVal = driverInfo.default_mount_path
              }
              setStorage(
                item.name as keyof Storage,
                defaultVal as any,
              )
            }
            // clear addition first
            setAddition(
              produce((addition) => {
                for (const key in addition) {
                  delete addition[key]
                }
              }),
            )
            for (const item of driverInfo.additional) {
              setAddition(
                item.name,
                GetDefaultValue(item.type, item.default, item.name) as any,
              )
            }
            setStorage("driver", value)
          }}
        />
        <Show when={alert()}>
          <Alert status={alert() as any} w="$full">
            <AlertIcon />
            {t(`drivers.config.${storage.driver}.alert`)}
          </Alert>
        </Show>
      </VStack>
      <ResponsiveGrid>
        <Show when={drivers()[storage.driver]}>
          <For each={drivers()[storage.driver].common}>
            {(item) => (
              <Item
                {...(item as any)}
                driver="common"
                value={(storage as any)[item.name]}
                onChange={(val: any) => {
                  setStorage(item.name as keyof Storage, val)
                }}
              />
            )}
          </For>
          <For each={drivers()[storage.driver].additional}>
            {(item) => (
              <Item
                {...(item as any)}
                driver={storage.driver}
                value={addition[item.name] as any}
                onChange={(val: any) => {
                  setAddition(item.name, val)
                }}
              />
            )}
          </For>
        </Show>
      </ResponsiveGrid>
      <HStack
        mt="$2"
        spacing="$2"
        gap="$2"
        w="$full"
        wrap={{
          "@initial": "wrap",
          "@md": "unset",
        }}
      >
        <Button
          loading={okLoading()}
          onClick={async () => {
            if (drivers()[storage.driver].config.need_ms) {
              notify.info(t("manage.add_storage-tips"))
              window.open(joinBase("/@manage/messenger"), "_blank")
            }
            const resp = await ok()
            // TODO maybe can use handleRrespWithNotifySuccess
            handleResp(
              resp,
              () => {
                notify.success(t("global.save_success"))
                back()
              },
              (msg, code) => {
                if (resp.data && resp.data.id) {
                  to(`/@manage/storages/edit/${resp.data.id}`)
                }
              },
            )
          }}
        >
          {t(`global.${id ? "save" : "add"}`)}
        </Button>
        <Button
          colorScheme="accent"
          loading={okLoading()}
          onClick={async () => {
            setExportOpened(true)
          }}
        >
          {t("storages.common.export")}
        </Button>
        <Button
          colorScheme="primary"
          loading={okLoading()}
          onClick={async () => {
            setImportOpened(true)
          }}
        >
          {t("storages.common.import")}
        </Button>
      </HStack>
      <Show when={exportOpened()}>
        <ModalInput
          opened={exportOpened()}
          onClose={() => setExportOpened(false)}
          title={t("storages.common.export_title")}
          type="text"
          tips={t("storages.common.export_tips")}
          defaultValue={JSON.stringify(storage)}
          onSubmit={() => {
            setExportOpened(false)
          }}
        />
      </Show>
      <ModalInput
        opened={importOpened()}
        onClose={() => setImportOpened(false)}
        title={t("storages.common.import_title")}
        type="text"
        tips={t("storages.common.import_tips")}
        onSubmit={(text: string) => {
          try {
            const { id, disabled, modified, status, ...obj }: Storage =
              JSON.parse(text)
            // 驱动名归一化：兼容 OpenList Go 原版导出（如 "115 Open" → "115Open"、
            // "Baidu Netdisk" → "BaiduNetdisk"），避免导入后驱动不匹配
            const normDriver = (obj.driver || "")
              .replace(/\s+/g, "")
              .toLowerCase()
              .replace(/_/g, "")
            const available = Object.keys(drivers())
            const matched = available.find(
              (d) =>
                d.toLowerCase() === normDriver ||
                d.toLowerCase().replace(/[^a-z0-9]/g, "") === normDriver,
            )
            if (matched) obj.driver = matched
            if (!available.some((d) => d === obj.driver)) {
              notify.error(
                `未知驱动类型 "${obj.driver}"，可用驱动：${available.join(", ")}`,
              )
              return
            }
            setStorage(obj)
            setAddition(JSON.parse(obj.addition))
            setImportOpened(false)
            notify.success(t("storages.common.import_success"))
          } catch (e: any) {
            notify.error(`Invalid storage format: ${e.message}`)
          }
        }}
      />
    </MaybeLoading>
  )
}

export default AddOrEdit
