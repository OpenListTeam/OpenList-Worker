/**
 * 媒体元数据解析（纯 TS，无 Node 依赖）。
 *
 * Worker 环境没有 ffprobe / taglib / sharp，因此这里实现「够用」的解析：
 *   - MP3：ID3v2.2/2.3/2.4（标题/艺术家/专辑/曲序/年份/流派/封面/歌词）+ ID3v1
 *   - FLAC：Vorbis Comment + PICTURE + STREAMINFO（时长）
 *   - M4A/MP4：moov/udta/meta/ilst 的 ©nam/©ART/©alb/trkn/covr（尽力而为）
 *   - EPUB/CBZ：ZIP 目录解析 + 内嵌封面提取
 *   - 图片：按魔数识别真实 MIME（防止伪造扩展名被当作图片代理）
 *
 * 所有解析函数只接受「已读取的字节」，不做 I/O；读取由 scan.ts / scrape.ts
 * 通过 op/storage.readFileRange 完成。
 */

export interface MusicTag {
  title: string
  artist: string
  album: string
  albumArtist: string
  trackNumber: number
  year: string
  genre: string
  lyrics: string
  coverData?: Uint8Array
  coverMime?: string
  /** 秒 */
  duration?: number
}

const emptyTag = (): MusicTag => ({
  title: "",
  artist: "",
  album: "",
  albumArtist: "",
  trackNumber: 0,
  year: "",
  genre: "",
  lyrics: "",
})

const decodeLoose = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  } catch {
    let out = ""
    for (const b of bytes) out += String.fromCharCode(b)
    return out
  }
}

const decodeLatin1 = (bytes: Uint8Array): string => {
  let out = ""
  // 分块避免超长字符串拼接触发参数上限
  const chunk = 0x2000
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return out
}

const decodeUtf16 = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder("utf-16").decode(bytes)
  } catch {
    return decodeLatin1(bytes)
  }
}

const decodeUtf16be = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder("utf-16be").decode(bytes)
  } catch {
    return decodeLatin1(bytes)
  }
}

/** 按 ID3 文本编码字节解码，并去掉结尾 NUL / 全零填充 */
function decodeId3Text(bytes: Uint8Array, encoding: number): string {
  let text = ""
  if (encoding === 1) text = decodeUtf16(bytes)
  else if (encoding === 2) text = decodeUtf16be(bytes)
  else if (encoding === 3) text = decodeLoose(bytes)
  else text = decodeLatin1(bytes)
  return text.replace(/\u0000+$/g, "").replace(/\u0000/g, " ").trim()
}

const indexOfNul = (bytes: Uint8Array, start: number): number => {
  for (let i = start; i < bytes.length; i++) if (bytes[i] === 0) return i
  return -1
}

/** UTF-16 编码下的双字节 NUL */
const indexOfNul16 = (bytes: Uint8Array, start: number): number => {
  for (let i = start; i + 1 < bytes.length; i += 2) {
    if (bytes[i] === 0 && bytes[i + 1] === 0) return i
  }
  return -1
}

const syncsafeToInt = (b: Uint8Array, off: number): number =>
  ((b[off] & 0x7f) << 21) |
  ((b[off + 1] & 0x7f) << 14) |
  ((b[off + 2] & 0x7f) << 7) |
  (b[off + 3] & 0x7f)

const beUint32 = (b: Uint8Array, off: number): number =>
  ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0

const leUint32 = (b: Uint8Array, off: number): number =>
  (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0

const leUint24 = (b: Uint8Array, off: number): number =>
  b[off] | (b[off + 1] << 8) | (b[off + 2] << 16)

/** ID3v2 去同步（0xFF 0x00 -> 0xFF） */
function deUnsynchronise(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length)
  let j = 0
  for (let i = 0; i < bytes.length; i++) {
    out[j++] = bytes[i]
    if (bytes[i] === 0xff && bytes[i + 1] === 0x00) i += 1
  }
  return out.subarray(0, j)
}

