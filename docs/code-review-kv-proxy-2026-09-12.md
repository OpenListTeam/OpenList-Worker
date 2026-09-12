# 代码评审报告：EdgeOne KV 代理 + 存储驱动加固

> **评审范围**：`feat/edgeone-kv-proxy` 相对 `04b25d8`（merge-base）的全部改动
> **规模**：65 文件，+3463 / −1600
> **日期**：2026-09-12
> **审查方式**：静态分析（未执行运行时测试）

---

## 一、基本信息

| 项 | 值 |
|---|---|
| 语言 / 运行时 | TypeScript + JavaScript (ESM) |
| 平台 | Cloudflare Workers / EdgeOne（边缘函数 + Node 云函数）/ 阿里云 ESA |
| 框架 | Hono |
| 静态检查 | `tsc --noEmit` → **0 错误** |
| 审查配置 | 无 `.codereview`（按默认 `normal` 严格度）|

---

## 二、总结评分

| 维度 | 评分 | 说明 |
|---|---|---|
| **最小改动** | ⭐⭐⭐☆☆ | 存在**过度设计**：`_regress.mjs`（~500 行）未纳入 npm scripts；`STALE_*` 清理逻辑偏重 |
| **简单可靠** | ⭐⭐⭐⭐☆ | 主流程清晰；少数地方有可简化的状态机 |
| **安全性** | ⭐⭐⭐☆☆ | **发现 1 个中危、3 个低危**（详见 §四）|
| **性能** | ⭐⭐⭐⭐☆ | KV list 有安全阀；密钥读取无缓存是刻意权衡 |
| **逻辑正确性** | ⭐⭐⭐⭐☆ | 核心链路正确；发现 2 处边界缺陷 |
| **综合** | **⭐⭐⭐⭐☆** | 可合并，但建议先修 P1 项 |

---

## 三、需求符合性

| 需求 | 状态 |
|---|---|
| EdgeOne Node 云函数可用（KV 代理）| ✅ 已实现 |
| worker/eo/esa 禁止内存存储 | ✅ 已实现（双层防护）|
| 检测顺序 `mysql→d1→kv→cfkv→blob→do` | ✅ 已实现 |
| mysql 仅显式配置时探测 | ✅ 已实现 |
| KV-safe 键名 | ✅ 已实现 |
| 一键部署不声明绑定 | ✅ 已实现 |
| Secret 通过模板声明并可保留 | ✅ 已实现 |
| 修复「初始化成功但密码错误」| ✅ 已实现 |
| 前端环境自检 + 三步向导 | ✅ 已实现 |

---

## 四、🛑 严重 / ⚠️ 重要问题

### P1 ⚠️ `X-Internal-Call` 仅比对密钥前 16 位（强度不足）

**位置**：`functions/_kv-proxy.js:194`、`src/backend/internal/model/store/json.ts:120`

```js
// 通过条件
if (secret && timingSafeEqual(internal, secret.slice(0, 16))) {
  return { ok: true, mode: "internal" }
}
```

**问题**：

1. **熵减半**：`JWT_SECRET` 推荐 64 位 hex（256 bit），截取前 16 字符后仅剩 **64 bit** 熵。对暴力破解而言，难度从 2²⁵⁶ 降到 2⁶⁴。
2. **内部通道权限过高**：一旦 `X-Internal-Call` 校验通过，`authorize()` 直接返回 `ok: true`，**绕过所有后续校验**（包括管理员角色检查），可对 KV 做**任意读写删**。
3. **无频率限制**：`/kv-*` 端点无速率限制，64 bit 空间在长期暴力下并非不可触及（尤其配合已知前缀）。

**攻击模拟**：

```
攻击者已知目标部署 → 直接 POST /kv-put
  headers: { "X-Internal-Call": "<猜测前16位>" }
  body: { key: "openlist_config", value: "<恶意数据>" }
→ 若命中，可直接覆盖整个数据库配置
```

**建议**（任选其一）：

| 方案 | 改动量 | 说明 |
|---|---|---|
| **A. 用完整密钥比对** | 1 行 | `timingSafeEqual(internal, secret)`，标识直接用完整 `JWT_SECRET` |
| **B. 独立内部密钥** | 中 | 引入 `INTERNAL_CALL_SECRET`，与 `JWT_SECRET` 分离 |
| **C. HMAC 签名 + 时间戳** | 大 | 对请求体签名，防重放 |

**推荐 A**：改动最小，熵回到 256 bit，且 `timingSafeEqual` 已是常量时间比较。

---

### P2 ⚠️ `list()` 的 cursor 语义可能死循环（逻辑缺陷）

**位置**：`functions/kv-list/index.js:40-45`

