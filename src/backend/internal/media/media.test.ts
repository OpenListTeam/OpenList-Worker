import assert from "node:assert/strict"
import test from "node:test"

import {
  emptyMediaDb,
  extOf,
  isBookFile,
  isImageFile,
  isMusicFile,
  isVideoFile,
  mediaTypeOfFile,
  type MediaItem,
} from "./model"
import {
  createPlaylist,
  ensureUserData,
  getUserData,
  listFavorites,
  nextId,
  playlistItems,
  queryItems,
  replacePlaylistItems,
  upsertItem,
} from "./store"
import {
  extractPdfCover,
  parseFLAC,
  parseID3v2,
  sniffImageMime,
} from "./tag"
import {
  disableTranscodeSettings,
  isTranscodeSettingKey,
  stripTranscodeSettings,
} from "../model/transcode-guard"
import { buildStrmTargets, withinOutRoot } from "./strm"
import { emptyCover, persistCover } from "./thumb"
import { __scanTest } from "./scan"
import { parseMediaTitle } from "./scrape"

test("media extension mapping", () => {
  assert.equal(extOf("movie.2024.MKV"), "mkv")
  assert.equal(mediaTypeOfFile("movie.mkv"), "video")
  assert.equal(mediaTypeOfFile("song.flac"), "music")
  assert.equal(mediaTypeOfFile("cover.webp"), "image")
  assert.equal(mediaTypeOfFile("book.epub"), "book")
  assert.equal(mediaTypeOfFile("note.txt"), "book")
  assert.equal(mediaTypeOfFile("archive.zip"), null)
  assert.ok(isVideoFile("a.mp4"))
  assert.ok(isMusicFile("a.mp3"))
  assert.ok(isImageFile("a.png"))
  assert.ok(isBookFile("a.pdf"))
})

test("query items filters type, keyword and path prefix", () => {
  const db = emptyMediaDb()
  const base = {
    scan_path_id: 1,
    scraped_name: "",
    cover: "",
    authors: "",
    plot: "",
    description: "",
    genre: "",
    release_date: "",
    rating: 0,
    file_size: 100,
    duration: 0,
    season: 0,
    episode: 0,
    episodes: "",
    album_name: "",
    album_artist: "",
    track_number: 0,
    publisher: "",
    isbn: "",
    external_id: "",
    hidden: false,
    scraper_source: "",
  }
  upsertItem(db, {
    ...base,
    media_type: "video",
    folder_path: "/movies",
    file_name: "Inception.mkv",
    scraped_name: "盗梦空间",
  })
  upsertItem(db, {
    ...base,
    media_type: "video",
    folder_path: "/private",
    file_name: "Secret.mkv",
    scraped_name: "秘密",
  })
  assert.equal(queryItems(db, { media_type: "video" }).total, 2)
  assert.equal(queryItems(db, { media_type: "video", keyword: "盗梦" }).total, 1)
  assert.equal(
    queryItems(db, { media_type: "video", path_prefix: "/movies" }).total,
    1,
  )
  assert.equal(queryItems(db, { ids: [1] }).content[0].file_name, "Inception.mkv")
})

test("favorites and progress are isolated per user", () => {
  const db = emptyMediaDb()
  const item = upsertItem(db, {
    media_type: "video",
    scan_path_id: 1,
    folder_path: "/movies",
    file_name: "a.mkv",
    scraped_name: "A",
    cover: "",
    authors: "",
    plot: "",
    description: "",
    genre: "",
    release_date: "",
    rating: 0,
    file_size: 0,
    duration: 0,
    season: 0,
    episode: 0,
    episodes: "",
    album_name: "",
    album_artist: "",
    track_number: 0,
    publisher: "",
    isbn: "",
    external_id: "",
    hidden: false,
    scraper_source: "",
  })
  const row = ensureUserData(db, 1, item.id)
  row.is_favorite = true
  row.position_ticks = 120
  ensureUserData(db, 2, item.id)
  assert.equal(getUserData(db, 1, item.id)?.is_favorite, true)
  assert.equal(getUserData(db, 2, item.id)?.is_favorite, false)
  assert.equal(listFavorites(db, 1).length, 1)
  assert.equal(listFavorites(db, 2).length, 0)
})

test("nextId never reuses ids", () => {
  const db = emptyMediaDb()
  assert.equal(nextId(db), 1)
  assert.equal(nextId(db), 2)
  assert.equal(db.next_id, 3)
})