/** 解析 ID3v2 头部中的帧，返回标签；失败返回 null */
export function parseID3v2(bytes: Uint8Array): MusicTag | null {
  if (bytes.length < 10) return null
  if (!(bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33)) return null
  const major = bytes[3]
  const flags = bytes[5]
  const size = syncsafeToInt(bytes, 6)
  if (size <= 0) return null

  let body = bytes.subarray(10, Math.min(bytes.length, 10 + size))
  if (flags & 0x80) body = deUnsynchronise(body)

  const tag = emptyTag()
  // 2.2 的帧头是 6 字节（id3 + size3），2.3/2.4 是 10 字节
  const headerSize = major === 2 ? 6 : 10
  let off = 0
  // 扩展头（2.3/2.4）
  if ((flags & 0x40) && major !== 2 && body.length >= 14) {
    const extSize =
      major === 4 ? syncsafeToInt(body, 0) : beUint32(body, 0) + 4
    off += Math.max(0, extSize)
  }

  while (off + headerSize <= body.length) {
    const idBytes = body.subarray(off, off + (major === 2 ? 3 : 4))
    if (idBytes.every((b) => b === 0)) break
    const id = decodeLatin1(idBytes)
    if (!/^[A-Z0-9]+$/.test(id)) break

    let frameSize: number
    if (major === 2) {
      frameSize = (body[off + 3] << 16) | (body[off + 4] << 8) | body[off + 5]
    } else if (major === 4) {
      frameSize = syncsafeToInt(body, off + 4)
    } else {
      frameSize = beUint32(body, off + 4)
    }
    const frameFlags = major === 2 ? 0 : (body[off + 8] << 8) | body[off + 9]
    off += headerSize
    if (frameSize <= 0 || off + frameSize > body.length) break
    let data = body.subarray(off, off + frameSize)
    off += frameSize + (major === 2 ? 0 : 0)

    // 压缩/加密的帧直接跳过（极少见于音频标签）
    if (major === 3 && (frameFlags & 0x00c0)) continue
    if (major === 4 && (frameFlags & 0x000c)) continue
    if (major === 4 && frameFlags & 0x0001 && data.length > 4) {
      // data length indicator
      const skip = syncsafeToInt(data, 0)
      if (skip > 0 && skip < data.length) data = data.subarray(4)
    }
    if (data.length === 0) continue

    const textFrame = () => decodeId3Text(data.subarray(1), data[0])

    switch (id) {
      case "TIT2":
      case "TT2":
        tag.title = textFrame()
        break
      case "TPE1":
      case "TP1":
        tag.artist = textFrame()
        break
      case "TPE2":
      case "TP2":
        tag.albumArtist = textFrame()
        break
      case "TALB":
      case "TAL":
        tag.album = textFrame()
        break
      case "TCON":
      case "TCO":
        tag.genre = textFrame().replace(/\(\d+\)/g, "").trim()
        break
      case "TRCK":
      case "TRK": {
        const raw = textFrame()
        const n = parseInt(raw.split("/")[0], 10)
        tag.trackNumber = Number.isFinite(n) ? n : 0
        break
      }
      case "TYER":
      case "TYE":
      case "TDRC": {
        const raw = textFrame()
        const m = raw.match(/\d{4}/)
        if (m) tag.year = m[0]
        break
      }
      case "APIC":
      case "PIC": {
        // encoding(1) mime\0 type(1) desc\0 data
        const enc = data[0]
        let p = 1
        let mime = ""
        if (id === "PIC") {
          mime = "image/" + decodeLatin1(data.subarray(1, 4)).toLowerCase()
          p = 4
        } else {
          const end = indexOfNul(data, p)
          if (end < 0) break
          mime = decodeLatin1(data.subarray(p, end)).trim().toLowerCase()
          p = end + 1
        }
        if (p >= data.length) break
        p += 1 // picture type
        const descEnd = enc === 1 || enc === 2 ? indexOfNul16(data, p) : indexOfNul(data, p)
        if (descEnd < 0) break
        p = descEnd + (enc === 1 || enc === 2 ? 2 : 1)
        if (p >= data.length) break
        const cover = data.subarray(p)
        if (cover.length > 0) {
          tag.coverData = cover
          tag.coverMime = mime && mime.startsWith("image/") ? mime : sniffImageMime(cover) || "image/jpeg"
        }
        break
      }
      case "USLT":
      case "ULT": {
        const enc = data[0]
        let p = 4 // encoding + lang
        const descEnd = enc === 1 || enc === 2 ? indexOfNul16(data, p) : indexOfNul(data, p)
        if (descEnd >= 0) p = descEnd + (enc === 1 || enc === 2 ? 2 : 1)
        tag.lyrics = decodeId3Text(data.subarray(p), enc)
        break
      }
      case "SYLT": {
        // 同步歌词无法直接转 LRC，保留纯文本部分
        break
      }
      case "TXXX":
      case "TXX": {
        // encoding desc\0 value；部分软件把歌词放在 TXXX:LYRICS
        const enc = data[0]
        const end = enc === 1 || enc === 2 ? indexOfNul16(data, 1) : indexOfNul(data, 1)
        if (end < 0) break
        const desc = decodeId3Text(data.subarray(1, end), enc).toLowerCase()
        const value = decodeId3Text(
          data.subarray(end + (enc === 1 || enc === 2 ? 2 : 1)),
          enc,
        )
        if (desc.includes("lyric") && value) tag.lyrics = value
        break
      }
      default:
        break
    }
  }

  return tag
}

/** ID3v1：末尾 128 字节，编码为 latin1 */
export function parseID3v1(tail: Uint8Array): MusicTag | null {
  if (tail.length < 128) return null
  const start = tail.length - 128
  if (!(tail[start] === 0x54 && tail[start + 1] === 0x41 && tail[start + 2] === 0x47)) {
    return null
  }
  const field = (from: number, len: number) => {
    const raw = tail.subarray(start + from, start + from + len)
    const end = indexOfNul(raw, 0)
    return decodeLatin1(end >= 0 ? raw.subarray(0, end) : raw).trim()
  }
  const tag = emptyTag()
  tag.title = field(3, 30)
  tag.artist = field(33, 30)
  tag.album = field(63, 30)
  const year = field(93, 4)
  if (/^\d{4}$/.test(year)) tag.year = year
  const comment = field(97, 30)
  if (comment) tag.lyrics = ""
  // ID3v1.1：comment 最后两字节是 track（倒数第二字节 0）
  const trackByte = tail[start + 125]
  if (trackByte !== 0 && tail[start + 126] === 0) tag.trackNumber = trackByte
  return tag
}

