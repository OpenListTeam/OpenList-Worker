import { Accessor, createSignal } from "solid-js"
import { EmptyResp, PResp } from "~/types"

export const useLoading = <T>(
  p: (...arg: any[]) => Promise<T>,
  fetch?: boolean,
  t?: boolean, // initial loading true
): [Accessor<typeof t>, typeof p] => {
  const [loading, setLoading] = createSignal(t)
  return [
    loading,
    async (...arg: any[]) => {
      setLoading(true)
      const data = await p(...arg)
      if (!fetch || (data as EmptyResp).code !== 401) {
        // why?
        // because if setLoading(false) here will rerender before navigate
        // maybe cause some bugs
        setLoading(false)
      }
      return data
    },
  ]
}

// 配合handleResp使用
export const useFetch = <T>(
  p: (...arg: any[]) => Promise<T>,
  loading?: boolean,
): [Accessor<typeof loading>, typeof p] => {
  return useLoading(p, true, loading)
}

const useListLoading = <T, K>(
  p: (key: K, ...arg: any[]) => Promise<T>,
  fetch?: boolean,
  initial?: K,
): [Accessor<typeof initial>, typeof p] => {
  const [loading, setLoading] = createSignal(initial)
  return [
    loading,
    async (key: K, ...arg: any[]) => {
      setLoading(() => key)
      const data = await p(key, ...arg)
      if (!fetch || (data as EmptyResp).code !== 401) {
        setLoading(undefined)
      }
      return data
    },
  ]
}

export const useListFetch = <T, K>(
  p: (key: K, ...arg: any[]) => Promise<T>,
  initial?: K,
): [Accessor<typeof initial>, typeof p] => {
  return useListLoading(p, true, initial)
}
