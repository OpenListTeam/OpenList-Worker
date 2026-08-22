import { PluginItem, PluginPermission, Resp } from "~/types"
import { bus, loadCSS, loadScriptIIFE, notify, r } from "~/utils"

type PluginHookFn = (data?: any) => void | Promise<void>

interface FloatingWidget {
  id: string
  container: HTMLElement
}

export interface PluginCustomAction {
  id: string
  label: string
  icon?: string
  onClick: (context?: any) => void
  permission?: PluginPermission
}

class PluginEngine {
  private hooks: Map<string, Set<PluginHookFn>> = new Map()
  private activePlugins: PluginItem[] = []
  private loadedPluginIds: Set<string> = new Set()
  private floatingWidgets: Map<string, FloatingWidget> = new Map()
  private fileActions: Map<string, PluginCustomAction> = new Map()
  private headerActions: Map<string, PluginCustomAction> = new Map()
  private isInitialized = false

  public init() {
    if (typeof window === "undefined" || this.isInitialized) return
    this.isInitialized = true

    const self = this

    // Expose high-privilege OpenListPlugin SDK to the global window
    window.OpenListPlugin = {
      version: "2.0.0",
      bus,
      notify,
      // 1. High-privilege HTTP Client
      request: r,

      // 2. High-privilege Filesystem Operations
      fs: {
        list: (path: string, password = "", page = 1, per_page = 0) =>
          r.post("/fs/list", { path, password, page, per_page }),
        get: (path: string, password = "") =>
          r.post("/fs/get", { path, password }),
        mkdir: (path: string) => r.post("/fs/mkdir", { path }),
        rename: (path: string, name: string) =>
          r.post("/fs/rename", { path, name }),
        remove: (dir: string, names: string[]) =>
          r.post("/fs/remove", { dir, names }),
        copy: (src_dir: string, dst_dir: string, names: string[]) =>
          r.post("/fs/copy", { src_dir, dst_dir, names }),
        move: (src_dir: string, dst_dir: string, names: string[]) =>
          r.post("/fs/move", { src_dir, dst_dir, names }),
        form: (url: string, data: FormData) => r.post(url, data),
      },

      // 3. High-privilege Admin & System Operations
      admin: {
        getSettings: (group = 0) =>
          r.get(`/admin/setting/list?groups=${group}`),
        saveSettings: (settings: any[]) =>
          r.post("/admin/setting/save", settings),
        getStorages: () => r.get("/admin/storage/list"),
        loadAllStorages: () => r.post("/admin/storage/load_all"),
        getUsers: () => r.get("/admin/user/list"),
        getKvStatus: () => r.get("/admin/kv/status"),
      },

      // 4. Hook Event System
      registerHook: (hookName: string, fn: PluginHookFn) => {
        if (!self.hooks.has(hookName)) {
          self.hooks.set(hookName, new Set())
        }
        self.hooks.get(hookName)!.add(fn)
        return () => {
          self.hooks.get(hookName)?.delete(fn)
        }
      },
      emitHook: (hookName: string, data?: any) => {
        return self.emitHook(hookName, data)
      },

      // 5. Config & Permissions API
      getConfig: (pluginId: string) => {
        const plugin = self.activePlugins.find((p) => p.id === pluginId)
        return plugin?.config_values || {}
      },
      hasPermission: (pluginId: string, permission: PluginPermission) => {
        const plugin = self.activePlugins.find((p) => p.id === pluginId)
        if (!plugin) return false
        if (plugin.high_privilege) return true
        return (plugin.permissions || []).includes(permission)
      },

      // 6. UI & Widget Injections
      addFloatingWidget: (
        id: string,
        renderFnOrHtml: string | ((container: HTMLElement) => void),
      ) => {
        return self.mountFloatingWidget(id, renderFnOrHtml)
      },
      removeFloatingWidget: (id: string) => {
        self.unmountFloatingWidget(id)
      },
      registerFileAction: (action: PluginCustomAction) => {
        self.fileActions.set(action.id, action)
        bus.emit("plugin:file_action_registered", action)
      },
      registerHeaderAction: (action: PluginCustomAction) => {
        self.headerActions.set(action.id, action)
        bus.emit("plugin:header_action_registered", action)
      },
      getFileActions: () => Array.from(self.fileActions.values()),
      getHeaderActions: () => Array.from(self.headerActions.values()),

      // 7. Dynamic Assets & Utility Loaders
      loadScript: loadScriptIIFE,
      loadCSS: loadCSS,
      injectCSS: (id: string, css: string) => {
        const styleId = `oplist-plugin-injected-${id}`
        let el = document.getElementById(styleId) as HTMLStyleElement | null
        if (!el) {
          el = document.createElement("style")
          el.id = styleId
          document.head.appendChild(el)
        }
        el.textContent = css
        return el
      },

      getActivePlugins: () => [...self.activePlugins],
    }

    // Forward routing events
    bus.on("to", (path: string) => {
      this.emitHook("router:change", { path })
    })
    bus.on("pathname", (pathname: string) => {
      this.emitHook("router:pathname", { pathname })
    })

    // Load active plugins asynchronously
    this.loadActivePlugins().catch((err) => {
      console.warn("[PluginEngine] Failed to load plugins:", err)
    })
  }