/** FLAC：解析 fLaC 之后的 metadata blocks */
export function parseFLAC(bytes: Uint8Array): MusicTag | null {
  if (bytes.length < 8) return null
  if (!(bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43)) {
    return null
  }
  const tag = emptyTag()
  let off = 4
  while (off + 4 <= bytes.length) {
    const header = bytes[off]
    const last = (header & 0x80) !== 0
    const type = header & 0x7f
    const len = leUint24(bytes, off + 1)
    off += 4
    if (len < 0 || off + len > bytes.length) break
    const block = bytes.subarray(off, off + len)

    if (type === 0 && block.length >= 18) {
      // STREAMINFO: min/max block(4) min/max frame(6) then 8 bytes packed
      const sampleRate = (block[10] << 12) | (block[11] << 4) | (block[12] >> 4)
      const low =
        ((block[14] << 24) | (block[15] << 16) | (block[16] << 8) | block[17]) >>>
        0
      const totalSamples = (block[13] & 0x0f) * 4294967296 + low
      if (sampleRate > 0 && totalSamples > 0) {
        tag.duration = Math.round(totalSamples / sampleRate)
      }
    } else if (type === 4) {
      // VORBIS_COMMENT
      let p = 0
      if (block.length < 8) break
      const vendorLen = leUint32(block, p)
      p += 4 + vendorLen
      if (p + 4 > block.length) break
      const count = leUint32(block, p)
      p += 4
      for (let i = 0; i < count && p + 4 <= block.length; i++) {
        const l = leUint32(block, p)
        p += 4
        if (l <= 0 || p + l > block.length) break
        const entry = decodeLoose(block.subarray(p, p + l))
        p += l
        const eq = entry.indexOf("=")
        if (eq <= 0) continue
        const key = entry.slice(0, eq).toUpperCase()
        const val = entry.slice(eq + 1).trim()
        if (!val) continue
        switch (key) {
          case "TITLE":
            tag.title = val
            break
          case "ARTIST":
            tag.artist = val
            break
          case "ALBUM":
            tag.album = val
            break
          case "ALBUMARTIST":
          case "ALBUM ARTIST":
            tag.albumArtist = val
            break
          case "TRACKNUMBER":
          case "TRACK": {
            const n = parseInt(val.split("/")[0], 10)
            if (Number.isFinite(n)) tag.trackNumber = n
            break
          }
          case "DATE":
          case "YEAR": {
            const m = val.match(/\d{4}/)
            if (m) tag.year = m[0]
            break
          }
          case "GENRE":
            tag.genre = val
            break
          case "LYRICS":
          case "UNSYNCEDLYRICS":
            tag.lyrics = val
            break
          default:
            break
        }
      }
    } else if (type === 6) {
      // PICTURE
      if (block.length < 32) break
      let p = 0
      p += 4 // picture type
      const mimeLen = beUint32(block, p)
      p += 4
      if (p + mimeLen > block.length) break
      const mime = decodeLatin1(block.subarray(p, p + mimeLen)).toLowerCase()
      p += mimeLen
      const descLen = beUint32(block, p)
      p += 4 + descLen
      p += 16 // width/height/depth/colors
      if (p + 4 > block.length) break
      const dataLen = beUint32(block, p)
      p += 4
      if (dataLen > 0 && p + dataLen <= block.length) {
        tag.coverData = block.subarray(p, p + dataLen)
        tag.coverMime =
          mime && mime.startsWith("image/")
            ? mime
            : sniffImageMime(tag.coverData) || "image/jpeg"
      }
    }

    off += len
    if (last) break
  }
  return tag
}

/** M4A/MP4：moov -> udta -> meta -> ilst（尽力而为，不处理 64 位 box） */
export function parseM4ATags(bytes: Uint8Array): MusicTag | null {
  if (bytes.length < 12) return null
  const typeAt = (off: number) => decodeLatin1(bytes.subarray(off + 4, off + 8))
  if (typeAt(0) !== "ftyp") return null

  const findBox = (start: number, end: number, name: string) => {
    let off = start
    while (off + 8 <= end) {
      let size = beUint32(bytes, off)
      const type = typeAt(off)
      if (size === 1) {
        // 64-bit size，跳过（极少用于元数据）
        return null
      }
      if (size === 0) size = end - off
      if (size < 8 || off + size > end) return null
      if (type === name) return { start: off + 8, end: off + size }
      off += size
    }
    return null
  }

  const moov = findBox(0, bytes.length, "moov")
  if (!moov) return null
  const udta = findBox(moov.start, moov.end, "udta")
  if (!udta) return null
  const meta = findBox(udta.start, udta.end, "meta")
  if (!meta) return null
  const ilst = findBox(meta.start + 4, meta.end, "ilst")
  if (!ilst) return null

  const tag = emptyTag()
  let off = ilst.start
  while (off + 8 <= ilst.end) {
    const size = beUint32(bytes, off)
    if (size < 8 || off + size > ilst.end) break
    const atom = decodeLatin1(bytes.subarray(off + 4, off + 8)).replace(/\u00a9/g, "©")
    const dataStart = off + 8
    if (dataStart + 16 <= off + size) {
      // data: size(4) type(4) locale(4) payload
      const dSize = beUint32(bytes, dataStart)
      const dType = beUint32(bytes, dataStart + 4)
      const payloadStart = dataStart + 16
      const payloadEnd = Math.min(dataStart + dSize, off + size)
      const payload = bytes.subarray(payloadStart, payloadEnd)
      const text = () => decodeLoose(payload).replace(/\u0000+$/g, "").trim()
      switch (atom) {
        case "©nam":
          tag.title = text()
          break
        case "©ART":
          tag.artist = text()
          break
        case "aART":
          tag.albumArtist = text()
          break
        case "©alb":
          tag.album = text()
          break
        case "©gen":
        case "gnre":
          tag.genre = text()
          break
        case "©day": {
          const m = text().match(/\d{4}/)
          if (m) tag.year = m[0]
          break
        }
        case "trkn": {
          // 8 字节：0 0 track(2) total(2)
          if (payload.length >= 4) tag.trackNumber = (payload[2] << 8) | payload[3]
          break
        }
        case "covr": {
          if (dType === 13 || dType === 14) {
            tag.coverData = payload
            tag.coverMime =
              sniffImageMime(payload) || (dType === 14 ? "image/png" : "image/jpeg")
          }
          break
        }
        case "©lyr":
          tag.lyrics = text()
          break
        default:
          break
      }
    }
    off += size
  }
  return tag
}