```js
if (pageKeys.length > 0) {
  cursor = pageKeys[pageKeys.length - 1].key || ""
}
complete = Boolean(page?.complete) || pageKeys.length === 0
```

**问题**：若 EdgeOne KV 的 `list()` 语义是**「cursor 为该页起始位置」**（而非「下一页起始位置」），则 `cursor = 最后一个 key` 会导致**重复返回同一页**。

代码有 `guard < 1000` 安全阀，最坏情况返回 **1000 × 256 = 256,000 个重复 key**，导致：
- 响应体巨大（内存 + 带宽）
- `key` 数组含大量重复项，调用方（`format/key.ts` 的 `list` 前缀遍历）行为异常

**验证建议**：需在真实 EdgeOne 环境确认 `list()` 的 cursor 契约。若无法确认，建议改为以 `page.cursor`（若存在）为准，并在检测到**连续两页首个 key 相同**时中断。

---

### P3 💡 `__requestOrigin` 未做来源校验（潜在 SSRF）

**位置**：`src/backend/index.ts:36-39`、`json.ts:216`、`driver/kv.ts:154`

```js
const reqUrl = new URL(c.req.url)
if (!env.__requestOrigin) {
  env.__requestOrigin = reqUrl.origin
}
```

**风险评估**：`c.req.url` 由平台从**宿主头**派生。若 EdgeOne 未校验 `Host` 头，攻击者构造 `Host: evil.com` 请求可能使 `__requestOrigin = https://evil.com`，进而让 Node 侧把 KV 读写请求（**含 `X-Internal-Call` 头**）发往攻击者服务器。

**影响**：
- 泄漏 `X-Internal-Call`（密钥前 16 位）
- 若攻击者伪造 KV 响应，可注入任意配置

**缓解建议**：

```js
// 优先使用显式配置，其次才用请求来源
const explicit = env.EDGE_KV_BASE_URL
if (explicit) { /* 用它 */ }
else if (env.__requestOrigin) {
  // 校验：必须与本部署预期的域名一致（可通过环境变量白名单）
  if (!isTrustedOrigin(env.__requestOrigin, env)) { /* 拒绝或回退 */ }
}
```

或**直接要求生产环境显式配置 `EDGE_KV_BASE_URL`**（当前文档已提及，但非强制）。

**当前缓解**：`X-Internal-Call` 只发往 `origin`，而 `origin` 源自请求自身 —— 攻击者需能控制 `Host` 头才能利用。风险等级取决于 EdgeOne 平台的 Host 校验策略。

---

### P4 💡 数据库读写竞态（并发覆盖）

**位置**：`db.ts` 的 `saveDb` 全量写入

`DB_FORMAT=map` / `key` 下 `saveDb` 是**读-改-写**的全量替换：

```
请求 A: getDb() → 修改 users[0] → saveDb(全量)
请求 B: getDb() → 修改 storages[1] → saveDb(全量)  ← 覆盖 A 的 users 修改
```

**影响**：并发写入时后写者覆盖先写者（last-write-wins），**丢失更新**。

**评估**：这是**既有设计**（非本 PR 引入），且 KV 无事务。`DB_FORMAT=sql` 下按行 UPSERT 可缓解，但 `format/sql.ts` 的 `save()` 也是「DELETE 全表 + INSERT 全量」，同样存在竞态。

**建议**：文档中明确「`map`/`key` 格式不适合高并发写入」；长期可考虑 per-entity 写入（`key` 格式已有基础）。

---

## 五、深挖：其他发现

### 5.1 💡 `env_check` 的信息暴露面

**位置**：`public.ts:36-170`

该接口**免鉴权**，返回：

- `config.resolved_driver`（如 `kv`、`memory`）
- `storage.platform`（如 `Cloudflare / EdgeOne KV (KV)`）
- `storage.configError`（**可能含连接错误详情**，如 `KV proxy get failed: HTTP 401`）
- `issues[].message`（含 `status?.error` 原文）

**风险**：未授权者可通过 `env_check` **探测部署形态**（用了什么存储、是否 serverless、密钥是否已配置），为后续攻击提供情报。

**评估**：属于**低危信息泄露** —— 这些信息对 OpenList 部署（开源项目、典型单租户）敏感度低。但 `configError` 可能包含内部 DSN 片段或错误堆栈。

**建议**：`configError` 截断 + 脱敏（仅保留错误类别，不返回原始 message）。

```js
// 建议
message: `Storage driver "${resolvedDriver}" is configured but not reachable`
// 而非拼接 status?.error 原文
```

### 5.2 💡 定时任务密钥走 query 参数（易泄漏）

**位置**：`middlewares.ts:239`

```js
const query = c.req.query("cron_secret")
if (query && timingSafeEqual(query, secret)) return true
```

