// Telegram 驱动：索引在 DB（settings 表）中的读写。
//
// 单独成文件，避免 index.ts（纯逻辑）为了被单测而拖入整个 model/db。

import { getDb, saveDb } from "../../internal/model/db"
import type { IndexShape } from "./index"
import { parseIndex, serializeIndex } from "./index"

/** 从 DB 载入索引 */
export async function loadIndex(key: string, env?: any): Promise<IndexShape> {
  const db = await getDb(env)
  const setting = (db.settings || []).find((s: any) => s?.key === key)
  return parseIndex(setting?.value)
}

/** 写回 DB */
export async function saveIndex(
  key: string,
  idx: IndexShape,
  env?: any,
): Promise<void> {
  const db = await getDb(env)
  if (!Array.isArray(db.settings)) db.settings = []
  const value = serializeIndex(idx)
  const i = db.settings.findIndex((s: any) => s?.key === key)
  if (i !== -1) {
    db.settings[i].value = value
  } else {
    db.settings.push({
      key,
      value,
      type: "string",
      help: "Telegram 驱动目录索引（由驱动自动维护，请勿手工修改）",
      group: 99,
      flag: 0,
    })
  }
  await saveDb(db, env)
}

export { INDEX_VERSION }