/** 合并多个来源的标签：先到先得（不覆盖已有非空值） */
export function mergeTags(base: MusicTag, extra: MusicTag | null): MusicTag {
  if (!extra) return base
  const out = { ...base }
  const keys: Array<keyof MusicTag> = [
    "title",
    "artist",
    "album",
    "albumArtist",
    "genre",
    "lyrics",
  ]
  for (const k of keys) {
    if (!out[k] && extra[k]) (out as any)[k] = extra[k]
  }
  if (!out.trackNumber && extra.trackNumber) out.trackNumber = extra.trackNumber
  if (!out.year && extra.year) out.year = extra.year
  if (!out.coverData && extra.coverData) {
    out.coverData = extra.coverData
    out.coverMime = extra.coverMime
  }
  if (!out.duration && extra.duration) out.duration = extra.duration
  return out
}

/** 按扩展名选择解析器（head 至少包含文件头，flac 建议 ≥64KB） */
export function parseMusicTags(
  ext: string,
  head: Uint8Array | null,
  tail?: Uint8Array | null,
): MusicTag {
  const e = ext.toLowerCase()
  let tag: MusicTag | null = null
  try {
    if (head && head.length > 0) {
      if (e === "flac") tag = parseFLAC(head)
      else if (e === "m4a" || e === "mp4" || e === "alac") tag = parseM4ATags(head)
      else tag = parseID3v2(head)
    }
    if (!tag && tail && tail.length > 0 && (e === "mp3" || e === "wav")) {
      tag = parseID3v1(tail)
    }
  } catch (err: any) {
    console.warn("[media] parse music tag failed:", err?.message || err)
  }
  return tag || emptyTag()
}

// ==================== 图片 ====================

/** 按魔数识别图片 MIME；非栅格图（svg/html）返回空串 */
export function sniffImageMime(bytes: Uint8Array): string {
  if (bytes.length < 12) return ""
  const b = bytes
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg"
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return "image/png"
  }
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif"
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "image/webp"
  }
  if (b[0] === 0x42 && b[1] === 0x4d) return "image/bmp"
  if (
    b[4] === 0x66 &&
    b[5] === 0x74 &&
    b[6] === 0x79 &&
    b[7] === 0x70
  ) {
    const brand = decodeLatin1(b.subarray(8, 12))
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif"
    if (brand.startsWith("heic") || brand.startsWith("heix")) return "image/heic"
    if (brand.startsWith("mif1")) return "image/heif"
  }
  return ""
}

/**
 * 从 JPEG APP1 段中提取 EXIF DateTimeOriginal（YYYY-MM-DD）。
 *
 * 只处理未压缩的 EXIF（TIFF header + IFD0/ExifIFD），足以覆盖相机直出。
 */
export function parseJpegExifDate(bytes: Uint8Array): string {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return ""
  let off = 2
  while (off + 4 <= bytes.length) {
    if (bytes[off] !== 0xff) break
    const marker = bytes[off + 1]
    off += 2
    if (marker === 0xd8 || marker === 0xd9) continue
    if (off + 2 > bytes.length) break
    const len = (bytes[off] << 8) | bytes[off + 1]
    if (len < 2 || off + len > bytes.length) break
    if (marker === 0xe1) {
      const seg = bytes.subarray(off + 2, off + len)
      if (
        seg.length > 6 &&
        seg[0] === 0x45 &&
        seg[1] === 0x78 &&
        seg[2] === 0x69 &&
        seg[3] === 0x66
      ) {
        const date = parseTiffDate(seg.subarray(6))
        if (date) return date
      }
    }
    off += len
    if (marker === 0xda) break
  }
  return ""
}

