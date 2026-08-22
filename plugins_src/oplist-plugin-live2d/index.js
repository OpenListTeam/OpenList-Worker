;(function () {
  if (typeof window === "undefined") return

  // Remove existing instance if re-executing
  const oldWrapper = document.getElementById("oplist-live2d-wrapper")
  if (oldWrapper) oldWrapper.remove()
  const oldToggle = document.getElementById("oplist-live2d-toggle-btn")
  if (oldToggle) oldToggle.remove()

  const pluginSdk = window.OpenListPlugin || {}
  const config =
    (pluginSdk.getConfig && pluginSdk.getConfig("oplist-plugin-live2d")) || {}

  const cdnHost = config.cdn_source || "fastly.jsdelivr.net"

  const modelPkgMap = {
    "shizuku (静久 - 经典学生装)": {
      pkg: "live2d-widget-model-shizuku@1.0.5",
      file: "shizuku.model.json",
    },
    "koharu (小春 - 可爱萝莉)": {
      pkg: "live2d-widget-model-koharu@1.0.5",
      file: "koharu.model.json",
    },
    "haruto (春人 - 正太管家)": {
      pkg: "live2d-widget-model-haruto@1.0.5",
      file: "haruto.model.json",
    },
    "tororo (白猫 - 萌宠幼猫)": {
      pkg: "live2d-widget-model-tororo@1.0.5",
      file: "tororo.model.json",
    },
    "hijiki (黑猫 - 傲娇小黑)": {
      pkg: "live2d-widget-model-hijiki@1.0.5",
      file: "hijiki.model.json",
    },
    "wanko (狗狗 - 呆萌幼犬)": {
      pkg: "live2d-widget-model-wanko@1.0.5",
      file: "wanko.model.json",
    },
    "unitychan (Unity酱 - 活力少女)": {
      pkg: "live2d-widget-model-unitychan@1.0.5",
      file: "unitychan.model.json",
    },
    "z16 (战舰少女Z16)": {
      pkg: "live2d-widget-model-z16@1.0.5",
      file: "z16.model.json",
    },
    "hibiki (响 - 银发舰娘)": {
      pkg: "live2d-widget-model-hibiki@1.0.5",
      file: "hibiki.model.json",
    },
    "izumi (泉 - 和风少女)": {
      pkg: "live2d-widget-model-izumi@1.0.5",
      file: "izumi.model.json",
    },
  }

  const modelKeys = Object.keys(modelPkgMap)
  let currentModelIndex = 0
  const initialModel = config.model || "shizuku (静久 - 经典学生装)"
  const foundIndex = modelKeys.findIndex(
    (k) => k.includes(initialModel) || initialModel.includes(k.split(" ")[0]),
  )
  if (foundIndex >= 0) currentModelIndex = foundIndex

  const position =
    config.position && config.position.includes("right") ? "right" : "left"
  const welcomeText =
    config.welcome_text || "欢迎来到 OpenListNext！有什么想要查看的文件吗？"

  function getModelUrl(key) {
    const info = modelPkgMap[key] || modelPkgMap["shizuku (静久 - 经典学生装)"]
    return `https://${cdnHost}/npm/${info.pkg}/assets/${info.file}`
  }

  const quotes = [
    "今天的网速看起来很不错呢~",
    "要好好整理文件目录哦！",
    "点击我有什么事吗？主人~",
    "不要摸头啦，会变笨的！",
    "OpenListNext 运行速度飞快呢！",
    "记得多喝水，适度休息一下眼睛哦 (｡•̀ᴗ-)✧",
    "想要寻找什么电影或文档？我来陪你一起找~",
    "代码写累了吗？看我活动一下筋骨吧！",
  ]

  // 1. Create DOM Structure
  const wrapper = document.createElement("div")
  wrapper.id = "oplist-live2d-wrapper"
  wrapper.className = `oplist-live2d-container position-${position}`

  wrapper.innerHTML = `
    <div class="oplist-live2d-dialog" id="oplist-live2d-dialog">
      <span class="dialog-content" id="oplist-live2d-text">${welcomeText}</span>
      <span class="dialog-close" id="oplist-live2d-close-dialog">×</span>
    </div>
    <div class="oplist-live2d-body">
      <canvas id="oplist-live2d-canvas" width="260" height="300"></canvas>
      <div class="oplist-live2d-tools">
        <button class="tool-btn" id="oplist-live2d-btn-chat" title="对话互动">💬</button>
        <button class="tool-btn" id="oplist-live2d-btn-switch" title="切换角色模型">🔄</button>
        <button class="tool-btn" id="oplist-live2d-btn-hide" title="隐藏看板娘">🙈</button>
      </div>
    </div>
  `

  // Hidden recall toggle button
  const toggleBtn = document.createElement("div")
  toggleBtn.id = "oplist-live2d-toggle-btn"
  toggleBtn.className = `oplist-live2d-toggle-btn position-${position}`
  toggleBtn.innerHTML = "<span>看板娘</span>"
  toggleBtn.style.display = "none"

  document.body.appendChild(wrapper)
  document.body.appendChild(toggleBtn)

  const dialogEl = document.getElementById("oplist-live2d-dialog")
  const textEl = document.getElementById("oplist-live2d-text")
  const canvasEl = document.getElementById("oplist-live2d-canvas")

  let timer = null
  function showMessage(msg, duration = 5000) {
    if (!dialogEl || !textEl) return
    textEl.innerText = msg
    dialogEl.classList.add("show")
    clearTimeout(timer)
    timer = setTimeout(() => {
      dialogEl.classList.remove("show")
    }, duration)
  }

  // Show initial message
  setTimeout(() => {
    showMessage(welcomeText, 6000)
  }, 1000)

  // 2. Load Live2D Core Library with multi-CDN fallback
  function loadScriptWithFallback(urls, id) {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) return resolve()
      let index = 0
      function tryNext() {
        if (index >= urls.length) {
          return reject(new Error("All Live2D CDNs failed to load"))
        }
        const src = urls[index++]
        const script = document.createElement("script")
        script.src = src
        script.id = id
        script.crossOrigin = "anonymous"
        script.onload = () => resolve()
        script.onerror = () => {
          script.remove()
          tryNext()
        }
        document.head.appendChild(script)
      }
      tryNext()
    })
  }

  function loadModel(modelUrl) {
    if (window.loadlive2d) {
      try {
        window.loadlive2d("oplist-live2d-canvas", modelUrl)
      } catch (e) {
        console.warn("[Live2D] Failed to load model URL:", modelUrl, e)
      }
    }
  }

  const live2dEngineUrls = [
    `https://${cdnHost}/gh/stevenjoezhang/live2d-widget@latest/live2d.min.js`,
    "https://fastly.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/live2d.min.js",
    "https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/live2d.min.js",
    "https://unpkg.com/live2d-widget@3.1.4/lib/L2Dwidget.min.js",
  ]

  loadScriptWithFallback(live2dEngineUrls, "oplist-live2d-core")
    .then(() => {
      const currentUrl = getModelUrl(modelKeys[currentModelIndex])
      loadModel(currentUrl)
    })
    .catch((err) => {
      console.warn("[Live2D] Could not load live2d core library", err)
    })

  // 3. Bind Interactive Events
  canvasEl.addEventListener("click", () => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    showMessage(randomQuote, 4000)
  })

  document.getElementById("oplist-live2d-btn-chat").onclick = () => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    showMessage(randomQuote, 4000)
  }

  document.getElementById("oplist-live2d-btn-switch").onclick = () => {
    currentModelIndex = (currentModelIndex + 1) % modelKeys.length
    const nextKey = modelKeys[currentModelIndex]
    const nextUrl = getModelUrl(nextKey)
    loadModel(nextUrl)
    showMessage(`已切换至角色模型：${nextKey.split(" ")[0]}！`, 4500)
  }

  document.getElementById("oplist-live2d-btn-hide").onclick = () => {
    wrapper.style.display = "none"
    toggleBtn.style.display = "flex"
    showMessage("下次见啦~", 2000)
  }

  toggleBtn.onclick = () => {
    wrapper.style.display = "block"
    toggleBtn.style.display = "none"
    showMessage("我又回来啦！很高兴再次见到你~", 4000)
  }

  document.getElementById("oplist-live2d-close-dialog").onclick = (e) => {
    e.stopPropagation()
    dialogEl.classList.remove("show")
  }

  // 4. Listen to OpenList Router events if SDK available
  if (pluginSdk.registerHook) {
    pluginSdk.registerHook("router:change", (data) => {
      const path = (data && data.path) || ""
      if (path.includes("@manage")) {
        showMessage("进入了管理后台！请谨慎配置各项核心参数哦 🛠️", 4000)
      } else if (path === "/" || path === "") {
        showMessage("回到了文件列表首页，开启探索吧 📁", 3500)
      }
    })
  }

  console.log(
    "[Live2D Plugin] Initialized successfully with reliable model textures",
  )
})()
