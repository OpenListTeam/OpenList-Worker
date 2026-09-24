<!--
PR title / PR 标题:
- Use Conventional Commits: `type(scope): summary`
- Allowed types: `feat`, `docs`, `fix`, `style`, `refactor`, `chore`
- Scope is required by the current PR title check.
- For breaking changes, add `!`: `feat(driver)!: change auth flow`
-->

`feat(cache): implement file-tree cache and download-link cache (DB by default, KV/Blob via env)`

## Summary / 摘要

参考 [Wudarensheng/OpenList.ts](https://github.com/Wudarensheng/OpenList.ts) 的两级持久缓存，
为本项目实现**文件树缓存**与**下载链接缓存**。

**默认只向数据库启用**：缓存与业务数据走同一条存储链路（`getStorageBackend()` 解析出的
driver，即 `DB_DRIVER` 指向的 D1 / MySQL / KV / cfkv / Blob / DO），因此「什么都不配」
就等于「用数据库做缓存」。想要改用 / 额外启用 KV、Blob 等专用后端，**必须显式添加
环境变量**（`CACHE_DRIVER`），不会自动探测、也不会自动回退——与 `DB_DRIVER`
「显式配置不回退」的既有哲学一致。

### 用户可感知的行为变化

- `/api/fs/list`、`/api/fs/get`、`/api/fs/dirs` 浏览目录时优先命中缓存，
  不再每次都请求网盘 / 对象存储；
- `/d`、`/p` 等下载链路复用驱动换取的直链，重复下载 / 预览不再重新换链；
- 写操作（mkdir / rename / remove / move / copy / put）与存储配置变更后缓存立即失效；
- 默认配置下**行为与之前一致**，只是更快、对上游更友好（缓存落在同一个数据库后端）。

### 重要实现变化

- 新增 `src/backend/internal/cache/`：`config.ts`（环境变量）/ `store.ts`（后端解析与键编码）/
  `filetree.ts`（文件树缓存）/ `link.ts`（下载链接缓存）/ `index.ts`（统一入口与失效）；
- 缓存写入**直接调用 driver 的 `get/put/delete/list`**，不经过 `saveDb()`：
  不触发整配置对象序列化 / 写前守卫 / 字段加密，也不会污染业务数据
  （键名统一带 `openlist_cache` 前缀，与 `openlist_config`、`users_1` 等隔离）；
- 缓存只保存**驱动层结果**（原始 FileItem 列表、直链），权限 / meta 密码 /
  隐藏规则 / 下载签名仍在 `server/fs.ts`、`server/raw.ts` 按请求实时计算，
  因此**缓存不会造成越权**；
- 缓存失败（后端不可用、序列化失败等）一律降级为「不缓存」，绝不影响业务请求。

### 配置 / 存储 / API 变化

新增环境变量（默认值即「只向数据库启用」）：

| 变量 | 默认值 | 说明 |
| :-- | :-- | :-- |
| `CACHE_ENABLED` | `true` | 总开关 |
| `CACHE_DRIVER` | `db` | 后端列表，逗号分隔：`db` / `kv` / `blob` / `cfkv` / `do` / `memory` / `none` |
| `CACHE_FILE_TREE` | `true` | 文件树缓存开关 |
| `CACHE_DOWNLOAD_LINK` | `true` | 下载链接缓存开关 |
| `CACHE_TTL` | `0` | 文件树缓存时长（分钟）；`0` = 跟随存储级 `cache_expiration` |
| `CACHE_LINK_TTL` | `5` | 下载链接缓存时长（分钟） |
| `CACHE_EXCLUDE_DRIVERS` | `virtual,alias,url_tree,strm,chunk` | 不参与缓存的驱动 |
| `CACHE_PREFIX` | `openlist_cache` | 缓存键前缀 |

新增管理接口：

- `GET  /api/admin/cache/status` —— 生效配置、实际后端、各级条目数
- `POST /api/admin/cache/clear` —— body `{ type?: "file_tree" | "download_link", storage_id?: number }`
- `POST /api/admin/storage/refresh` —— 刷新全部文件树缓存（对齐 OpenList.ts）
- `POST /api/admin/storage/refresh_one?id=<id>` —— 刷新单个存储（对齐 OpenList.ts）

`/api/public/env_check` 新增 `cache` 字段，回显配置与实际生效后端。

## Testing / 测试

```bash
npm run test:cache     # 新增：缓存模块回归测试（配置 / 键编码 / 两级缓存 / 清理）
npm run lint           # tsc --noEmit
```

`src/backend/internal/cache/cache.test.ts` 通过 `__setCacheDriversForTest()` 注入内存假驱动，
不依赖任何真实存储后端，锁定：

1. 默认只向数据库启用（`CACHE_DRIVER` 缺省 → `db`），KV/Blob 必须显式配置；
2. 各开关语义（`CACHE_ENABLED` / `CACHE_FILE_TREE` / `CACHE_DOWNLOAD_LINK`）；
3. 键名只含 `[A-Za-z0-9_]`（EdgeOne KV 约束），超长路径被确定性压缩；
4. 缓存命中返回副本，避免调用方就地修改污染缓存；
5. 过期条目视为未命中并被惰性清理；
6. 下载链接只缓存「确实拿到直链的文件」（目录 / 空直链不缓存）；
7. `clearCache` 按存储 id 过滤，不误伤相邻 id。

## Checklist / 检查清单

- [x] 遵循 Conventional Commits 的 PR 标题
- [x] 新增/修改代码通过 `npm run lint`（tsc --noEmit）
- [x] 新增单元测试并通过
- [x] 更新 README 环境变量文档与 `package.json` 的 Cloudflare bindings 说明
- [x] 不引入破坏性变更（默认配置行为不变）

## Implementation Notes / 实现说明

### 为什么默认是 `db`

`db` 后端复用 `getStorageBackend()` 的解析结果，因此缓存与业务数据**同后端**：
- 用户不需要额外配置任何东西；
- 不需要额外的绑定，也就不存在「部署了但缓存后端不可用」的隐性故障；
- 单一后端不会出现「业务数据在 D1、缓存在 KV」这类难以排查的分裂。

### 多后端语义

`CACHE_DRIVER=db,kv` 时：**读按顺序命中，写全部铺开**。任一后端不可用时
跳过并告警一次（`warnOnce`），绝不静默替换成别的后端；若最终一个都不剩，
缓存整体降级为 no-op。

### TTL 与「不缓存」

- 文件树 TTL 优先级：`CACHE_TTL`（>0 时覆盖）→ 存储级 `cache_expiration`
  （可被 `custom_cache_policies` 按路径覆盖）→ 默认 30 分钟；
- 存储级 `cache_expiration=0` 或路径级策略命中 `0` 时，该目录**永不缓存**
  （与 Go 的语义一致）；
- 下载链接 TTL 独立（默认 5 分钟）：直链通常自带有效期，缓存过久会把
  「已失效的链接」交给浏览器。

### 失效策略

- 写操作：失效「被改动路径」+「其父目录」的文件树缓存，以及被改动路径的链接缓存；
- 存储更新 / 启用 / 禁用 / 删除：清空该存储的全部缓存（避免 id 复用时读到旧内容）；
- 过期条目在读路径上惰性清理，避免缓存无限膨胀。

### 已知限制

- 链接缓存的 TTL 是**静态**的，不解析直链里 `Expires` 参数：TTL 设置过大时
  可能把已失效的链接交给浏览器（表现为 403/404）。保守默认 5 分钟，
  必要时可设 `CACHE_LINK_TTL=0` 关闭链接缓存；
- 删除目录时只失效该目录自身的缓存，其下文件的链接缓存随 TTL 自然过期
  （链接 TTL 很短，不做递归清理以避免大量删除操作）；
- 纯本地计算型驱动（`virtual` / `alias` / `url_tree` / `strm` / `chunk`）
  默认不缓存：没有远程 IO，缓存只会带来陈旧。