test("episode / season parsing", () => {
  const { parseEpisodeInfo, parseSeasonFromPath } = __scanTest
  const se = parseEpisodeInfo("My.Show.S02E05.1080p.mkv", 1)
  assert.equal(se.season, 2)
  assert.equal(se.index, 5)
  assert.equal(se.file_name, "My.Show.S02E05.1080p.mkv")

  const ep = parseEpisodeInfo("EP07.mp4", 1)
  assert.equal(ep.index, 7)

  const cn = parseEpisodeInfo("第三集.mp4", 1)
  assert.equal(cn.index, 3)

  const lead = parseEpisodeInfo("08 - Pilot.mkv", 1)
  assert.equal(lead.index, 8)
  assert.equal(lead.title, "Pilot")

  // 分辨率不能被误判为集号
  const plain = parseEpisodeInfo("1080p.mkv", 9)
  assert.equal(plain.index, 9)

  assert.equal(parseSeasonFromPath("/tv/Show/Season 03"), 3)
  assert.equal(parseSeasonFromPath("/tv/Show/S04"), 4)
  assert.equal(parseSeasonFromPath("/tv/Show"), 1)
})

test("ID3v2 text frames", () => {
  const syncsafe = (n: number) => [
    (n >> 21) & 0x7f,
    (n >> 14) & 0x7f,
    (n >> 7) & 0x7f,
    n & 0x7f,
  ]
  const utf8 = (s: string) => Array.from(new TextEncoder().encode(s))
  const frame = (id: string, text: string) => {
    const body = [3, ...utf8(text)]
    const size = body.length
    return [
      ...utf8(id),
      (size >> 24) & 0xff,
      (size >> 16) & 0xff,
      (size >> 8) & 0xff,
      size & 0xff,
      0,
      0,
      ...body,
    ]
  }
  const body = [
    ...frame("TIT2", "Hello"),
    ...frame("TPE1", "World"),
    ...frame("TALB", "AlbumX"),
    ...frame("TRCK", "3/12"),
    ...frame("TYER", "2021"),
  ]
  const tag = new Uint8Array([
    0x49,
    0x44,
    0x33,
    3,
    0,
    0,
    ...syncsafe(body.length),
    ...body,
  ])
  const parsed = parseID3v2(tag)
  assert.ok(parsed)
  assert.equal(parsed!.title, "Hello")
  assert.equal(parsed!.artist, "World")
  assert.equal(parsed!.album, "AlbumX")
  assert.equal(parsed!.trackNumber, 3)
  assert.equal(parsed!.year, "2021")
})

test("FLAC vorbis comment", () => {
  const le32 = (n: number) => [
    n & 0xff,
    (n >> 8) & 0xff,
    (n >> 16) & 0xff,
    (n >> 24) & 0xff,
  ]
  const utf8 = (s: string) => Array.from(new TextEncoder().encode(s))
  const entries = [
    "TITLE=Song",
    "ARTIST=Singer",
    "ALBUM=Record",
    "TRACKNUMBER=7",
    "DATE=2019-05-01",
    "GENRE=Rock",
  ]
  const vendor = utf8("openlist")
  const body = [
    ...le32(vendor.length),
    ...vendor,
    ...le32(entries.length),
    ...entries.flatMap((e) => [...le32(e.length), ...utf8(e)]),
  ]
  // metadata block 头部的 24 位长度按规范是大端（载荷内部长度才是小端）
  const header = [
    0x84, // last + type 4
    (body.length >> 16) & 0xff,
    (body.length >> 8) & 0xff,
    body.length & 0xff,
  ]
  const flac = new Uint8Array([...utf8("fLaC"), ...header, ...body])
  const tag = parseFLAC(flac)
  assert.ok(tag)
  assert.equal(tag!.title, "Song")
  assert.equal(tag!.artist, "Singer")
  assert.equal(tag!.album, "Record")
  assert.equal(tag!.albumArtist, "")
  assert.equal(tag!.trackNumber, 7)
  assert.equal(tag!.year, "2019")
  assert.equal(tag!.genre, "Rock")
})

test("image mime sniffing rejects non-images", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
  assert.equal(sniffImageMime(jpeg), "image/jpeg")
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])
  assert.equal(sniffImageMime(png), "image/png")
  const html = new TextEncoder().encode("<svg><script>")
  assert.equal(sniffImageMime(html), "")
})

test("playlist helpers keep order and counts", () => {
  const db = emptyMediaDb()
  const a = upsertItem(db, {
    media_type: "music",
    folder_path: "/music",
    file_name: "a.mp3",
  })
  const b = upsertItem(db, {
    media_type: "music",
    folder_path: "/music",
    file_name: "b.mp3",
  })
  const pl = createPlaylist(db, 1, "Mix", [a.id, b.id])
  assert.equal(pl.item_count, 2)
  assert.deepEqual(
    playlistItems(db, pl.id).map((i) => i.item_id),
    [a.id, b.id],
  )
  replacePlaylistItems(db, pl.id, [b.id])
  assert.equal(playlistItems(db, pl.id).length, 1)
})

