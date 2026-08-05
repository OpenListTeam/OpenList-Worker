import {
  Center,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import { Match, Show, Switch } from "solid-js"
import type { Accessor } from "solid-js"
import { useT } from "~/hooks"
import { DriverItem, Type } from "~/types"
import { SelectOptions } from "~/components"

export type ItemProps = DriverItem & {
  readonly?: boolean
  full_name_path?: string
  options_prefix?: string
  driver?: string
} & (
    | {
        type: Type.Bool
        onChange?: (value: boolean) => void
        value: boolean | Accessor<boolean>
      }
    | {
        type: Type.Number
        onChange?: (value: number) => void
        value: number | Accessor<number>
      }
    | {
        type: Type.Float
        onChange?: (value: number) => void
        value: number | Accessor<number>
      }
    | {
        type: Type.String | Type.Text
        onChange?: (value: string) => void
        value: string | Accessor<string>
      }
    | {
        type: Type.Select
        searchable?: boolean
        onChange?: (value: string) => void
        value: string | Accessor<string>
      }
  )

const commonDriverLabels: Record<string, string> = {
  root_folder_path: "根目录路径",
  root_folder_id: "根目录 ID",
  region: "区域 / 版本",
  is_sharepoint: "是否为 SharePoint 站点",
  use_online_api: "使用在线 API 授权",
  api_url_address: "API 接口地址",
  client_id: "Client ID (客户端 ID)",
  client_secret: "Client Secret (客户端密钥)",
  redirect_uri: "重定向 URI",
  refresh_token: "Refresh Token (刷新令牌)",
  access_token: "Access Token (访问令牌)",
  site_id: "Site ID (站点 ID)",
  chunk_size: "分块上传大小 (MB)",
  custom_host: "自定义下载域名",
  disable_disk_usage: "禁用容量用量计算",
  enable_direct_upload: "开启客户端直传",
  endpoint: "Endpoint 端点节点",
  bucket: "Bucket 存储桶",
  access_key_id: "Access Key ID",
  secret_access_key: "Secret Access Key",
  username: "用户名",
  password: "密码",
  token: "Token 令牌",
  cookie: "Cookie 凭据",
  url: "URL 地址",
  host: "服务器主机地址",
  port: "端口号",
  remark: "备注说明",
  order: "列表显示排序",
  order_by: "默认排序字段",
  order_direction: "默认排序方向",
  limit_rate: "API 请求限速",
  page_size: "单页展示数量",
  upload_threads: "上传并发线程数",
  download_threads: "下载并发线程数",
  show_hidden: "显示隐藏文件",
  directory_size: "统计目录容量",
}

const commonDriverTips: Record<string, string> = {
  "custom_host-tips": "用于文件下载直链的自定义 CDN 加速域名",
  "disable_disk_usage-tips": "开启后禁用对此存储磁盘容量与用量的自动计算与展示",
  "enable_direct_upload-tips": "开启后支持客户端直接上传至云盘，提升传输效率",
}

const Item = (props: ItemProps) => {
  const t = useT()
  const getVal = <T,>(v: T | Accessor<T>) =>
    (typeof v === "function" ? (v as Accessor<T>)() : v) as T

  const getLabel = () => {
    const key =
      (props.full_name_path ?? props.driver === "common")
        ? `storages.common.${props.name}`
        : `drivers.${props.driver}.${props.name}`
    const translated = t(key)
    if (
      translated &&
      translated !== key &&
      !translated.startsWith("drivers.") &&
      !translated.startsWith("storages.")
    ) {
      if (
        commonDriverLabels[props.name] &&
        /^[A-Z][a-z0-9_\s]*$/.test(translated)
      ) {
        return commonDriverLabels[props.name]
      }
      return translated
    }
    return commonDriverLabels[props.name] || props.name
  }

  const getTip = () => {
    const key =
      props.driver === "common"
        ? `storages.common.${props.name}-tips`
        : `drivers.${props.driver}.${props.name}-tips`
    const translated = t(key)
    if (
      translated &&
      translated !== key &&
      !translated.startsWith("drivers.") &&
      !translated.startsWith("storages.")
    ) {
      return translated
    }
    return commonDriverTips[`${props.name}-tips`] || ""
  }

  return (
    <FormControl
      w="$full"
      display="flex"
      flexDirection="column"
      required={props.required}
    >
      <FormLabel for={props.name} display="flex" alignItems="center">
        {getLabel()}
      </FormLabel>
      <Switch fallback={<Center>{t("settings.unknown_type")}</Center>}>
        <Match when={props.type === Type.String}>
          <Input
            id={props.name}
            type={props.name == "password" ? "password" : "text"}
            readOnly={props.readonly}
            value={getVal(props.value as string | Accessor<string>)}
            onChange={
              props.type === Type.String
                ? (e) => props.onChange?.(e.currentTarget.value)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Number}>
          <Input
            type="number"
            id={props.name}
            readOnly={props.readonly}
            value={getVal(props.value as number | Accessor<number>)}
            onInput={
              props.type === Type.Number
                ? (e) => props.onChange?.(parseInt(e.currentTarget.value))
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Float}>
          <Input
            type="number"
            id={props.name}
            readOnly={props.readonly}
            value={getVal(props.value as number | Accessor<number>)}
            onInput={
              props.type === Type.Float
                ? (e) => props.onChange?.(parseFloat(e.currentTarget.value))
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Bool}>
          <HopeSwitch
            id={props.name}
            readOnly={props.readonly}
            checked={getVal(props.value as boolean | Accessor<boolean>)}
            onChange={
              props.type === Type.Bool
                ? (e: any) => props.onChange?.(e.currentTarget.checked)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Text}>
          <Textarea
            id={props.name}
            readOnly={props.readonly}
            value={getVal(props.value as string | Accessor<string>)}
            onChange={
              props.type === Type.Text
                ? (e) => props.onChange?.(e.currentTarget.value)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Select}>
          <Select
            id={props.name}
            readOnly={props.readonly}
            value={getVal(props.value as string | Accessor<string>)}
            onChange={
              props.type === Type.Select
                ? (e) => props.onChange?.(e)
                : undefined
            }
          >
            <SelectOptions
              readonly={props.readonly}
              searchable={props.type === Type.Select && props.searchable}
              options={props.options.split(",").map((key) => ({
                key,
                label: t(
                  (props.options_prefix ??
                    (props.driver === "common"
                      ? `storages.common.${props.name}s`
                      : `drivers.${props.driver}.${props.name}s`)) + `.${key}`,
                ),
              }))}
            />
          </Select>
        </Match>
      </Switch>
      <Show when={props.help && getTip()}>
        <FormHelperText>{getTip()}</FormHelperText>
      </Show>
    </FormControl>
  )
}

export { Item }
