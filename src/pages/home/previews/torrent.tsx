import {
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Heading,
  Box,
} from "@hope-ui/solid"
import { createSignal, onMount, Show } from "solid-js"
import { objStore } from "~/store"
import { TorrentInfo, CASInfo, TorrentFile } from "~/types"
import { useLink, useRouter, useT } from "~/hooks"
import { bus } from "~/utils"
import { TorrentFileList } from "../toolbar/TorrentFileList"
import axios from "axios"
import bencode from "bencode"
import crypto from "crypto-js"

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function utf8Decode(data: Uint8Array | undefined): string {
  if (!data) return ""
  return crypto.enc.Utf8.stringify(crypto.lib.WordArray.create(data))
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// 本地解析 torrent 文件，避免调用后端API
// 与后端 ParseTorrent 行为对齐：返回 TorrentInfo 结构 + 检测 x-cas 扩展
function parseLocalTorrent(buffer: Uint8Array): TorrentInfo {
  const data = bencode.decode(buffer as any)
  const info = data.info
  if (!info) {
    throw new Error("Invalid torrent: missing info dict")
  }

  // 计算 info_hash（SHA1 of bencoded info dict）
  const infoEncoded = bencode.encode(info) as unknown as Uint8Array
  const infoHash = crypto
    .SHA1(crypto.lib.WordArray.create(infoEncoded))
    .toString()

  // 提取名称
  const name = utf8Decode(info.name)

  // 提取分片信息
  const pieceLength: number = info["piece length"] || 0
  const pieces: Uint8Array = info.pieces || new Uint8Array(0)
  const pieceCount = Math.floor(pieces.byteLength / 20)

  // 提取文件列表
  const files: TorrentFile[] = []
  let totalSize = 0
  if (Array.isArray(info.files) && info.files.length > 0) {
    // 多文件模式
    for (const f of info.files) {
      const pathParts: string[] = (f.path || []).map((p: Uint8Array) =>
        utf8Decode(p),
      )
      const size: number = f.length || 0
      files.push({ path: pathParts.join("/"), size })
      totalSize += size
    }
  } else {
    // 单文件模式
    const size: number = info.length || 0
    files.push({ path: name, size })
    totalSize = size
  }

  // 检测 CAS 扩展（key: "x-cas"）
  let hasCas = false
  let cas: CASInfo | undefined = undefined
  const casDict = data["x-cas"]
  if (casDict && typeof casDict === "object") {
    const fileMd5 = utf8Decode(casDict["file_md5"])
    const sliceMd5 = utf8Decode(casDict["slice_md5"])
    if (fileMd5 && sliceMd5) {
      hasCas = true
      cas = {
        file_md5: fileMd5,
        slice_md5: sliceMd5,
        slice_size: casDict["slice_size"] || 0,
        cloud: utf8Decode(casDict["cloud"]),
      }
    }
  }

  return {
    name,
    total_size: totalSize,
    piece_length: pieceLength,
    piece_count: pieceCount,
    info_hash: infoHash,
    files,
    has_cas: hasCas,
    cas,
  }
}

const TorrentPreview = () => {
  const t = useT()
  const { proxyLink, rawLink } = useLink()
  const { isShare } = useRouter()

  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal("")
  const [torrentInfo, setTorrentInfo] = createSignal<TorrentInfo | null>(null)
  const [torrentData, setTorrentData] = createSignal("") // Base64 编码
  const [selectedFiles, setSelectedFiles] = createSignal<number[]>([])

  onMount(async () => {
    try {
      // 优先使用 proxy 链接（带签名，最稳定），失败时回退到 raw 链接
      let resp
      try {
        const link = proxyLink(objStore.obj, true)
        resp = await axios.get(link, { responseType: "arraybuffer" })
      } catch (e) {
        // 代理链接失败时尝试 raw 链接
        const link = rawLink(objStore.obj, true)
        resp = await axios.get(link, { responseType: "arraybuffer" })
      }

      const buffer = resp.data as ArrayBuffer
      const bytes = new Uint8Array(buffer)

      // 本地 bencode 解析（避免调用后端 API 出现 403）
      const info = parseLocalTorrent(bytes)
      setTorrentInfo(info)
      setTorrentData(arrayBufferToBase64(buffer))
      setSelectedFiles(info.files.map((_, i) => i))
    } catch (err) {
      console.error("Failed to parse torrent file:", err)
      setError(
        `${t("home.toolbar.offline_download_enhanced.parse_failed")}: ${err}`,
      )
    } finally {
      setLoading(false)
    }
  })

  // 触发离线下载对话框（完全复用 OfflineDownloadEnhanced）
  const handleOfflineDownload = () => {
    const info = torrentInfo()
    const data = torrentData()
    if (!info || !data) return
    bus.emit("torrent_parsed", {
      torrentData: data,
      info: info,
    })
  }

  return (
    <VStack spacing="$4" w="$full" p="$4">
      <Show when={loading()}>
        <Text>{t("home.toolbar.offline_download_enhanced.parsing")}</Text>
      </Show>

      <Show when={error()}>
        <Text color="$danger9">{error()}</Text>
      </Show>

      <Show when={!loading() && !error() && torrentInfo()}>
        {/* 种子信息头部 */}
        <VStack spacing="$2" alignItems="stretch" w="$full">
          <HStack
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap="$2"
          >
            <VStack alignItems="flex-start" spacing="$1">
              <Heading size="sm" css={{ wordBreak: "break-all" }}>
                {torrentInfo()!.name}
              </Heading>
              <HStack spacing="$2" flexWrap="wrap">
                <Text fontSize="$xs" color="$neutral10">
                  {formatFileSize(torrentInfo()!.total_size)}
                </Text>
                <Text fontSize="$xs" color="$neutral10">
                  {torrentInfo()!.files.length}{" "}
                  {t("home.toolbar.offline_download_enhanced.files_count")}
                </Text>
                <Text
                  fontSize="$xs"
                  color="$neutral10"
                  css={{ wordBreak: "break-all" }}
                >
                  Info Hash: {torrentInfo()!.info_hash}
                </Text>
              </HStack>
            </VStack>
            <Show when={torrentInfo()!.has_cas}>
              <Badge colorScheme="success">
                {t("home.toolbar.offline_download_enhanced.cas_supported")}
              </Badge>
            </Show>
          </HStack>

          {/* 文件列表 */}
          <TorrentFileList
            files={torrentInfo()!.files}
            selectedFiles={selectedFiles()}
            onSelectionChange={setSelectedFiles}
          />

          {/* 离线下载按钮 */}
          <Show when={!isShare()}>
            <Box mt="$2">
              <Button
                colorScheme="primary"
                onClick={handleOfflineDownload}
                disabled={!torrentInfo()}
              >
                {t("home.toolbar.offline_download")}
              </Button>
            </Box>
          </Show>
        </VStack>
      </Show>
    </VStack>
  )
}

export default TorrentPreview