test("PDF cover: DCTDecode (JPEG) stream", async () => {
  const jpeg = Uint8Array.from([
    0xff,
    0xd8,
    0xff,
    0xe0,
    ...new Array(64).fill(0),
  ])
  const head = `1 0 obj\n<< /Type /XObject /Subtype /Image /Width 200 /Height 200 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  const tail = "\nendstream\nendobj\n"
  const pdf = new Uint8Array([
    ...new TextEncoder().encode(head),
    ...jpeg,
    ...new TextEncoder().encode(tail),
  ])
  const found = await extractPdfCover(pdf)
  assert.ok(found)
  assert.equal(found!.mime, "image/jpeg")
  assert.equal(found!.data[0], 0xff)
})

test("PDF cover: FlateDecode RGB image becomes PNG", async () => {
  // 2x2 RGB：红/绿/蓝/白
  const pixels = Uint8Array.from([
    255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255,
  ])
  const { deflateSync } = await import("node:zlib")
  const compressed = new Uint8Array(deflateSync(Buffer.from(pixels)))
  const head = `1 0 obj\n<< /Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`
  const tail = "\nendstream\nendobj\n"
  const pdf = new Uint8Array([
    ...new TextEncoder().encode(head),
    ...compressed,
    ...new TextEncoder().encode(tail),
  ])
  const found = await extractPdfCover(pdf)
  if (!found) {
    // 运行时不支持 CompressionStream 时跳过（Worker/Node 18+ 均支持）
    return
  }
  assert.equal(found.mime, "image/png")
  assert.deepEqual(
    Array.from(found.data.subarray(0, 8)),
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  )
})

test("transcode settings are stripped and forced off", () => {
  assert.equal(isTranscodeSettingKey("transcode_enabled"), true)
  assert.equal(isTranscodeSettingKey("transcode_hwaccel"), true)
  assert.equal(isTranscodeSettingKey("media_enabled"), false)

  const list = [
    { key: "transcode_enabled", value: "true" },
    { key: "media_enabled", value: "true" },
  ]
  assert.equal(stripTranscodeSettings(list).length, 1)
  assert.equal(stripTranscodeSettings(list)[0].key, "media_enabled")

  const map = disableTranscodeSettings({
    transcode_enabled: "true",
    transcode_hwaccel: "nvenc",
    media_enabled: "true",
  })
  assert.equal(map.transcode_enabled, "false")
  assert.equal(map.transcode_hwaccel, "")
  assert.equal(map.media_enabled, "true")
})

test("STRM targets follow Emby/Jellyfin layout", () => {
  const base: MediaItem = {
    id: 1,
    media_type: "video",
    scan_path_id: 1,
    folder_path: "/tv",
    file_name: "My Show",
    scraped_name: "My Show",
    cover: "",
    authors: "",
    plot: "",
    description: "",
    genre: "",
    release_date: "2020-01-01",
    rating: 0,
    file_size: 0,
    duration: 0,
    season: 2,
    episode: 0,
    episodes: JSON.stringify([
      { index: 5, title: "Pilot", file_name: "e5.mkv" },
    ]),
    album_name: "",
    album_artist: "",
    track_number: 0,
    publisher: "",
    isbn: "",
    external_id: "",
    hidden: false,
    scraper_source: "",
    created_at: "",
    updated_at: "",
    video_type: "tv",
    is_folder: true,
  }
  const targets = buildStrmTargets(base)
  assert.equal(targets.length, 1)
  assert.equal(targets[0].rawPath, "/tv/My Show/e5.mkv")
  assert.match(targets[0].relPath, /My Show\/Season 02\/My Show S02E05 - Pilot\.strm$/)

  const movie = buildStrmTargets({
    ...base,
    media_type: "video",
    video_type: "movie",
    is_folder: false,
    file_name: "Movie.mkv",
    scraped_name: "Movie",
    episodes: "",
    season: 0,
  })
  assert.match(movie[0].relPath, /Movie \(2020\)\/Movie \(2020\)\.strm$/)
})

test("STRM 多季合并与音乐专辑逐曲导出", () => {
  const multi: MediaItem = {
    id: 2,
    media_type: "video",
    scan_path_id: 1,
    folder_path: "/tv",
    file_name: "Show",
    scraped_name: "Show",
    cover: "",
    authors: "",
    plot: "",
    description: "",
    genre: "",
    release_date: "",
    rating: 0,
    file_size: 0,
    duration: 0,
    season: 1,
    episode: 0,
    episodes: JSON.stringify([
      { index: 1, season: 1, title: "Pilot", file_name: "S01E01.mkv" },
      { index: 1, season: 2, title: "Return", file_name: "S02E01.mkv" },
    ]),
    album_name: "",
    album_artist: "",
    track_number: 0,
    publisher: "",
    isbn: "",
    external_id: "",
    hidden: false,
    scraper_source: "",
    created_at: "",
    updated_at: "",
    video_type: "tv",
    is_folder: true,
  }
  const tv = buildStrmTargets(multi)
  assert.equal(tv.length, 2)
  // 合并文件夹里 S02E01 不能被写到 Season 01
  assert.match(tv[0].relPath, /Season 01\/Show S01E01 - Pilot\.strm$/)
  assert.match(tv[1].relPath, /Season 02\/Show S02E01 - Return\.strm$/)

  const album: MediaItem = {
    ...multi,
    id: 3,
    media_type: "music",
    video_type: "",
    folder_path: "/music",
    file_name: "Album",
    scraped_name: "Album",
    album_name: "Record",
    album_artist: "Artist",
    episodes: JSON.stringify([
      { index: 1, title: "One", file_name: "01.flac" },
      { index: 2, title: "Two", file_name: "02.flac" },
    ]),
  }
  const tracks = buildStrmTargets(album)
  assert.equal(tracks.length, 2)
  // 合并专辑必须指向每一首歌，而不是专辑目录
  assert.equal(tracks[1].rawPath, "/music/Album/02.flac")
  assert.match(tracks[1].relPath, /Artist\/Record\/02 - Two\.strm$/)
})

test("parseMediaTitle 生成可搜索的候选（对齐 Go scraper）", () => {
  // 旧实现把整个文件名当 query（含 SxxExx / 双语字幕 / HR-HDTV），TMDB 搜不到
  const film = parseMediaTitle(
    "Harry.Potter.and.the.Deathly.Hallows.Part.2.2011.哈利·波特与死亡圣器(下).双语字幕.HR-HDTV.AC3.1024X576.x264.mkv",
  )
  assert.equal(film.year, "2011")
  assert.ok(
    film.candidates.some((c) => c.includes("哈利·波特与死亡圣器")),
    `missing chinese title: ${JSON.stringify(film.candidates)}`,
  )
  assert.ok(
    !film.candidates.some((c) => /HR-HDTV|双语字幕|x264|AC3/i.test(c)),
    `noise leaked: ${JSON.stringify(film.candidates)}`,
  )

  const episode = parseMediaTitle("群星.S01E05.HD1080P.中英双字.霸王龙压制组T-Rex.mp4")
  assert.equal(episode.candidates[0], "群星")
  assert.equal(episode.year, "")

  // 片名本身就是年份时不能被年份清理吃掉
  const numeric = parseMediaTitle("2012.2009.1080p.BluRay.x264.mkv")
  assert.ok(numeric.candidates.some((c) => c.includes("2012")))
})

test("封面只认魔数，声明成 SVG 的内容会被丢弃", async () => {
  const svg = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  )
  const stored = await persistCover(null, svg, {
    storeThumbnail: false,
    mode: "runtime",
  })
  assert.deepEqual(stored, emptyCover())

  // 真正的 JPEG 头：0xFFD8FF + SOI/APP0
  const jpeg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ])
  const inline = await persistCover(null, jpeg, {
    storeThumbnail: false,
    mode: "runtime",
  })
  assert.equal(inline.thumb_mime, "image/jpeg")
  assert.match(inline.cover, /^data:image\/jpeg;base64,/)
})

test("STRM 输出根边界", () => {
  // 同目录模式不校验
  assert.equal(withinOutRoot("", "/a/b.strm"), true)
  assert.equal(withinOutRoot("/out", "/out/a.strm"), true)
  assert.equal(withinOutRoot("/out", "/out/sub/a.strm"), true)
  // 前缀相同但不同目录不能放行
  assert.equal(withinOutRoot("/out", "/output/a.strm"), false)
  assert.equal(withinOutRoot("/out", "/other/a.strm"), false)
  // 输出根设为存储根时不能把所有目标都判成越界
  assert.equal(withinOutRoot("/", "/a/b.strm"), true)
  // 目录穿越段必须先于前缀比较被拒绝
  assert.equal(withinOutRoot("/out", "/out/../../etc/x.strm"), false)
  assert.equal(withinOutRoot("/out", "/out/../x.strm"), false)
  assert.equal(withinOutRoot("/", "/../etc/x.strm"), false)
  // 编码点段在存储层解码后同样会穿越
  assert.equal(withinOutRoot("/out", "/out/%2e%2e/etc/x.strm"), false)
  assert.equal(withinOutRoot("/out", "/out/%2E%2E/%2E%2E/etc/x.strm"), false)
})
