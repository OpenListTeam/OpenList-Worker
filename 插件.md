# OpenListNext 插件开发官方指南

欢迎阅读 **OpenListNext 插件开发文档**。OpenListNext 提供了强大、轻量且高度灵活的插件系统，支持开发者通过标准的前端技术栈（JavaScript / CSS / SVG）开发各类界面悬浮挂件、文件操作扩展、自定义主题、数据预览及系统集成工具。

---

## 目录

- [一、插件系统架构与运行机制](#一插件系统架构与运行机制)
- [二、插件包标准文件结构](#二插件包标准文件结构)
- [三、清单配置文件 `plugin.json` 规范](#三清单配置文件-pluginjson-规范)
  - [1. 基础元数据字段](#1-基础元数据字段)
  - [2. 可视化配置项 `config_schema`](#2-可视化配置项-config_schema)
  - [3. 权限声明字典 `permissions`](#3-权限声明字典-permissions)
- [四、核心运行时 SDK（`OpenListPlugin` API）](#四核心运行时-sdkopenlistplugin-api)
  - [1. 执行上下文与入口参数](#1-执行上下文与入口参数)
  - [2. UI 悬浮挂件与操作项注入](#2-ui-悬浮挂件与操作项注入)
  - [3. 事件总线与生命周期钩子](#3-事件总线与生命周期钩子)
  - [4. 消息与弹窗提示（Notify）](#4-消息与弹窗提示notify)
  - [5. 动态资源与样式注入](#5-动态资源与样式注入)
  - [6. 文件系统 API（FileSystem）](#6-文件系统-apifilesystem)
  - [7. 管理员与系统配置 API（Admin）](#7-管理员与系统配置-apiadmin)
- [五、完整开发实战范例（从零到一）](#五完整开发实战范例从零到一)
  - [1. `plugin.json`](#1-pluginjson)
  - [2. `index.js`](#2-indexjs)
  - [3. `style.css`](#3-stylecss)
  - [4. `icon.svg`](#4-iconsvg)
  - [5. `README.md`](#5-readmemd)
- [六、打包、安装与调试](#六打包安装与调试)
- [七、开发最佳实践与安全规范](#七开发最佳实践与安全规范)

---

## 一、插件系统架构与运行机制

OpenListNext 的插件具备以下设计特性：

1. **零构建门槛**：无需复杂的 Webpack / Vite 本地编译链，纯原生 JavaScript（ES6+）与 CSS 即可编写。
2. **安全隔离执行**：每个插件在独立封装的函数作用域内运行，避免全局变量污染。
3. **后台可视化配置**：通过在 `plugin.json` 中声明 `config_schema`，系统后台会自动为用户生成设置表单（支持下拉、布尔、输入框、多行文本等）。
4. **一键打包分发**：以标准 `.zip` 压缩包形式分发，管理后台支持拖拽上传一键解压并热加载运行。

---

## 二、插件包标准文件结构

一个标准且功能完备的插件包目录结构如下（压缩时直接将这 5 个文件置于 ZIP 根目录）：

```text
oplist-plugin-example.zip
├── plugin.json       # [必须] 插件清单与配置架构元数据
├── index.js          # [必须] 插件主逻辑脚本
├── style.css         # [可选/推荐] 插件专属样式表
├── icon.svg          # [推荐] 插件矢量图标（或 icon.png）
└── README.md         # [推荐] 插件使用说明与文档
```

---

## 三、清单配置文件 `plugin.json` 规范

`plugin.json` 是插件的身份标识与元数据定义文件。

### 1. 基础元数据字段

```json
{
  "id": "oplist-plugin-mywidget",
  "name": "快捷工具挂件",
  "version": "1.0.0",
  "description": "在右下角提供便捷工具与快捷操作面板",
  "author": "OpenList Developer",
  "homepage": "https://openlistnext.org",
  "repository": "https://github.com/example/oplist-plugin-mywidget",
  "type": "ui",
  "enabled": true,
  "high_privilege": false,
  "permissions": ["dom:inject", "fs:read"],
  "tags": ["UI", "工具", "挂件"],
  "config_schema": [],
  "config_values": {}
}
```

| 字段名           | 类型       | 是否必填 | 说明                                                                                      |
| :--------------- | :--------- | :------- | :---------------------------------------------------------------------------------------- |
| `id`             | `string`   | 是       | 插件唯一 ID，建议以 `oplist-plugin-` 为前缀，全小写中划线命名                             |
| `name`           | `string`   | 是       | 插件在管理后台展示的名称                                                                  |
| `version`        | `string`   | 是       | 语义化版本号，如 `1.0.0`                                                                  |
| `description`    | `string`   | 否       | 插件功能简短介绍                                                                          |
| `author`         | `string`   | 否       | 开发者或组织名称                                                                          |
| `type`           | `string`   | 否       | 插件类型：`"ui"` \| `"preview"` \| `"tool"` \| `"theme"` \| `"integration"` \| `"system"` |
| `enabled`        | `boolean`  | 否       | 安装后的初始启用状态，默认 `true`                                                         |
| `high_privilege` | `boolean`  | 否       | 是否请求 Root 级管理员特权，默认 `false`                                                  |
| `permissions`    | `string[]` | 否       | 申请的细粒度权限列表（见下文）                                                            |
| `tags`           | `string[]` | 否       | 标签分类，便于检索                                                                        |
| `config_schema`  | `array`    | 否       | 可视化配置项定义数组（见下文）                                                            |
| `config_values`  | `object`   | 否       | 默认配置项初始键值对                                                                      |

---

### 2. 可视化配置项 `config_schema`

系统会根据 `config_schema` 自动渲染后台配置面板：

```json
"config_schema": [
  {
    "key": "position",
    "label": "屏幕显示位置",
    "type": "select",
    "options": ["left-bottom (左下角)", "right-bottom (右下角)"],
    "defaultValue": "right-bottom (右下角)",
    "description": "设置悬浮组件在屏幕上的贴边显示位置"
  },
  {
    "key": "theme_color",
    "label": "主题高亮色",
    "type": "string",
    "defaultValue": "#3b82f6",
    "description": "支持 HEX 或 CSS 颜色格式"
  },
  {
    "key": "refresh_interval",
    "label": "自动刷新频率 (秒)",
    "type": "number",
    "defaultValue": 30,
    "description": "设置数据刷新间隔秒数"
  },
  {
    "key": "enable_notify",
    "label": "开启操作结果消息弹窗",
    "type": "bool",
    "defaultValue": true,
    "description": "关闭后将不弹出提示气泡"
  },
  {
    "key": "custom_notice",
    "label": "自定义公告文本",
    "type": "text",
    "defaultValue": "欢迎访问！",
    "description": "多行文本提示内容"
  }
]
```

#### 支持的配置类型（`type`）：

- `"string"`：单行文本输入框
- `"number"`：数字输入框
- `"bool"`：布尔开关 Switch
- `"select"`：下拉选择框（需在 `options` 字段提供字符串数组）
- `"text"`：多行文本输入框（Textarea）

---

### 3. 权限声明字典 `permissions`

系统采用基于最小权限原则的安全设计，按需在 `permissions` 中声明：

| 权限标识          | 权限说明           | 典型使用场景                                    |
| :---------------- | :----------------- | :---------------------------------------------- |
| `dom:inject`      | 页面 DOM 注入权限  | 挂载悬浮挂件、插入自定义按钮、动态注入 CSS 样式 |
| `router:hijack`   | 路由监听与响应权限 | 监听页面 URL/目录切换事件                       |
| `network:fetch`   | 发起网络请求权限   | 调用外部第三方 API、获取公网数据                |
| `fs:read`         | 文件系统只读权限   | 调用目录浏览、获取文件直链及详情                |
| `fs:write`        | 文件系统写入权限   | 创建目录、重命名、复制、移动文件                |
| `fs:delete`       | 文件系统删除权限   | 删除文件或目录                                  |
| `storage:manage`  | 存储策略管理权限   | 读取或变更底层挂载的网盘与存储策略              |
| `settings:manage` | 系统全局设置权限   | 读取或保存系统设置                              |
| `user:manage`     | 用户账户管理权限   | 获取或维护系统用户清单                          |
| `system:admin`    | 最高管理员特权     | 包含上述所有权限及系统底层管理能力              |

---

## 四、核心运行时 SDK（`OpenListPlugin` API）

### 1. 执行上下文与入口参数

当插件启用时，`index.js` 会被自动执行。可以在脚本内直接使用传入的 4 个局部参数，也可以通过 `window.OpenListPlugin` 访问全局 SDK：

```javascript
/**
 * @param {Object} OpenListPlugin - 插件核心运行时 SDK
 * @param {Object} plugin         - 当前插件的 manifest 完整元数据
 * @param {Object} config         - 用户在后台设置的键值对 Record<string, any>
 * @param {Object} privilege      - 权限对象 { isHighPrivilege: boolean, permissions: string[] }
 */
;(function (OpenListPlugin, plugin, config, privilege) {
  "use strict"

  console.log(`[${plugin.name}] 正在初始化，版本: ${plugin.version}`)
  console.log("当前用户配置:", config)

  // 业务逻辑代码...
})(OpenListPlugin, plugin, config, privilege)
```

---

### 2. UI 悬浮挂件与操作项注入

#### ① `OpenListPlugin.addFloatingWidget(id, renderFnOrHtml)`

在页面上挂载全局悬浮组件容器（位于 `document.body`，`z-index: 999`）。

- **参数**：
  - `id` (`string`): 挂件唯一 ID。
  - `renderFnOrHtml` (`string | (container: HTMLElement) => void`): HTML 字符串或渲染回调函数。
- **返回值**：`HTMLElement`（容器节点）。

```javascript
// 方式 A：直接传入 HTML 模板
const widget = OpenListPlugin.addFloatingWidget(
  "my-status-widget",
  `
  <div class="my-widget-box">
    <span class="my-widget-title">欢迎使用 OpenList</span>
  </div>
`,
)

// 方式 B：传入回调函数进行精细化 DOM 控制与事件绑定
OpenListPlugin.addFloatingWidget("my-interactive-widget", (container) => {
  container.className = "my-floating-panel"
  const btn = document.createElement("button")
  btn.textContent = "点击操作"
  btn.onclick = () => OpenListPlugin.notify.info("按钮被点击")
  container.appendChild(btn)
})
```

#### ② `OpenListPlugin.removeFloatingWidget(id)`

卸载指定 ID 的悬浮挂件并清理 DOM。

```javascript
OpenListPlugin.removeFloatingWidget("my-status-widget")
```

#### ③ `OpenListPlugin.registerFileAction(action)`

在文件列表的操作菜单中注入自定义操作按钮。

```javascript
OpenListPlugin.registerFileAction({
  id: "action-copy-url",
  label: "复制外部直链",
  icon: "🔗", // 图标或 SVG 字符串
  permission: "fs:read",
  onClick: (context) => {
    console.log("选中的文件对象:", context)
    if (context && context.raw_url) {
      navigator.clipboard.writeText(context.raw_url)
      OpenListPlugin.notify.success("直链已复制到剪贴板！")
    }
  },
})
```

#### ④ `OpenListPlugin.registerHeaderAction(action)`

在系统顶部导航工具栏中注入操作按钮。

```javascript
OpenListPlugin.registerHeaderAction({
  id: "action-header-refresh",
  label: "刷新视图",
  onClick: () => {
    OpenListPlugin.bus.emit("to", window.location.pathname)
    OpenListPlugin.notify.info("已触发刷新")
  },
})
```

---

### 3. 事件总线与生命周期钩子

#### ① 全局事件总线（`bus`）

- `OpenListPlugin.bus.on(event, handler)`：监听事件
- `OpenListPlugin.bus.off(event, handler)`：取消监听
- `OpenListPlugin.bus.emit(event, data)`：触发自定义事件

```javascript
// 监听路由跳转
OpenListPlugin.bus.on("to", (targetPath) => {
  console.log("路由将要跳转到:", targetPath)
})

// 监听路径更新
OpenListPlugin.bus.on("pathname", (pathname) => {
  console.log("当前路径变更为:", pathname)
})
```

#### ② 系统生命周期钩子（`registerHook`）

- `OpenListPlugin.registerHook(hookName, async (data) => {})`

系统内置支持的钩子：

- `"router:change"`：路由跳转时触发，接收 `{ path }`
- `"router:pathname"`：路径变动时触发，接收 `{ pathname }`
- `"plugins:loaded"`：所有插件加载就绪时触发，接收 `{ count }`

```javascript
const unhook = OpenListPlugin.registerHook(
  "router:pathname",
  ({ pathname }) => {
    if (pathname.startsWith("/images")) {
      console.log("用户正在浏览相册目录")
    }
  },
)

// 如需注销钩子，执行返回的函数即可：
// unhook();
```

---

### 4. 消息与弹窗提示（Notify）

内置 Toast 通知提示组件，开箱即用：

```javascript
OpenListPlugin.notify.success("操作执行成功！")
OpenListPlugin.notify.error("网络连接失败，请重试")
OpenListPlugin.notify.warning("请注意：存储空间即将占满")
OpenListPlugin.notify.info("有新的文件变动更新")
```

---

### 5. 动态资源与样式注入

#### ① `OpenListPlugin.loadScript(url, id?)`

异步加载外部 CDN 脚本库，自动处理依赖加载。

```javascript
// 引入第三方图表库 Chart.js
await OpenListPlugin.loadScript(
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js",
  "lib-chartjs",
)
```

#### ② `OpenListPlugin.loadCSS(url, id?)`

动态载入外部 CDN 样式表。

```javascript
await OpenListPlugin.loadCSS(
  "https://cdn.jsdelivr.net/npm/font-awesome/css/font-awesome.min.css",
  "lib-fontawesome",
)
```

#### ③ `OpenListPlugin.injectCSS(id, cssText)`

动态向页面 `<head>` 插入自定义样式规则。

```javascript
OpenListPlugin.injectCSS(
  "my-custom-theme",
  `
  .my-floating-panel {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    border-radius: 12px;
  }
`,
)
```

---

### 6. 文件系统 API（FileSystem）

> ⚠️ 需要在 `plugin.json` 中声明对应的 `fs:read` / `fs:write` / `fs:delete` 权限。

```javascript
// 1. 获取指定目录下的文件列表
const res = await OpenListPlugin.fs.list(
  "/my-folder",
  "" /* 密码 */,
  1 /* 页码 */,
  50 /* 每页条数 */,
)
if (res.code === 200) {
  console.log("文件列表:", res.data.content)
}

// 2. 获取单个文件或文件夹的详细元信息
const fileInfo = await OpenListPlugin.fs.get("/my-folder/video.mp4")

// 3. 创建文件夹
await OpenListPlugin.fs.mkdir("/my-folder/new-sub-dir")

// 4. 重命名文件
await OpenListPlugin.fs.rename("/my-folder/old-name.txt", "new-name.txt")

// 5. 批量删除文件
await OpenListPlugin.fs.remove("/my-folder", ["file1.txt", "file2.jpg"])

// 6. 复制 / 移动文件
await OpenListPlugin.fs.copy("/src-dir", "/dest-dir", ["item.zip"])
await OpenListPlugin.fs.move("/src-dir", "/dest-dir", ["item.zip"])
```

---

### 7. 管理员与系统配置 API（Admin）

> ⚠️ 需要管理员特权或对应管理权限。

```javascript
// 获取当前插件配置
const myConfig = OpenListPlugin.getConfig("oplist-plugin-mywidget")

// 校验是否拥有某个权限
if (OpenListPlugin.hasPermission("oplist-plugin-mywidget", "fs:write")) {
  // 执行写入...
}

// 获取系统全局设置
const settings = await OpenListPlugin.admin.getSettings()

// 获取所有已挂载存储源（网盘）
const storages = await OpenListPlugin.admin.getStorages()

// 获取系统用户清单
const users = await OpenListPlugin.admin.getUsers()
```

---

## 五、完整开发实战范例（从零到一）

下面以开发一个**“每日一言与快捷控制悬浮挂件”**（`oplist-plugin-hitokoto`）为例，展示全部 5 个文件的完整编写规范。

### 1. `plugin.json`

```json
{
  "id": "oplist-plugin-hitokoto",
  "name": "每日一言悬浮助手",
  "version": "1.0.0",
  "description": "在页面右下角嵌入半透明现代卡片，展示每日随机语录并支持一键换一句。",
  "author": "OpenListDev",
  "homepage": "https://openlistnext.org",
  "repository": "https://github.com/openlistnext/plugin-hitokoto",
  "type": "ui",
  "enabled": true,
  "high_privilege": false,
  "permissions": ["dom:inject", "network:fetch"],
  "tags": ["挂件", "一言", "美化", "UI"],
  "config_schema": [
    {
      "key": "category",
      "label": "语录类型",
      "type": "select",
      "options": [
        "动画 (a)",
        "漫画 (b)",
        "游戏 (c)",
        "文学 (d)",
        "原创 (e)",
        "来自网络 (f)",
        "哲学 (k)"
      ],
      "defaultValue": "动画 (a)",
      "description": "选择获取每日一言的主题分类"
    },
    {
      "key": "auto_refresh",
      "label": "开启定时自动轮换",
      "type": "bool",
      "defaultValue": true,
      "description": "开启后每 60 秒自动更换一条新语录"
    }
  ],
  "config_values": {
    "category": "动画 (a)",
    "auto_refresh": true
  }
}
```

---

### 2. `index.js`

```javascript
;(function (OpenListPlugin, plugin, config) {
  "use strict"

  const WIDGET_ID = "hitokoto-card-widget"

  // 解析配置项中选定的语录类型参数
  const getCategoryCode = () => {
    const raw = config.category || "a"
    const match = raw.match(/\(([a-z])\)/i)
    return match ? match[1] : "a"
  }

  // 请求 Hitokoto 开放 API
  async function fetchHitokoto() {
    const cat = getCategoryCode()
    try {
      const resp = await fetch(`https://v1.hitokoto.cn/?c=${cat}&encode=json`)
      if (!resp.ok) throw new Error("Network response was not ok")
      return await resp.json()
    } catch (e) {
      return {
        hitokoto: "纵有疾风起，人生不言弃。",
        from: "起风了",
      }
    }
  }

  // 渲染悬浮挂件
  async function initWidget() {
    const data = await fetchHitokoto()

    OpenListPlugin.addFloatingWidget(WIDGET_ID, (container) => {
      container.className = "oplist-hitokoto-container"
      container.innerHTML = `
        <div class="oplist-hitokoto-card">
          <div class="hitokoto-header">
            <span class="hitokoto-badge">每日一言</span>
            <button id="hitokoto-refresh-btn" class="hitokoto-btn" title="换一句">🔄</button>
          </div>
          <div class="hitokoto-content" id="hitokoto-text">“${data.hitokoto}”</div>
          <div class="hitokoto-from" id="hitokoto-from">—— ${data.from_who || ""}「${data.from}」</div>
        </div>
      `

      // 绑定换一句按钮事件
      const refreshBtn = container.querySelector("#hitokoto-refresh-btn")
      const textEl = container.querySelector("#hitokoto-text")
      const fromEl = container.querySelector("#hitokoto-from")

      const handleRefresh = async () => {
        refreshBtn.classList.add("spinning")
        const nextData = await fetchHitokoto()
        textEl.textContent = `“${nextData.hitokoto}”`
        fromEl.textContent = `—— ${nextData.from_who || ""}「${nextData.from}」`
        refreshBtn.classList.remove("spinning")
        OpenListPlugin.notify.info("已更新语录")
      }

      refreshBtn.onclick = handleRefresh

      // 自动轮换定时器
      if (config.auto_refresh) {
        setInterval(handleRefresh, 60000)
      }
    })
  }

  // 启动插件
  initWidget().catch((err) => {
    console.error("[Plugin: Hitokoto] 初始化异常:", err)
  })
})(OpenListPlugin, plugin, config, privilege)
```

---

### 3. `style.css`

```css
.oplist-hitokoto-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 990;
  max-width: 320px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.oplist-hitokoto-card {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.08),
    0 8px 10px -6px rgba(0, 0, 0, 0.04);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .oplist-hitokoto-card {
    background: rgba(30, 30, 35, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
  }
}

.hitokoto-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.hitokoto-badge {
  font-size: 11px;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.12);
  padding: 2px 8px;
  border-radius: 9999px;
}

.hitokoto-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 13px;
  padding: 4px;
  border-radius: 6px;
  transition:
    background-color 0.2s ease,
    transform 0.3s ease;
}

.hitokoto-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.hitokoto-btn.spinning {
  transform: rotate(360deg);
}

.hitokoto-content {
  font-size: 13px;
  line-height: 1.6;
  color: #1f2937;
  margin-bottom: 6px;
}

@media (prefers-color-scheme: dark) {
  .hitokoto-content {
    color: #e5e7eb;
  }
}

.hitokoto-from {
  font-size: 11px;
  color: #6b7280;
  text-align: right;
}

@media (max-width: 640px) {
  .oplist-hitokoto-container {
    bottom: 16px;
    right: 16px;
    max-width: calc(100vw - 32px);
  }
}
```

---

### 4. `icon.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  <line x1="9" y1="9" x2="15" y2="9"></line>
  <line x1="9" y1="13" x2="13" y2="13"></line>
</svg>
```

---

### 5. `README.md`

```markdown
# 每日一言悬浮助手 (Hitokoto Widget)

在 OpenListNext 页面右下角嵌入优雅现代的每日一言卡片，支持毛玻璃质感、一键刷新与深浅色模式自动适配。

## 功能亮点

- ⚡ **无缝嵌入**：原生轻量挂载，无任何庞大第三方依赖。
- 🎨 **精美设计**：现代化毛玻璃模糊滤镜与圆角阴影。
- ⚙️ **灵活配置**：后台支持自由切换动画、文学、哲学等多个分类。

## 配置项

- **语录类型**：选择 Hitokoto 分类。
- **自动轮播**：开启后每 60 秒自动更新语录。
```

---

## 六、打包、安装与调试

### 1. 打包为 ZIP 文件

将包含 `plugin.json`、`index.js`、`style.css`、`icon.svg` 和 `README.md` 的 5 个文件全选，直接右键压缩为 ZIP（注意：确保 `plugin.json` 位于 ZIP 顶层根目录，不要嵌套在额外的一层父文件夹中）：

```bash
# 命令行打包示例
zip -r oplist-plugin-hitokoto.zip plugin.json index.js style.css icon.svg README.md
```

### 2. 在 OpenListNext 中安装与启用

1. 登录 OpenListNext 管理后台。
2. 依次进入 **管理面板 -> 插件管理 (Plugins)**。
3. 点击 **安装插件** 按钮，将 `.zip` 压缩包拖入上传区。
4. 安装成功后，点击 **启用** 开关，即可在前端页面看到插件挂载运行。
5. 点击 **配置** 可直接在线修改 `config_schema` 声明的各项参数。

### 3. 控制台在线调试技巧

开发过程中，可以直接在浏览器开发者工具（F12 -> Console）中直接输入 `window.OpenListPlugin` 测试各项接口：

```javascript
// 测试通知弹窗
window.OpenListPlugin.notify.success("测试成功")

// 查看已激活的插件
console.log(window.OpenListPlugin.getActivePlugins())

// 模拟发送路由事件
window.OpenListPlugin.bus.emit("to", "/")
```

---

## 七、开发最佳实践与安全规范

1. **避免污染全局变量**：
   - 始终将逻辑包裹在 IIFE 立即执行函数 `(function() { ... })()` 中。
2. **样式隔离与命名规范**：
   - CSS 类名请统一加上插件专属前缀（如 `.oplist-hitokoto-xxx`），避免影响系统原生页面布局。
3. **移动端响应式友好**：
   - 悬浮类挂件请务必包含 `@media (max-width: 640px)` 适配规则，防止遮挡手机端的主要功能按钮。
4. **完善的异常保护**：
   - 所有的网络异步请求（`fetch`、`fs` API）和外部资源加载请务必使用 `try...catch` 语句包裹，避免单个异常导致整页 JavaScript 挂起。
5. **最小权限申请**：
   - 仅申请插件运行绝对必需的权限，增强用户的信任度与安全性。