**风险**：`JWT_SECRET` 出现在 URL query 中，会被：
- 反向代理 / CDN 访问日志完整记录
- 浏览器历史（若被点击）
- `Referer` 头传递（若页面含外链）

**评估**：EdgeOne Schedules 的限制所致（无法自定义头），属**平台约束下的妥协**。但既然已支持 `X-Cron-Secret` 头，应**优先推荐头方式**，并在文档中警告 query 方式的风险。

**建议**：若平台允许，改为 header；至少文档标注「仅调试用」。

### 5.3 ⚠️ `ensureEncryptionSecret` 的孤儿密钥

**位置**：`db.ts:1267-1305`

并发场景下：

```
实例 A: 生成密钥 A → 写入 → 回读得到 A ✅
实例 B: 读不到（A 未传播）→ 生成 B → 写入（覆盖 A）→ 回读得到 B
```

**问题**：若 A 已用密钥 A 加密了数据（`saveDb` 在 `ensureEncryptionSecret` 之后执行），而 B 覆盖为密钥 B，则 A 加密的数据**永久无法解密**。

代码中的「采纳已存在密钥」逻辑（`readBack !== generated` 分支）缓解了读到的场景，但**写入覆盖仍会发生**（KV 的 `put` 无 CAS）。

**缓解**：当前靠「进程内单飞」降低同实例并发；跨实例竞态仅能通过 KV 的原子操作（`conditional put`）彻底解决，而 EdgeOne KV 是否支持需确认。

**评估**：属**已知残留风险**，代码注释已明确说明。可接受。

### 5.4 💡 `format/sql.ts` 的 `save()` 全量 DELETE

```js
// load: SELECT * FROM ... ；save: DELETE FROM <table> + 全量 INSERT
```

**风险**：
1. **数据丢失窗口**：`DELETE` 与 `INSERT` 之间若中断，表为空
2. **与 Go 后端共享库时危险**：若 Go 侧正在写，TS 侧的 `DELETE` 会清掉 Go 新增的行
3. **`sshkeys` 已在 `TABLE_NAMES` 中排除** ✅（本 PR 已修）

**建议**：`sql` 格式的 `save` 改为「差异 UPSERT + 显式删除」，或至少在文档中警告「不要与 Go 后端同时写入同一库」。

### 5.5 💡 `driver/kv.ts` 的双签名 `get()` 可能吞错

**位置**：`driver/kv.ts` 的 `get()`（双形态兜底）

```js
try { value = await kv.get(key, "text") } catch { value = undefined }
if (value === undefined || value === null) {
  try { value = await kv.get(key, { type: "text" }) } catch { value = null }
}
```

**风险**：若第一次调用因**网络错误**抛异常（非签名不兼容），代码会**静默重试**第二次，可能掩盖真实故障；且两次调用之间无退避，可能放大故障。

**建议**：区分「签名不兼容」（`TypeError`）与「网络错误」（其他），仅对前者重试。

---

## 六、攻击模拟（威胁建模）

### 场景 1：未授权访问 KV（篡改数据库）

```
目标：POST https://<deploy>/kv-put
尝试 1: 无凭证 → 401 ✅ 已拦截
尝试 2: 伪造 Authorization: Bearer <随机 JWT>
        → verifyJwt 验签失败 → 401 ✅ 已拦截
尝试 3: 伪造 X-Internal-Call: <16字符>
        → 需猜中 2^64 空间 ⚠️ 可行性低但非零（見 P1）
```

**结论**：主要防线有效；**P1 的熵减是唯一实质缺口**。

### 场景 2：JWT 算法混淆攻击

```
尝试：header = { alg: "none" }，payload = { role: 2 }
→ verifyJwt 强制 header.alg === "HS256" → 拒绝 ✅ 已拦截
```

**结论**：防护正确。

### 场景 3：CSRF / 跨域读取

```
尝试：从 evil.com 发起 fetch("/kv-list", { credentials: "include" })
→ 无 Authorization 头（浏览器不自动附加）→ 401 ✅
→ 且 KV 代理不依赖 Cookie
```

**结论**：KV 代理基于 Bearer Token，天然免疫 CSRF。

### 场景 4：时序攻击窃取密钥

```
尝试：逐个字符暴力 X-Internal-Call，测量响应时间差
→ timingSafeEqual 逐字符 XOR 累积，无提前返回 ✅ 已防护
→ 但 length 不等时提前返回 ⚠️ 会泄漏长度（影响极小）
```

**结论**：主要防护有效。

### 场景 5：路径遍历 / 键名注入

```
尝试：GET /kv-get?key=../../etc/passwd
→ 仅作为 KV 键名查询，无文件系统操作 ✅
尝试：key 含 \x00 或其他特殊字符
→ keycodec 编码为 xHH ✅（但 kv-get 直接使用原始 key，未经编码）
```

