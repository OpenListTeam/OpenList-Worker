import {
  HStack,
  Button,
  VStack,
  Text,
  Switch as HopeSwitch,
  Input,
  FormControl,
  FormLabel,
  Flex,
} from "@hope-ui/solid"
import { r, handleRespWithoutNotify, notify } from "~/utils"
import { useFetch, useManageTitle, useT } from "~/hooks"
import {
  Meta,
  Storage,
  SettingItem,
  User,
  PResp,
  Resp,
  PEmptyResp,
  PPageResp,
  ShareInfo,
} from "~/types"
import { createSignal, For } from "solid-js"
import crypto from "crypto-js"

interface Data {
  encrypted: string
  settings: SettingItem[]
  users: User[]
  storages: Storage[]
  metas: Meta[]
  shares: ShareInfo[]
}
type LogType = "success" | "error" | "info"
const LogMap = {
  success: {
    icon: "✅",
    color: "$success9",
  },
  error: {
    icon: "❌",
    color: "$danger9",
  },
  info: {
    icon: "ℹ️",
    color: "$info9",
  },
}
const Log = (props: { msg: string; type: LogType }) => {
  return (
    <HStack w="$full" spacing="$1">
      <Text>{LogMap[props.type].icon}</Text>
      <Text color={LogMap[props.type].color}>{props.msg}</Text>
    </HStack>
  )
}

