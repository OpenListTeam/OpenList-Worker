import axios from "axios"
import type { AxiosRequestConfig, AxiosResponse } from "axios"
import { api } from "./config"
import { log } from "./log"

const baseURL = api.endsWith("/api") ? api : api + "/api"

const serverlessFetchAdapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
  let url = config.url || ""
  if (config.baseURL && !url.startsWith("http")) {
    url = config.baseURL.replace(/\/$/, "") + "/" + url.replace(/^\//, "")
  }
  
  if (config.params) {
    const searchParams = new URLSearchParams()
    for (const [k, v] of Object.entries(config.params)) {
      if (v !== undefined && v !== null) {
        searchParams.append(k, String(v))
      }
    }
    const q = searchParams.toString()
    if (q) {
      url += (url.includes('?') ? '&' : '?') + q
    }
  }

  const headers = new Headers()
  if (config.headers) {
    for (const [k, v] of Object.entries(config.headers)) {
      if (v !== undefined && v !== null) {
        headers.set(k, String(v))
      }
    }
  }

  const fetchOptions: RequestInit = {
    method: config.method?.toUpperCase() || 'GET',
    headers,
  }

  if (config.data) {
    fetchOptions.body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
  }

  if (config.signal) {
    fetchOptions.signal = config.signal as AbortSignal
  }

  const response = await fetch(url, fetchOptions)

  let data: any
  if (config.responseType === 'blob') {
    data = await response.blob()
  } else if (config.responseType === 'arraybuffer') {
    data = await response.arrayBuffer()
  } else {
    data = await response.text()
    try {
      if (data) {
        data = JSON.parse(data)
      }
    } catch (e) {
      // Ignore
    }
  }

  const result: AxiosResponse = {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: {} as any, // Axios expects a specific headers format but mostly we just need response data
    config: config as any,
    request: {},
  }

  if (!response.ok) {
    const error: any = new Error(response.statusText)
    error.response = result
    error.config = config
    error.request = {}
    throw error
  }

  return result
}

const instance = axios.create({
  baseURL,
  // timeout: 5000
  headers: {
    "Content-Type": "application/json;charset=utf-8",
    // 'Authorization': localStorage.getItem("admin-token") || "",
  },
  withCredentials: false,
  adapter: serverlessFetchAdapter,
})

instance.interceptors.request.use(
  async (config) => {
    // do something before request is sent
    return config
  },
  (error) => {
    // do something with request error
    console.log("Error: " + error.message) // for debug
    return Promise.reject(error)
  },
)

// response interceptor
instance.interceptors.response.use(
  (response) => {
    const resp = response.data
    log(resp)
    return resp
  },
  (error) => {
    // response error
    console.error(error) // for debug
    // notificationService.show({
    //   status: "danger",
    //   title: error.code,
    //   description: error.message,
    // });
    return {
      code: axios.isCancel(error) ? -1 : error.response?.status,
      message: error.message,
    }
  },
)

instance.defaults.headers.common["Authorization"] =
  typeof localStorage !== "undefined" ? (localStorage.getItem("token") || "") : ""

export const changeToken = (token?: string) => {
  instance.defaults.headers.common["Authorization"] = token ?? ""
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("token", token ?? "")
  }
}

// Add getUri to mimic axios instance for SSO login redirects
;(instance as any).getUri = (config?: any) => {
  return baseURL
}

export { instance as r }
