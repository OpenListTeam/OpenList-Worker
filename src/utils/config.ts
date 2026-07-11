// api and base_path both don't endsWith /

export let base_path = ""
export const setBasePath = (path: string) => {
  base_path = path
  if (!base_path.startsWith("/")) {
    base_path = "/" + base_path
  }
  if (base_path.endsWith("/")) {
    base_path = base_path.slice(0, -1)
  }
}
if (window.OPENLIST_CONFIG.base_path) {
  setBasePath(window.OPENLIST_CONFIG.base_path)
}

export let api = import.meta.env.VITE_API_URL as string
if (window.OPENLIST_CONFIG.api) {
  api = window.OPENLIST_CONFIG.api
}
if (api === "/") {
  api = location.origin + base_path
}
if (api.endsWith("/")) {
  api = api.slice(0, -1)
}
