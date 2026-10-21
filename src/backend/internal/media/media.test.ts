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
} from "./model"
import {
  ensureUserData,
  getUserData,
  listFavorites,
  nextId,
  queryItems,
  upsertItem,
} from "./store"

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