function parseTiffDate(tiff: Uint8Array): string {
  if (tiff.length < 8) return ""
  const little = tiff[0] === 0x49 && tiff[1] === 0x49
  if (!little && !(tiff[0] === 0x4d && tiff[1] === 0x4d)) return ""
  const u16 = (o: number) =>
    little ? tiff[o] | (tiff[o + 1] << 8) : (tiff[o] << 8) | tiff[o + 1]
  const u32 = (o: number) =>
    little
      ? (tiff[o] | (tiff[o + 1] << 8) | (tiff[o + 2] << 16) | (tiff[o + 3] << 24)) >>> 0
      : ((tiff[o] << 24) | (tiff[o + 1] << 16) | (tiff[o + 2] << 8) | tiff[o + 3]) >>> 0

  const readAscii = (entryOff: number): string => {
    const type = u16(entryOff + 2)
    const count = u32(entryOff + 4)
    if (type !== 2 || count <= 1 || count > 32) return ""
    const valueOff = count <= 4 ? entryOff + 8 : u32(entryOff + 8)
    if (valueOff + count > tiff.length) return ""
    return decodeLatin1(tiff.subarray(valueOff, valueOff + count)).replace(/\u0000+$/g, "")
  }

  const ifd0 = u32(4)
  if (ifd0 + 2 > tiff.length) return ""
  const count0 = u16(ifd0)
  let exifIfd = 0
  for (let i = 0; i < count0; i++) {
    const entry = ifd0 + 2 + i * 12
    if (entry + 12 > tiff.length) break
    const tag = u16(entry)
    if (tag === 0x8769) exifIfd = u32(entry + 8)
    if (tag === 0x0132) {
      const d = readAscii(entry)
      const m = d.match(/(\d{4}):(\d{2}):(\d{2})/)
      if (m) return `${m[1]}-${m[2]}-${m[3]}`
    }
  }
  if (exifIfd && exifIfd + 2 <= tiff.length) {
    const countE = u16(exifIfd)
    for (let i = 0; i < countE; i++) {
      const entry = exifIfd + 2 + i * 12
      if (entry + 12 > tiff.length) break
      const tag = u16(entry)
      if (tag === 0x9003 || tag === 0x9004) {
        const d = readAscii(entry)
        const m = d.match(/(\d{4}):(\d{2}):(\d{2})/)
        if (m) return `${m[1]}-${m[2]}-${m[3]}`
      }
    }
  }
  return ""
}

// ==================== ZIP（EPUB / CBZ） ====================

export interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  uncompressedSize: number
  localOffset: number
}

/** 解析 ZIP 中央目录（只支持单卷、非 ZIP64） */
export function listZipEntries(bytes: Uint8Array): ZipEntry[] {
  if (bytes.length < 22) return []
  const min = Math.max(0, bytes.length - 65557)
  let eocd = -1
  for (let i = bytes.length - 22; i >= min; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return []
  const total = bytes[eocd + 10] | (bytes[eocd + 11] << 8)
  const cdOffset = leUint32(bytes, eocd + 16)
  if (cdOffset <= 0 || cdOffset >= bytes.length) return []

  const out: ZipEntry[] = []
  let off = cdOffset
  for (let i = 0; i < total; i++) {
    if (off + 46 > bytes.length) break
    if (!(bytes[off] === 0x50 && bytes[off + 1] === 0x4b && bytes[off + 2] === 0x01 && bytes[off + 3] === 0x02)) {
      break
    }
    const method = bytes[off + 10] | (bytes[off + 11] << 8)
    const compressedSize = leUint32(bytes, off + 20)
    const uncompressedSize = leUint32(bytes, off + 24)
    const nameLen = bytes[off + 28] | (bytes[off + 29] << 8)
    const extraLen = bytes[off + 30] | (bytes[off + 31] << 8)
    const commentLen = bytes[off + 32] | (bytes[off + 33] << 8)
    const localOffset = leUint32(bytes, off + 42)
    const name = decodeLoose(bytes.subarray(off + 46, off + 46 + nameLen))
    out.push({ name, method, compressedSize, uncompressedSize, localOffset })
    off += 46 + nameLen + extraLen + commentLen
  }
  return out
}

/** 解压单个 ZIP 条目（method 0 或 deflate） */
export async function readZipEntry(
  bytes: Uint8Array,
  entry: ZipEntry,
  maxBytes = 8 * 1024 * 1024,
): Promise<Uint8Array | null> {
  const off = entry.localOffset
  if (off + 30 > bytes.length) return null
  if (!(bytes[off] === 0x50 && bytes[off + 1] === 0x4b && bytes[off + 2] === 0x03 && bytes[off + 3] === 0x04)) {
    return null
  }
  const nameLen = bytes[off + 26] | (bytes[off + 27] << 8)
  const extraLen = bytes[off + 28] | (bytes[off + 29] << 8)
  const dataStart = off + 30 + nameLen + extraLen
  if (dataStart > bytes.length) return null

  if (entry.method === 0) {
    const end = Math.min(bytes.length, dataStart + (entry.compressedSize || entry.uncompressedSize))
    return bytes.subarray(dataStart, end)
  }
  if (entry.method !== 8) return null
  const end = Math.min(bytes.length, dataStart + entry.compressedSize)
  const compressed = bytes.subarray(dataStart, end)
  if (compressed.length === 0) return null

  try {
    const DS: any = (globalThis as any).DecompressionStream
    if (!DS) return null
    const stream = new Blob([compressed as BlobPart])
      .stream()
      .pipeThrough(new DS("deflate-raw"))
    const buf = new Uint8Array(await new Response(stream).arrayBuffer())
    return buf.length <= maxBytes ? buf : null
  } catch {
    return null
  }
}

/**
 * 从 EPUB 中提取封面。
 *
 * 顺序：META-INF/container.xml → OPF → `<meta name="cover" content="id">`
 * → manifest item href；回退为「href/属性含 cover 的第一张图片」。
 */
export async function extractEpubCover(
  bytes: Uint8Array,
  maxBytes = 4 * 1024 * 1024,
): Promise<{ data: Uint8Array; mime: string } | null> {
  const entries = listZipEntries(bytes)
  if (entries.length === 0) return null
  const byName = new Map(entries.map((e) => [e.name.toLowerCase(), e]))

  const readText = async (name: string) => {
    const e = byName.get(name.toLowerCase())
    if (!e) return ""
    const data = await readZipEntry(bytes, e, maxBytes)
    return data ? decodeLoose(data) : ""
  }

  let opfPath = ""
  const container = await readText("META-INF/container.xml")
  if (container) {
    const m = container.match(/full-path="([^"]+)"/i)
    if (m) opfPath = m[1]
  }
  if (!opfPath) {
    const opf = entries.find((e) => e.name.toLowerCase().endsWith(".opf"))
    if (!opf) return null
    opfPath = opf.name
  }
  const opf = await readText(opfPath)
  if (!opf) return null

  const baseDir = opfPath.includes("/")
    ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
    : ""

  const join = (href: string) => {
    const raw = decodeURI(href.split("#")[0])
    const parts = (baseDir + raw).split("/")
    const stack: string[] = []
    for (const p of parts) {
      if (!p || p === ".") continue
      if (p === "..") stack.pop()
      else stack.push(p)
    }
    return stack.join("/")
  }

  // manifest id -> href
  const manifest = new Map<string, { href: string; mediaType: string }>()
  const itemRe = /<item\b[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(opf))) {
    const tag = m[0]
    const id = (tag.match(/\bid="([^"]*)"/i) || [])[1] || ""
    const href = (tag.match(/\bhref="([^"]*)"/i) || [])[1] || ""
    const mediaType = (tag.match(/\bmedia-type="([^"]*)"/i) || [])[1] || ""
    if (id && href) manifest.set(id, { href, mediaType })
  }

  const candidates: string[] = []
  const metaCover = opf.match(/<meta\b[^>]*name="cover"[^>]*content="([^"]+)"/i)
  if (metaCover) {
    const item = manifest.get(metaCover[1])
    if (item) candidates.push(join(item.href))
  }
  for (const [, item] of manifest) {
    if (item.mediaType.startsWith("image/")) {
      const href = join(item.href)
      if (/cover/i.test(href)) candidates.push(href)
    }
  }
  for (const [id, item] of manifest) {
    if (item.mediaType.startsWith("image/") && /cover/i.test(id)) {
      candidates.push(join(item.href))
    }
  }
  // 最后兜底：任意图片
  for (const [, item] of manifest) {
    if (item.mediaType.startsWith("image/")) candidates.push(join(item.href))
  }

  for (const name of candidates) {
    const e = byName.get(name.toLowerCase())
    if (!e) continue
    const data = await readZipEntry(bytes, e, maxBytes)
    if (!data || data.length === 0) continue
    const mime = sniffImageMime(data)
    if (!mime) continue
    return { data, mime }
  }
  return null
}