  public async loadActivePlugins(): Promise<void> {
    try {
      const resp: Resp<PluginItem[]> = await r.get("/public/plugins")
      if (resp && resp.code === 200 && Array.isArray(resp.data)) {
        this.activePlugins = resp.data
        for (const plugin of this.activePlugins) {
          await this.loadPlugin(plugin)
        }
        this.emitHook("plugins:loaded", { count: this.activePlugins.length })
      }
    } catch (e) {
      console.warn("[PluginEngine] Could not fetch public plugins:", e)
    }
  }

  public async loadPlugin(plugin: PluginItem): Promise<boolean> {
    if (!plugin.enabled) return false

    // 1. Inject custom CSS
    if (plugin.style_content && plugin.style_content.trim()) {
      const styleId = `oplist-plugin-style-${plugin.id}`
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
      if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = styleId
        styleEl.setAttribute("data-plugin-id", plugin.id)
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = plugin.style_content
    }

    // 2. Load external entry_url
    if (plugin.entry_url && plugin.entry_url.trim()) {
      try {
        if (plugin.entry_url.endsWith(".css")) {
          await loadCSS(plugin.entry_url, `oplist-plugin-ext-css-${plugin.id}`)
        } else {
          await loadScriptIIFE(
            plugin.entry_url,
            `oplist-plugin-ext-js-${plugin.id}`,
          )
        }
      } catch (err) {
        console.error(
          `[PluginEngine] Failed to load external entry for plugin ${plugin.id}:`,
          err,
        )
      }
    }

    // 3. Execute script with high-privilege context
    if (plugin.script_content && plugin.script_content.trim()) {
      try {
        const scriptFn = new Function(
          "OpenListPlugin",
          "plugin",
          "config",
          "privilege",
          `"use strict";\ntry {\n${plugin.script_content}\n} catch (err) { console.error("[Plugin ${plugin.id}] Runtime error:", err); }`,
        )
        scriptFn(window.OpenListPlugin, plugin, plugin.config_values || {}, {
          isHighPrivilege: Boolean(plugin.high_privilege),
          permissions: plugin.permissions || [],
        })
      } catch (err) {
        console.error(
          `[PluginEngine] Script execution error in plugin ${plugin.id}:`,
          err,
        )
      }
    }

    this.loadedPluginIds.add(plugin.id)
    return true
  }

  public unloadPlugin(pluginId: string) {
    const styleEl = document.getElementById(`oplist-plugin-style-${pluginId}`)
    if (styleEl) styleEl.remove()

    const extCssEl = document.getElementById(
      `oplist-plugin-ext-css-${pluginId}`,
    )
    if (extCssEl) extCssEl.remove()

    const extJsEl = document.getElementById(`oplist-plugin-ext-js-${pluginId}`)
    if (extJsEl) extJsEl.remove()

    const injectedEl = document.getElementById(
      `oplist-plugin-injected-${pluginId}`,
    )
    if (injectedEl) injectedEl.remove()

    this.unmountFloatingWidget(pluginId)
    this.loadedPluginIds.delete(pluginId)
    this.activePlugins = this.activePlugins.filter((p) => p.id !== pluginId)
  }

  public emitHook(hookName: string, data?: any) {
    const fns = this.hooks.get(hookName)
    if (!fns || fns.size === 0) return
    for (const fn of fns) {
      try {
        fn(data)
      } catch (err) {
        console.error(`[PluginEngine] Hook '${hookName}' error:`, err)
      }
    }
  }

  public mountFloatingWidget(
    id: string,
    content: string | ((container: HTMLElement) => void),
  ): HTMLElement {
    this.unmountFloatingWidget(id)

    const container = document.createElement("div")
    container.id = `oplist-floating-widget-${id}`
    container.setAttribute("data-plugin-widget", id)
    container.style.position = "fixed"
    container.style.zIndex = "999"
    container.style.pointerEvents = "auto"

    if (typeof content === "string") {
      container.innerHTML = content
    } else if (typeof content === "function") {
      content(container)
    }

    document.body.appendChild(container)
    this.floatingWidgets.set(id, { id, container })
    return container
  }

  public unmountFloatingWidget(id: string) {
    const existing = this.floatingWidgets.get(id)
    if (existing && existing.container) {
      existing.container.remove()
      this.floatingWidgets.delete(id)
    }
  }
}

export const pluginEngine = new PluginEngine()
export const initPluginEngine = () => pluginEngine.init()
