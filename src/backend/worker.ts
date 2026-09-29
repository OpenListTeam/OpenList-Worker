import app from "./index"
import { OpenListDB } from "./durable-objects/OpenListDB"

// Durable Object 类（DB_DRIVER=do 时使用），需在 wrangler.toml 声明
// new_sqlite_classes = ["OpenListDB"] 与对应的 binding。
export { OpenListDB }

export default {
  fetch: app.fetch,
}
