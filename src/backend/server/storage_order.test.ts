import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { listItems } from "../internal/op/storage"
import { saveDb } from "../internal/model/db"
import { adminRouter } from "./admin"

/**
 * 存储「序号」（storage.order）必须真实生效 —— 对齐 Go：
 *
 * - 虚拟根目录的挂载点顺序：`op.getStorageVirtualFilesByPath`
 *     先按 `Order` 升序，`Order` 相同时按 `MountPath` 升序；
 * - 后台存储列表：`internal/db.GetStorages`（`addStorageOrder` = `order, id`）。
 *
 * 此前 TS 两处都直接沿用数据库数组顺序，后台改「序号」后排序完全不变。
 */

const storageRow = (
  id: number,
  mount: string,
  order: number,
  extra: Record<string, any> = {},
) => ({
  id,
  driver: "gen",
  mount_path: mount,
  addition: "{}",
  modified: "2026-01-01T00:00:00.000Z",
  disabled: false,
  order,
  ...extra,
})

const dbWith = (storages: any[], settings: any[] = []) => ({
  settings,
  users: [],
  storages,
  shares: [],
  metas: [],
})

test("根目录挂载点按 storage.order 升序、同序号按 mount_path 升序", async () => {
  const env: any = {}
  await saveDb(
    dbWith([
      // 数据库里的顺序刻意与 order 相反，确保测的是 order 而不是数组下标
      storageRow(11, "/c", 2),
      storageRow(12, "/a", 1),
      storageRow(13, "/b", 2),
    ]),
    env,
  )

  const { content } = await listItems("/", { env })
  assert.deepEqual(
    content.map((i) => i.name),
    ["a", "b", "c"],
  )
})

test("序号相同时按 mount_path 升序（不依赖 id / 插入顺序）", async () => {
  const env: any = {}
  await saveDb(
    dbWith([
      storageRow(21, "/zzz", 0),
      storageRow(22, "/aaa", 0),
      storageRow(23, "/mmm", 0),
    ]),
    env,
  )

  const { content } = await listItems("/", { env })
  assert.deepEqual(
    content.map((i) => i.name),
    ["aaa", "mmm", "zzz"],
  )
})

test("被禁用的存储不参与挂载点合并", async () => {
  const env: any = {}
  await saveDb(
    dbWith([
      storageRow(31, "/keep", 1),
      storageRow(32, "/gone", 2, { disabled: true }),
    ]),
    env,
  )

  const { content } = await listItems("/", { env })
  assert.deepEqual(
    content.map((i) => i.name),
    ["keep"],
  )
})

test("后台存储列表按 order, id 升序返回（对齐 Go db.GetStorages）", async () => {
  const env: any = { }
  await saveDb(
    dbWith(
      [
        storageRow(42, "/b", 5),
        storageRow(41, "/a", 5),
        storageRow(43, "/c", 1),
      ],
      [{ key: "token", value: "admin-token" }],
    ),
    env,
  )

  const app = new Hono()
  app.route("/api/admin", adminRouter)
  const res = await app.request(
    "/api/admin/storage/list",
    { method: "GET", headers: { Authorization: "Bearer admin-token" } },
    env,
  )
  assert.equal(res.status, 200)
  const body: any = await res.json()
  assert.deepEqual(
    body.data.content.map((s: any) => s.mount_path),
    ["/c", "/a", "/b"],
  )
})
