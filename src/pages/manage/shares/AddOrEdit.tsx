import { useFetch, useRouter, useT } from "~/hooks"
import { PResp, Share, ShareInfo, ShareUpdate, Type } from "~/types"
import { handleResp, notify, r, randomPwd, getExpireDate } from "~/utils"
import { createStore } from "solid-js/store"
import { Button, Heading } from "@hope-ui/solid"
import { MaybeLoading } from "~/components"
import { ResponsiveGrid } from "../common/ResponsiveGrid"
import { batch, createSignal, Show } from "solid-js"
import { Item } from "./Item"
import { me } from "~/store"

const AddOrEdit = () => {
  const t = useT()
  const { params, back, to } = useRouter()
  const { id } = params
  const [shareLoading, loadShare] = useFetch(
    (): PResp<ShareInfo> => r.get(`/share/get?id=${id}`),
    true,
  )
  const [share, setShare] = createStore<Share | ShareUpdate>({} as Share)
  const [files, setFiles] = createSignal("")
  const [filesValid, setFilesValid] = createSignal(false)
  const [expireString, setExpireString] = createSignal("")
  const [expireValid, setExpireValid] = createSignal(true)
  const initEdit = async () => {
    const shareResp = await loadShare()
    handleResp(shareResp, (shareData) => {
      batch(() => {
        setShare(shareData as ShareUpdate)
        setFiles(shareData.files.join("\n"))
        if (shareData.expires) {
          setExpireString(new Date(shareData.expires).toLocaleString())
        }
        setFilesValid(true)
      })
    })
  }
  if (id) {
    initEdit()
  }
  const [okLoading, ok] = useFetch((): PResp<ShareInfo> => {
    return r.post(`/share/${id ? "update" : "create"}`, share)
  })
  return (
    <MaybeLoading loading={id ? shareLoading() : false}>
      <Heading mb="$2">{t(`global.${id ? "edit" : "add"}`)}</Heading>
      <ResponsiveGrid>
        <Item
          name="id"
          type={Type.String}
          value={id ? ((share as ShareUpdate).new_id ?? id) : (share.id ?? "")}
          valid
          placeholder={id ? id : t("shares.id_placeholder")}
          onChange={(v) => {
            if (id) {
              setShare({ ...share, new_id: v } as any)
            } else {
              setShare({ ...share, id: v } as any)
            }
          }}
        />
        <Item
          name="files"
          type={Type.MultiPath}
          value={files()}
          valid={filesValid()}
          basePath={me().base_path}
          required
          onChange={(f) => {
            setFiles(f)
            setFilesValid(f.length > 0)
            setShare("files", f.split("\n"))
          }}
        />
        <Item
          name="remark"
          type={Type.Text}
          value={share.remark}
          valid
          onChange={(r) => {
            setShare("remark", r)
          }}
        />
        <Item
          name="extract_folder"
          type={Type.Select}
          value={share.extract_folder}
          valid
          options="front,back"
          onChange={(o: any) => {
            setShare("extract_folder", o)
          }}
        />
        <Item
          name="order_by"
          type={Type.Select}
          value={share.order_by}
          valid
          options="name,size,modified"
          onChange={(o: any) => {
            setShare("order_by", o)
          }}
        />
        <Item
          name="order_direction"
          type={Type.Select}
          value={share.order_direction}
          valid
          options="asc,desc"
          onChange={(o: any) => {
            setShare("order_direction", o)
          }}
        />
        <Item
          name="pwd"
          type={Type.String}
          value={share.pwd}
          valid
          onChange={(p) => {
            setShare("pwd", p)
          }}
          random={randomPwd}
        />
        <Item
          name="max_accessed"
          type={Type.Number}
          value={share.max_accessed}
          valid
          onChange={(m) => {
            setShare("max_accessed", m)
          }}
        />
        <Show when={id}>
          <Item
            name="accessed"
            type={Type.Number}
            value={(share as ShareUpdate).accessed}
            valid
            onChange={(a) => {
              setShare({ ...share, accessed: a })
            }}
          />
        </Show>
        <Item
          name="expires"
          type={Type.String}
          value={expireString()}
          valid={expireValid()}
          placeholder="yyyy-MM-dd HH:mm:ss or +1w1d1H1m1s1ms"
          onChange={(e) => {
            setExpireString(e)
            if (e === "") {
              setExpireValid(true)
              setShare("expires", null)
              return
            }
            const date = getExpireDate(e)
            if (isNaN(date.getTime())) {
              setExpireValid(false)
            } else {
              setExpireValid(true)
              setShare("expires", date.toISOString())
            }
          }}
        />
        <Item
          name="readme"
          type={Type.Text}
          value={share.readme}
          valid
          onChange={(r) => {
            setShare("readme", r)
          }}
        />
        <Item
          name="header"
          type={Type.Text}
          value={share.header}
          valid
          onChange={(h) => {
            setShare("header", h)
          }}
        />
      </ResponsiveGrid>
      <Button
        mt="$2"
        disabled={!expireValid() || !filesValid()}
        loading={okLoading()}
        onClick={async () => {
          const resp = await ok()
          handleResp(
            resp,
            () => {
              notify.success(t("global.save_success"))
              back()
            },
            (_msg, _code) => {
              if (resp.data.id) {
                to(`/@manage/shares/edit/${resp.data.id}`)
              }
            },
          )
        }}
      >
        {t(`global.${id ? "save" : "add"}`)}
      </Button>
    </MaybeLoading>
  )
}

export default AddOrEdit