/** 从 CBZ（漫画/图片压缩包）中取第一张图片作为封面 */
export async function extractCbzCover(
  bytes: Uint8Array,
  maxBytes = 8 * 1024 * 1024,
): Promise<{ data: Uint8Array; mime: string } | null> {
  const entries = listZipEntries(bytes).filter((e) =>
    /\.(jpe?g|png|webp|gif)$/i.test(e.name),
  )
  entries.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
  for (const e of entries.slice(0, 4)) {
    const data = await readZipEntry(bytes, e, maxBytes)
    if (!data) continue
    const mime = sniffImageMime(data)
    if (mime) return { data, mime }
  }
  return null
}

/** 解析 LRC 文本：去掉 BOM，限制长度 */
export function normalizeLyrics(text: string, maxBytes = 512 * 1024): string {
  if (!text) return ""
  let s = text.replace(/^\uFEFF/, "")
  if (s.length > maxBytes) s = s.slice(0, maxBytes)
  return s.trim()
}

// ==================== PDF 封面 ====================
//
// PDF 没有「封面」概念，这里提取文档中面积最大的内嵌图像作为封面：
//   - DCTDecode（JPEG）流直接返回（绝大多数扫描版封面/插图都是这种）
//   - FlateDecode（zlib）流解压后按 PNG 预测器还原，再编码为 PNG
//   - JPXDecode / JBIG2Decode 浏览器不支持，跳过
//
// 只做「流对象扫描」而不实现完整 xref 解析：封面图一定以 `obj ... stream`
// 形式存在，找不到就返回 null，不影响刮削主流程。

const PDF_CHAR = (s: string) => Array.from(s, (c) => c.charCodeAt(0))

function indexOfBytes(
  haystack: Uint8Array,
  needle: string,
  from = 0,
): number {
  const pat = PDF_CHAR(needle)
  const n = pat.length
  if (n === 0) return -1
  const first = pat[0]
  const limit = haystack.length - n
  for (let i = Math.max(0, from); i <= limit; i++) {
    if (haystack[i] !== first) continue
    let j = 1
    while (j < n && haystack[i + j] === pat[j]) j++
    if (j === n) return i
  }
  return -1
}

function lastIndexOfBytes(
  haystack: Uint8Array,
  needle: string,
  before: number,
  window = 8192,
): number {
  const pat = PDF_CHAR(needle)
  const n = pat.length
  const from = Math.max(0, before - window)
  const last = Math.min(before, haystack.length - n)
  for (let i = last; i >= from; i--) {
    let j = 0
    while (j < n && haystack[i + j] === pat[j]) j++
    if (j === n) return i
  }
  return -1
}

interface PdfImageStream {
  width: number
  height: number
  filters: string[]
  colors: number
  bpc: number
  predictor: number
  dataStart: number
  dataEnd: number
}

