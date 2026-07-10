import { BoxWithFullScreen, Error, FullLoading } from "~/components"
import { useCDN, useRouter, useT } from "~/hooks"
import { objStore } from "~/store"
import { loadScriptIIFE } from "~/utils"
import { onCleanup, onMount, createSignal, Show } from "solid-js"

const Preview = () => {
  const t = useT()
  const { replace } = useRouter()
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal(false)
  const { rufflePath } = useCDN()
  // 获取当前目录下所有SWF文件
  let swfFiles = objStore.objs.filter((obj) =>
    obj.name.toLowerCase().endsWith(".swf"),
  )

  if (swfFiles.length === 0) {
    swfFiles = [objStore.obj]
  }

  // 键盘导航功能：左右箭头切换SWF文件
  const onKeydown = (e: KeyboardEvent) => {
    const index = swfFiles.findIndex((f) => f.name === objStore.obj.name)
    if (e.key === "ArrowLeft" && index > 0) {
      replace(swfFiles[index - 1].name)
    } else if (e.key === "ArrowRight" && index < swfFiles.length - 1) {
      replace(swfFiles[index + 1].name)
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown)
    initRufflePlayer()
  })

  onCleanup(() => {
    window.removeEventListener("keydown", onKeydown)
    const player = document.getElementById("ruffle-player")
    player?.remove()
    const ruffleScript = document.getElementById("ruffle-script")
    ruffleScript?.remove()
  })

  const initRufflePlayer = async () => {
    setLoading(true)
    setError(false)

    // 清理可能存在的旧播放器
    const oldPlayer = document.getElementById("ruffle-player")
    oldPlayer?.remove()

    // 动态加载Ruffle脚本
    await loadScriptIIFE(rufflePath(), "ruffle-script")
      .then(() => {
        createPlayer()
      })
      .catch((err) => {
        console.error("Failed to load Ruffle script:", err)
        setError(true)
        setLoading(false)
      })
  }

  const createPlayer = () => {
    try {
      const ruffle = window.RufflePlayer.newest()
      const player = ruffle.createPlayer()
      player.id = "ruffle-player"
      player.style.width = "100%"
      player.style.height = "100%"

      const container = document.getElementById("swf-container")
      if (container) {
        container.innerHTML = ""
        container.appendChild(player)

        player.addEventListener("loaded", () => {
          setLoading(false)
        })

        player.addEventListener("error", () => {
          setError(true)
          setLoading(false)
        })

        player.load(objStore.raw_url)
      }
    } catch (e) {
      console.error("Ruffle初始化失败:", e)
      setError(true)
      setLoading(false)
    }
  }

  return (
    <BoxWithFullScreen w="$full" h="75vh">
      <div
        id="swf-container"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
        }}
      >
        {/* 加载状态 */}
        <Show when={loading()}>
          <FullLoading />
        </Show>

        {/* 错误状态 */}
        <Show when={error()}>
          <Error msg={t("preview.failed_load_swf")} h="$full" />
        </Show>
      </div>
    </BoxWithFullScreen>
  )
}

export default Preview