const BackupRestore = () => {
  const [override, setOverride] = createSignal(false)
  const [password, setPassword] = createSignal("")
  const t = useT()
  useManageTitle("manage.sidemenu.backup-restore")
  let logRef!: HTMLDivElement
  const [log, setLog] = createSignal<
    {
      type: LogType
      msg: string
    }[]
  >([])
  const appendLog = (msg: string, type: LogType) => {
    setLog((prev) => [...prev, { type, msg }])
    logRef.scrollTop = logRef.scrollHeight
  }
  const [getSettingsLoading, getSettings] = useFetch(
    (): PResp<any> => r.get("/admin/setting/list"),
  )
  const [getUsersLoading, getUsers] = useFetch(
    (): PPageResp<User> => r.get("/admin/user/list"),
  )
  const [getMetasLoading, getMetas] = useFetch(
    (): PPageResp<Meta> => r.get("/admin/meta/list"),
  )
  const [getStoragesLoading, getStorages] = useFetch(
    (): PPageResp<Storage> => r.get("/admin/storage/list"),
  )
  const [getSharesLoading, getShares] = useFetch(
    (): PPageResp<ShareInfo> => r.get("/share/list"),
  )
  const backupLoading = () => {
    return (
      getSettingsLoading() ||
      getUsersLoading() ||
      getMetasLoading() ||
      getStoragesLoading() ||
      getSharesLoading()
    )
  }
  function encrypt(data: any, key: string): string {
    if (key == "") return data
    const encJson = crypto.AES.encrypt(JSON.stringify(data), key).toString()
    return crypto.enc.Base64.stringify(crypto.enc.Utf8.parse(encJson))
  }

  function decrypt(
    data: any,
    key: string,
    raw: boolean,
    encrypted: boolean,
  ): string {
    if (!encrypted) return data
    const decData = crypto.enc.Base64.parse(data).toString(crypto.enc.Utf8)
    if (raw) return crypto.AES.decrypt(decData, key).toString(crypto.enc.Utf8)
    return JSON.parse(
      crypto.AES.decrypt(decData, key).toString(crypto.enc.Utf8),
    )
  }

  const backup = async () => {
    appendLog(t("br.start_backup"), "info")
    const allData: Data = {
      encrypted: "",
      settings: [],
      users: [],
      storages: [],
      metas: [],
      shares: [],
    }
    if (password() != "") allData.encrypted = encrypt("encrypted", password())
    for (const item of [
      { name: "settings", fn: getSettings, page: false },
      { name: "users", fn: getUsers, page: true },
      { name: "storages", fn: getStorages, page: true },
      { name: "metas", fn: getMetas, page: true },
      { name: "shares", fn: getShares, page: true },
    ] as const) {
      const resp = await item.fn()
      handleRespWithoutNotify(
        resp as Resp<any>,
        (data) => {
          appendLog(
            t("br.success_backup_item", {
              item: t(`manage.sidemenu.${item.name}`),
            }),
            "success",
          )
          if (item.page) {
            for (let i = 0; i < data.content.length; i++) {
              const obj = data.content[i]
              for (const key in obj) {
                obj[key] = encrypt(obj[key], password())
              }
            }
            allData[item.name] = data.content
          } else {
            for (let i = 0; i < data.length; i++) {
              const obj = data[i]
              for (const key in obj) {
                obj[key] = encrypt(obj[key], password())
              }
            }
            allData[item.name] = data
          }
        },
        (msg) => {
          appendLog(
            t("br.failed_backup_item", {
              item: t(`manage.sidemenu.${item.name}`),
            }) +
              ":" +
              msg,
            "error",
          )
        },
      )
    }
    download(
      "openlistnext_backup_" + new Date().toLocaleString() + ".json",
      allData,
    )
    appendLog(t("br.finish_backup"), "info")
  }
  const [addSettingsLoading, addSettings] = useFetch(
    (data: SettingItem[]): PEmptyResp => r.post("/admin/setting/save", data),
  )
  const [addUserLoading, addUser] = useFetch((user: User): PEmptyResp => {
    return r.post(`/admin/user/create`, user)
  })
  const [addStorageLoading, addStorage] = useFetch(
    (storage: Storage): PEmptyResp => {
      return r.post(`/admin/storage/create`, storage)
    },
  )
  const [addMetaLoading, addMeta] = useFetch((meta: Meta): PEmptyResp => {
    return r.post(`/admin/meta/create`, meta)
  })
  const [addShareLoading, addShare] = useFetch(
    (share: ShareInfo): PEmptyResp => {
      return r.post(`/share/create`, share)
    },
  )
  const [updateUserLoading, updateUser] = useFetch((user: User): PEmptyResp => {
    return r.post(`/admin/user/update`, user)
  })
  const [updateStorageLoading, updateStorage] = useFetch(
    (storage: Storage): PEmptyResp => {
      return r.post(`/admin/storage/update`, storage)
    },
  )
  const [updateMetaLoading, updateMeta] = useFetch((meta: Meta): PEmptyResp => {
    return r.post(`/admin/meta/update`, meta)
  })
  const [updateShareLoading, updateShare] = useFetch(
    (share: ShareInfo): PEmptyResp => {
      return r.post(`/share/update`, share)
    },
  )
  const normalizeDriverName = (
    driverName: string,
    availableDrivers: string[],
  ): string => {
    const norm = (driverName || "")
      .replace(/\s+/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
    if (!norm) return ""
    const matched = availableDrivers.find(
      (d) =>
        d.toLowerCase() === norm ||
        d.toLowerCase().replace(/[^a-z0-9]/g, "") === norm,
    )
    if (matched) return matched
    if (norm.startsWith("115")) return "115Open"
    if (norm.startsWith("123")) return "123Pan"
    if (norm.includes("aliyun")) return "AliyundriveOpen"
    if (norm.startsWith("baidu")) return "BaiduNetdisk"
    if (
      norm.startsWith("189") ||
      norm.includes("cloud189") ||
      norm.includes("ctyun")
    )
      return "Cloud189"
    if (norm === "onedriveapp") return "OnedriveAPP"
    if (norm.startsWith("onedrive")) return "Onedrive"
    if (norm.startsWith("google") || norm.includes("gdrive"))
      return "GoogleDrive"
    if (
      (norm.includes("thunder") || norm.includes("xunlei")) &&
      norm.includes("expert")
    )
      return "ThunderExpert"
    if (norm.includes("thunder") || norm.includes("xunlei")) return "Thunder"
    if (norm === "webdav" || norm === "webdavdriver") return "WebDav"
    if (norm === "wopan" || norm.includes("unicom") || norm.includes("woyun"))
      return "WoPan"
    if (norm === "quark" || norm === "quarkuc" || norm === "uc") return "Quark"
    if (norm === "weiyun" || norm.includes("weiyun")) return "WeiYun"
    if (
      [
        "s3",
        "doge",
        "dogecloud",
        "minio",
        "ceph",
        "aws",
        "r2",
        "b2",
        "cos",
        "oss",
        "kodo",
      ].includes(norm)
    )
      return "S3"
    if (norm.startsWith("github")) return "Github"
    if (norm === "local") return "Local"
    if (norm === "sftp") return "SFTP"
    if (norm === "ftp") return "FTP"
    return driverName || ""
  }

  const sanitizeStorageItem = (
    st: any,
    availableDrivers: string[],
  ): Storage | null => {
    if (!st || typeof st !== "object") return null
    const rawDriver = st.driver
    if (
      !rawDriver ||
      typeof rawDriver !== "string" ||
      rawDriver.trim() === "" ||
      rawDriver === "undefined" ||
      rawDriver === "null"
    ) {
      return null
    }
    const normDriver = normalizeDriverName(rawDriver, availableDrivers)
    const mountPath =
      "/" +
      String(st.mount_path || "")
        .split("/")
        .filter(Boolean)
        .join("/")

    let additionStr = "{}"
    if (typeof st.addition === "object" && st.addition !== null) {
      try {
        additionStr = JSON.stringify(st.addition)
      } catch {
        additionStr = "{}"
      }
    } else if (typeof st.addition === "string") {
      additionStr = st.addition
    }

    return {
      ...st,
      driver: normDriver,
      mount_path: mountPath,
      addition: additionStr,
    }
  }

  async function handleOvrData<T extends Record<string, any>>(
    dataArray: T[] | undefined,
    getDataFunc: { (): PResp<{ content: T[]; total: number }> },
    addDataFunc: {
      (t: T): PEmptyResp
    },
    updateDataFunc: {
      (t: T): PEmptyResp
    },
    idFieldName: keyof T,
    itemName: string,
    sanitizeFn?: (item: T) => T | null,
  ) {
    if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0)
      return
    const currentData = ((await getDataFunc()).data?.content || []) as T[]
    for (let i = 0; i < dataArray.length; i++) {
      let currentItem = dataArray[i]
      if (sanitizeFn) {
        const sanitized = sanitizeFn(currentItem)
        if (!sanitized) {
          appendLog(
            `[${t(itemName)}] 忽略无效项: ${(currentItem as any)[idFieldName] || i}`,
            "error",
          )
          continue
        }
        currentItem = sanitized
      }
      const currentIdValue = currentItem[idFieldName]
      const currentDataItem = currentData.find((d) => {
        if (idFieldName === "mount_path" || idFieldName === "path") {
          const p1 =
            "/" +
            String(d[idFieldName] || "")
              .split("/")
              .filter(Boolean)
              .join("/")
          const p2 =
            "/" +
            String(currentIdValue || "")
              .split("/")
              .filter(Boolean)
              .join("/")
          return p1 === p2
        }
        return d[idFieldName] === currentIdValue
      })

      if (currentDataItem) {
        ;(currentItem as any).id = (currentDataItem as any).id
        await handleRespWithoutNotify(
          await updateDataFunc(currentItem),
          () => {
            appendLog(
              t("br.success_restore_item", {
                item: t(itemName),
              }) + ` [${currentIdValue}]`,
              "success",
            )
          },
          (msg) => {
            appendLog(
              t("br.failed_restore_item", {
                item: t(itemName),
              }) + ` [${currentIdValue}]: ${msg}`,
              "error",
            )
          },
        )
      } else {
        ;(currentItem as any).id = 0
        await handleRespWithoutNotify(
          await addDataFunc(currentItem),
          () => {
            appendLog(
              t("br.success_restore_item", {
                item: t(itemName),
              }) + ` [${currentIdValue}]`,
              "success",
            )
          },
          (msg) => {
            appendLog(
              t("br.failed_restore_item", {
                item: t(itemName),
              }) + ` [${currentIdValue}]: ${msg}`,
              "error",
            )
          },
        )
      }
    }
  }

  const restoreLoading = () => {
    return (
      addSettingsLoading() ||
      addUserLoading() ||
      addStorageLoading() ||
      addMetaLoading() ||
      addShareLoading() ||
      updateUserLoading() ||
      updateStorageLoading() ||
      updateMetaLoading() ||
      updateShareLoading()
    )
  }

  const restore = async () => {
    appendLog(t("br.start_restore"), "info")
    const file = document.createElement("input")
    file.type = "file"
    file.accept = "application/json"
    file.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) {
        notify.warning(t("br.no_file"))
        return
      }
      const file = files[0]
      const reader = new FileReader()
      reader.onload = async () => {
        let data: Data
        try {
          data = JSON.parse(reader.result as string)
        } catch (err: any) {
          appendLog(`JSON 解析失败: ${err.message || String(err)}`, "error")
          return
        }

        const encrypted = Boolean(data.encrypted)
        if (encrypted) {
          if (
            decrypt(data.encrypted, password(), true, true) !== '"encrypted"'
          ) {
            appendLog(t("br.wrong_encrypt_password"), "error")
            return
          }
          for (const list of [
            data.settings,
            data.users,
            data.storages,
            data.metas,
            data.shares,
          ]) {
            if (Array.isArray(list)) {
              for (const obj of list) {
                if (obj && typeof obj === "object") {
                  for (const key in obj) {
                    ;(obj as Record<string, any>)[key] = decrypt(
                      (obj as Record<string, any>)[key],
                      password(),
                      false,
                      true,
                    )
                  }
                }
              }
            }
          }
        }

        // Fetch drivers for normalization
        let availableDrivers: string[] = []
        try {
          const driversResp: any = await r.get("/admin/driver/list")
          if (driversResp?.data) {
            availableDrivers = Object.keys(driversResp.data)
          }
        } catch {}

        if (override()) {
          await backup()
        }

        if (data.settings && Array.isArray(data.settings)) {
          handleRespWithoutNotify(
            await addSettings(
              data.settings.filter(
                (s) =>
                  s && s.key && !["version", "index_progress"].includes(s.key),
              ),
            ),
            () => {
              appendLog(
                t("br.success_restore_item", {
                  item: t("manage.sidemenu.settings"),
                }),
                "success",
              )
            },
            (msg) => {
              appendLog(
                t("br.failed_restore_item", {
                  item: t("manage.sidemenu.settings"),
                }) +
                  ":" +
                  msg,
                "error",
              )
            },
          )
        }

        if (override()) {
          await handleOvrData(
            data.users,
            getUsers,
            addUser,
            updateUser,
            "username",
            "manage.sidemenu.users",
          )
          await handleOvrData(
            data.storages,
            getStorages,
            addStorage,
            updateStorage,
            "mount_path",
            "manage.sidemenu.storages",
            (st) => sanitizeStorageItem(st, availableDrivers),
          )
          await handleOvrData(
            data.metas,
            getMetas,
            addMeta,
            updateMeta,
            "path",
            "manage.sidemenu.metas",
          )
          await handleOvrData(
            data.shares,
            getShares,
            addShare,
            updateShare,
            "id",
            "manage.sidemenu.shares",
          )
        } else {
          // Non-override mode: fetch current users once so we can skip
          // usernames that already exist (system ships with admin/guest,
          // recreating them would fail with 400 "already exists").
          const currentUsers = ((await getUsers()).data?.content ||
            []) as User[]
          const currentStorages = ((await getStorages()).data?.content ||
            []) as Storage[]
          const currentMetas = ((await getMetas()).data?.content ||
            []) as Meta[]
          const currentShares = ((await getShares()).data?.content ||
            []) as ShareInfo[]

          const sanitizedStorages: Storage[] = []
          for (const rawSt of data.storages || []) {
            const st = sanitizeStorageItem(rawSt, availableDrivers)
            if (st) {
              sanitizedStorages.push(st)
            } else {
              appendLog(
                `[${t("manage.sidemenu.storages")}] 忽略无效存储（缺少 driver 或 mount_path）: ${rawSt?.mount_path || "未知"}`,
                "error",
              )
            }
          }

          for (const item of [
            {
              name: "users",
              fn: addUser,
              data: data.users || [],
              key: "username",
              removeId: true,
              skipExisting: (itemData: any) =>
                currentUsers.some((u: any) => u.username === itemData.username),
            },
            {
              name: "storages",
              fn: addStorage,
              data: sanitizedStorages,
              key: "mount_path",
              removeId: true,
              skipExisting: (itemData: any) =>
                currentStorages.some(
                  (s: any) =>
                    "/" +
                      String(s.mount_path || "")
                        .split("/")
                        .filter(Boolean)
                        .join("/") ===
                    "/" +
                      String(itemData.mount_path || "")
                        .split("/")
                        .filter(Boolean)
                        .join("/"),
                ),
            },
            {
              name: "metas",
              fn: addMeta,
              data: data.metas || [],
              key: "path",
              removeId: true,
              skipExisting: (itemData: any) =>
                currentMetas.some((m: any) => m.path === itemData.path),
            },
            {
              name: "shares",
              fn: addShare,
              data: data.shares || [],
              key: "id",
              removeId: false,
              skipExisting: (itemData: any) =>
                currentShares.some((s: any) => s.id === itemData.id),
            },
          ] as const) {
            for (const itemData of item.data || []) {
              if (item.removeId) {
                ;(itemData as any).id = 0
              }
              if (item.skipExisting && item.skipExisting(itemData)) {
                appendLog(
                  t("br.skip_existing_item", {
                    item: t(`manage.sidemenu.${item.name}`),
                  }) + ` [ ${(itemData as any)[item.key]} ] `,
                  "info",
                )
                continue
              }
              handleRespWithoutNotify(
                await item.fn(itemData),
                () => {
                  appendLog(
                    t("br.success_restore_item", {
                      item: t(`manage.sidemenu.${item.name}`),
                    }) +
                      "-" +
                      `[${(itemData as any)[item.key]}]`,
                    "success",
                  )
                },
                (msg) => {
                  appendLog(
                    t("br.failed_restore_item", {
                      item: t(`manage.sidemenu.${item.name}`),
                    }) +
                      ` [ ${(itemData as any)[item.key]} ] ` +
                      ":" +
                      msg,
                    "error",
                  )
                },
              )
            }
          }
        }
        appendLog(t("br.finish_restore"), "info")
      }
      reader.readAsText(file)
    }
    file.click()
  }
  return (
    <VStack spacing="$2" w="$full">
      <HStack spacing="$2" w="$full">
        <Button
          loading={backupLoading()}
          onClick={() => {
            backup()
          }}
          colorScheme="accent"
        >
          {t("br.backup")}
        </Button>
        <Button
          loading={restoreLoading()}
          onClick={() => {
            restore()
          }}
        >
          {t("br.restore")}
        </Button>
      </HStack>
      <FormControl w="$full" display="flex" flexDirection="column">
        <Flex w="$full" direction="column" gap="$1">
          <FormLabel>{t(`br.override`)}</FormLabel>
          <HopeSwitch
            id="restore-override"
            checked={override()}
            onChange={(e: { currentTarget: HTMLInputElement }) =>
              setOverride(e.currentTarget.checked)
            }
          ></HopeSwitch>

          <FormLabel>{t(`br.encrypt_password`)}</FormLabel>
          <Input
            id="password"
            type="password"
            placeholder={t(`br.encrypt_password_placeholder`)}
            onInput={(e) => setPassword(e.currentTarget.value)}
          />
        </Flex>
      </FormControl>
      <VStack
        p="$2"
        ref={logRef!}
        w="$full"
        alignItems="start"
        rounded="$md"
        h="70vh"
        bg="$neutral3"
        overflowY="auto"
        spacing="$1"
      >
        <For each={log()}>{(item) => <Log {...item} />}</For>
      </VStack>
    </VStack>
  )
}

function download(filename: string, data: any) {
  const file = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(file)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default BackupRestore