function parsePdfImages(bytes: Uint8Array): PdfImageStream[] {
  const out: PdfImageStream[] = []
  let cursor = 0
  for (;;) {
    const streamIdx = indexOfBytes(bytes, "stream", cursor)
    if (streamIdx < 0) break
    cursor = streamIdx + 6

    const objIdx = lastIndexOfBytes(bytes, "obj", streamIdx, 8192)
    if (objIdx < 0) continue
    const dict = decodeLatin1(bytes.subarray(objIdx + 3, streamIdx))
    if (!/\/Subtype\s*\/Image/.test(dict)) continue

    let dataStart = streamIdx + 6
    if (bytes[dataStart] === 0x0d) dataStart += 1
    if (bytes[dataStart] === 0x0a) dataStart += 1

    const endIdx = indexOfBytes(bytes, "endstream", dataStart)
    if (endIdx < 0) break
    let dataEnd = endIdx
    while (
      dataEnd > dataStart &&
      (bytes[dataEnd - 1] === 0x0a || bytes[dataEnd - 1] === 0x0d)
    ) {
      dataEnd -= 1
    }

    const num = (re: RegExp, def = 0) => {
      const m = dict.match(re)
      return m ? Number(m[1]) || def : def
    }
    const width = num(/\/Width\s+(\d+)/)
    const height = num(/\/Height\s+(\d+)/)
    if (width < 50 || height < 50) continue

    const filterArr = dict.match(/\/Filter\s*\[([^\]]*)\]/)
    const filterSingle = dict.match(/\/Filter\s*\/([A-Za-z0-9]+)/)
    const filters = filterArr
      ? Array.from(filterArr[1].matchAll(/\/([A-Za-z0-9]+)/g), (m) => m[1])
      : filterSingle
        ? [filterSingle[1]]
        : []

    let colors = 3
    if (/\/ColorSpace\s*\/DeviceGray/.test(dict)) colors = 1
    else if (/\/ColorSpace\s*\/DeviceCMYK/.test(dict)) colors = 4
    else if (/\/ColorSpace\s*\/DeviceRGB/.test(dict)) colors = 3

    const bpc = num(/\/BitsPerComponent\s+(\d+)/, 8)
    const predictor = (() => {
      const m = dict.match(/\/DecodeParms\s*<<([\s\S]*?)>>/)
      if (!m) return 1
      const p = m[1].match(/\/Predictor\s+(\d+)/)
      return p ? Number(p[1]) || 1 : 1
    })()

    out.push({
      width,
      height,
      filters,
      colors,
      bpc,
      predictor,
      dataStart,
      dataEnd,
    })
  }
  return out
}