**注意**：`kv-get/kv-put` 使用**原始 key**（不做编码），而 Node 侧传入的是 `keycodec` 编码后的键名 —— **一致** ✅。但 `kv-*` 端点本身接受任意 key 字符串，若被授权者滥用可写入任意键（属预期能力）。

### 场景 6：存储降级攻击（数据丢失）

```
尝试：让 auto 探测失败，诱导回退 memory
→ serverless 环境抛错 ✅ 已防护
→ 若攻击者能删除绑定 → 部署报 503，而非静默丢数据 ✅
```

**结论**：防护正确。

### 场景 7：`env_check` 情报收集

```
尝试：GET /public/env_check
→ 返回 driver 类型、platform、configError、jwt.ready
→ 可判断「是否已配置 JWT_SECRET」「使用的存储类型」⚠️ 低危
```

**结论**：低危信息泄露，建议脱敏 `configError`。

---

## 七、性能评估

| 项 | 评估 |
|---|---|
| KV `list` 安全阀 | ✅ `guard < 1000` 防死循环 |
| 密钥读取不缓存 | ⚠️ 每个请求可能多一次 KV 读（Edge 侧）；**刻意权衡**（避免旧值），可接受 |
| `envFingerprint` WeakMap | ✅ O(1)，不阻止 GC |
| `upsertSql` 字符串拼接 | ✅ 每次调用开销极小 |
| `keycodec` 快路径 | ✅ 合法字符直接返回，避免逐字符遍历 |
| `format/sql.ts` 全量 DELETE+INSERT | ⚠️ 大表下 I/O 放大 |
| `db.ts` 全量 `saveDb` | ⚠️ 每次写操作序列化整个 DB |

---

## 八、代码规范

| 项 | 状态 |
|---|---|
| 中文注释完整、解释「为什么」 | ✅ 优秀 |
| 类型定义完整（`tsc` 0 错误）| ✅ |
| 错误处理有 `try/catch` 且不吞关键错误 | ✅ 基本到位 |
| 死代码清理（删 5 文件）| ✅ |
| 文档同步（README/readmes/docs）| ✅ |

**不足**：

- `_regress.mjs` 未加入 `package.json` 的 `scripts`（无法 `pnpm test:regress`）
- 部分 `catch {}` 静默吞错，建议至少 `console.warn`

---

## 九、Todo 清单

### 🛑 Critical（必须修复）

- [ ] 无

### ⚠️ Major（建议修复）

- [ ] **[Security]** `X-Internal-Call` 改用完整密钥比对，恢复 256 bit 熵（`_kv-proxy.js:194`、`json.ts:120`）
- [ ] **[Bug]** 验证并修正 `kv-list` 的 cursor 语义，防重复页（`kv-list/index.js:40`）
- [ ] **[Security]** `__requestOrigin` 增加可信来源校验，或强制生产环境配置 `EDGE_KV_BASE_URL`（`index.ts:36`）

### 💡 Minor（可选优化）

- [ ] **[Security]** `env_check` 的 `configError` 脱敏，不返回原始错误 message（`public.ts`）
- [ ] **[Security]** 文档标注 `?cron_secret=` 的日志泄漏风险，优先推荐 `X-Cron-Secret` 头
- [ ] **[Bug]** `driver/kv.ts` 双签名 `get()` 区分「签名不兼容」与「网络错误」，避免掩盖故障
- [ ] **[Perf]** `format/sql.ts` 的 `save` 考虑差异 UPSERT，减少 I/O 放大
- [ ] **[DX]** `_regress.mjs` 加入 `package.json` scripts
- [ ] **[Docs]** 警告 `map`/`key` 格式不适合高并发写入（丢失更新）
- [ ] **[Docs]** 警告 `sql` 格式不要与 Go 后端同时写入同一库

---

## 十、结论

**代码整体质量良好**，核心目标（EdgeOne 可用、serverless 禁内存、密钥统一、部署修复）均已正确实现，且注释详尽、类型完备。

**关键问题是 P1**：`X-Internal-Call` 仅用密钥前 16 位（64 bit 熵）作为内部调用凭据，且该校验通过后**完全绕过**管理员角色检查 —— 这是攻击面中最实质的缺口，**建议合并前修复**（改动仅 1 行）。

其余问题（P2-P4、场景 7）风险可控：P2 需真实环境验证、P3 依赖平台 Host 校验策略、P4 是既有设计局限。建议以文档警告 + 后续迭代方式处理。

**建议合并顺序**：
1. 立即修 **P1**（1 行改动）
2. 本 PR 内修 **P2**（若能在真实环境确认 cursor 语义）
3. **P3/P4** 及 Minor 项 → 后续 PR
