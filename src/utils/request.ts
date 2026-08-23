import axios from "axios"
import { api } from "./config"
import { log } from "./log"

const instance = axios.create({
  baseURL: api + "/api",
  // timeout: 5000
  headers: {
    "Content-Type": "application/json;charset=utf-8",
    // 'Authorization': localStorage.getItem("admin-token") || "",
  },
  withCredentials: false,
})

instance.interceptors.request.use(
  (config) => {
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
    // Guard against non-JSON responses (e.g. HTML 404 pages or empty bodies):
    // return a standard error object so callers never receive undefined fields.
    if (
      typeof resp !== "object" ||
      resp === null ||
      typeof resp.code !== "number"
    ) {
      return {
        code: response.status >= 400 ? response.status : 500,
        message:
          typeof resp === "string" && resp.length > 0
            ? resp.slice(0, 200)
            : `Unexpected response (HTTP ${response.status})`,
        data: null,
      }
    }
    return resp
  },
  (error) => {
    // response error
    console.error(error) // for debug
    // Prefer the backend's own error message (e.g. "Username already exists")
    // over axios's generic "Request failed with status code XXX".
    const serverMsg =
      error.response?.data &&
      typeof error.response.data === "object" &&
      typeof error.response.data.message === "string"
        ? error.response.data.message
        : undefined
    return {
      code: axios.isCancel(error) ? -1 : error.response?.status,
      message: serverMsg || error.message,
    }
  },
)

const _store = typeof sessionStorage !== "undefined" ? sessionStorage : localStorage

instance.defaults.headers.common["Authorization"] =
  _store.getItem("token") || ""

export const changeToken = (token?: string) => {
  instance.defaults.headers.common["Authorization"] = token ?? ""
  _store.setItem("token", token ?? "")
}

export { instance as r }