async function inflateZlib(data: Uint8Array): Promise<Uint8Array | null> {
  try {
    const DS: any = (globalThis as any).DecompressionStream
    if (!DS) return null
    const stream = new Blob([data as BlobPart])
      .stream()
      .pipeThrough(new DS("deflate"))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

async function deflateZlib(data: Uint8Array): Promise<Uint8Array | null> {
  try {
    const CS: any = (globalThis as any).CompressionStream
    if (!CS) return null
    const stream = new Blob([data as BlobPart])
      .stream()
      .pipeThrough(new CS("deflate"))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

/** Adobe ASCII85 解码（PDF 常用 ASCII85Decode + FlateDecode） */
function ascii85Decode(input: Uint8Array): Uint8Array | null {
  const text = decodeLatin1(input).replace(/\s+/g, "")
  let s = text
  if (s.startsWith("<~")) s = s.slice(2)
  const end = s.indexOf("~>")
  if (end >= 0) s = s.slice(0, end)
  const out: number[] = []
  let group: number[] = []
  for (const ch of s) {
    if (ch === "z" && group.length === 0) {
      out.push(0, 0, 0, 0)
      continue
    }
    const code = ch.charCodeAt(0) - 33
    if (code < 0 || code > 84) return null
    group.push(code)
    if (group.length === 5) {
      let value = 0
      for (const g of group) value = value * 85 + g
      out.push(
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff,
      )
      group = []
    }
  }
  if (group.length > 0) {
    const missing = 5 - group.length
    while (group.length < 5) group.push(84)
    let value = 0
    for (const g of group) value = value * 85 + g
    const bytes = [
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    ]
    out.push(...bytes.slice(0, 4 - missing))
  }
  return new Uint8Array(out)
}

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

/** 还原 PNG 预测器（Predictor >= 10） */
function unpredict(
  data: Uint8Array,
  width: number,
  channels: number,
  bpc: number,
  height: number,
): Uint8Array | null {
  const bpp = Math.max(1, Math.ceil((channels * bpc) / 8))
  const stride = Math.ceil((width * channels * bpc) / 8)
  if (data.length < height * (stride + 1)) return null
  const out = new Uint8Array(stride * height)
  let prev = new Uint8Array(stride)
  for (let y = 0; y < height; y++) {
    const base = y * (stride + 1)
    const filter = data[base]
    const cur = new Uint8Array(stride)
    for (let x = 0; x < stride; x++) {
      const raw = data[base + 1 + x]
      const left = x >= bpp ? cur[x - bpp] : 0
      const up = prev[x]
      const upLeft = x >= bpp ? prev[x - bpp] : 0
      let value = raw
      if (filter === 1) value = (raw + left) & 0xff
      else if (filter === 2) value = (raw + up) & 0xff
      else if (filter === 3) value = (raw + ((left + up) >> 1)) & 0xff
      else if (filter === 4) value = (raw + paeth(left, up, upLeft)) & 0xff
      cur[x] = value
    }
    out.set(cur, y * stride)
    prev = cur
  }
  return out
}

/** 原始像素 → RGB（只处理 8bit 与 1bit 灰度） */
function toRgb(
  pixels: Uint8Array,
  width: number,
  height: number,
  channels: number,
  bpc: number,
): Uint8Array | null {
  const count = width * height
  const out = new Uint8Array(count * 3)
  if (bpc === 8) {
    if (channels === 3) {
      if (pixels.length < count * 3) return null
      out.set(pixels.subarray(0, count * 3))
      return out
    }
    if (channels === 1) {
      if (pixels.length < count) return null
      for (let i = 0; i < count; i++) {
        const v = pixels[i]
        out[i * 3] = v
        out[i * 3 + 1] = v
        out[i * 3 + 2] = v
      }
      return out
    }
    if (channels === 4) {
      if (pixels.length < count * 4) return null
      for (let i = 0; i < count; i++) {
        const c = pixels[i * 4]
        const m = pixels[i * 4 + 1]
        const y = pixels[i * 4 + 2]
        const k = pixels[i * 4 + 3]
        out[i * 3] = 255 - Math.min(255, c + k)
        out[i * 3 + 1] = 255 - Math.min(255, m + k)
        out[i * 3 + 2] = 255 - Math.min(255, y + k)
      }
      return out
    }
    return null
  }
  if (bpc === 1 && channels === 1) {
    const stride = Math.ceil(width / 8)
    if (pixels.length < stride * height) return null
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bit = (pixels[y * stride + (x >> 3)] >> (7 - (x & 7))) & 1
        const v = bit ? 255 : 0
        const idx = (y * width + x) * 3
        out[idx] = v
        out[idx + 1] = v
        out[idx + 2] = v
      }
    }
    return out
  }
  return null
}

let crcTable: Uint32Array | null = null
function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const u32be = (n: number) => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
]

function pngChunk(type: string, payload: Uint8Array): Uint8Array {
  const typeBytes = PDF_CHAR(type)
  const out = new Uint8Array(12 + payload.length)
  out.set(u32be(payload.length), 0)
  out.set(typeBytes, 4)
  out.set(payload, 8)
  const crcInput = new Uint8Array(4 + payload.length)
  crcInput.set(typeBytes, 0)
  crcInput.set(payload, 4)
  out.set(u32be(crc32(crcInput)), 8 + payload.length)
  return out
}

/** 把 RGB 原始像素编码成 PNG（Worker 没有 canvas，只能手写最小编码器） */
async function encodePng(
  width: number,
  height: number,
  rgb: Uint8Array,
): Promise<Uint8Array | null> {
  const stride = width * 3
  const raw = new Uint8Array((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    raw.set(rgb.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  }
  const compressed = await deflateZlib(raw)
  if (!compressed) return null

  const ihdr = new Uint8Array([
    ...u32be(width),
    ...u32be(height),
    8, // bit depth
    2, // color type: RGB
    0,
    0,
    0,
  ])
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const chunks = [
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array(0)),
  ]
  const total = sig.length + chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  out.set(sig, pos)
  pos += sig.length
  for (const c of chunks) {
    out.set(c, pos)
    pos += c.length
  }
  return out
}

/** 从 PDF 中提取面积最大的内嵌图像作为封面 */
export async function extractPdfCover(
  bytes: Uint8Array,
  maxOutputBytes = 4 * 1024 * 1024,
): Promise<{ data: Uint8Array; mime: string } | null> {
  try {
    const images = parsePdfImages(bytes)
    if (images.length === 0) return null
    images.sort((a, b) => b.width * b.height - a.width * a.height)

    for (const img of images.slice(0, 4)) {
      const raw = bytes.subarray(img.dataStart, img.dataEnd)
      if (raw.length === 0) continue
      const filters = img.filters.map((f) => f.toLowerCase())

      // JPX/JBIG2 浏览器无法解码
      if (filters.some((f) => f.includes("jpx") || f.includes("jbig"))) continue
      // 已经是 JPEG：直接返回
      if (filters.some((f) => f.includes("dct"))) {
        const mime = sniffImageMime(raw)
        if (mime === "image/jpeg") return { data: raw, mime }
        continue
      }

      let stream: Uint8Array | null = raw
      if (filters.some((f) => f.includes("ascii85"))) {
        stream = ascii85Decode(stream)
        if (!stream) continue
      }
      if (filters.some((f) => f.includes("flate"))) {
        stream = await inflateZlib(stream)
        if (!stream) continue
      }
      if (!stream) continue

      let pixels = stream
      if (img.predictor >= 10) {
        const restored = unpredict(
          stream,
          img.width,
          img.colors,
          img.bpc,
          img.height,
        )
        if (!restored) continue
        pixels = restored
      }

      const rgb = toRgb(pixels, img.width, img.height, img.colors, img.bpc)
      if (!rgb) continue
      const png = await encodePng(img.width, img.height, rgb)
      if (!png || png.length > maxOutputBytes) continue
      return { data: png, mime: "image/png" }
    }
  } catch (e: any) {
    console.warn("[media] parse pdf cover failed:", e?.message || e)
  }
  return null
}
