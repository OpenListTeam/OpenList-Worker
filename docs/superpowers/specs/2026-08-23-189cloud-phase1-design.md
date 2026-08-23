# 189Cloud 第一阶段性能优化设计

## 目标

在不引入 189PC 新驱动、不改变现有文件列表 API 契约、不重写天翼鉴权协议的前提下，降低 189Cloud 首次挂载和冷启动请求的等待时间，并保持原 OpenList 普通 `189Cloud` 驱动的行为模型。

## 原则

1. 保留当前 `cloud.189.cn` 普通 189 API 与原 OpenList 的 `newLogin -> request 失败时重新登录` 语义。
2. 不在每次浏览路径时增加额外的根目录探测请求。
3. Cookie 在当前 Worker 实例内立即生效；持久化不阻塞当前文件请求。
4. 同一 Worker 实例中，同一存储的并发初始化只能执行一次。
5. 认证失败最多触发一次重新登录和一次原请求重试，避免递归放大。

## 范围

### 1. 移除浏览路径上的根目录预检

`Cloud189Driver.init()` 只负责客户端登录/会话准备，不再调用 `validateRoot()`。根目录可读性由实际 `list/get` 请求验证；如果需要主动检测，后续单独增加管理端存储测试接口。

### 2. 增加驱动初始化 Promise 锁

将 `driverCache` 从“只缓存已完成的 driver”扩展为“缓存初始化 Promise”。

- 首个请求创建并缓存初始化 Promise。
- 并发请求复用同一个 Promise。
- 初始化失败后删除缓存，下一次请求可以重试。
- 成功后继续复用已初始化 driver。

该锁只解决同一 Worker 实例内的并发问题，不把模块内存当作跨实例的持久状态。

### 3. Cookie 快速路径与异步持久化

现有 Cookie 仍然保留在 `Pan189Client` 内存中，但调整登录流程：

- 配置中有 Cookie 时，不主动执行完整 `loginUrl` 预检；先让实际 189 API 验证 Cookie。
- API 返回 `InvalidSessionKey` 时，执行一次完整登录流程，然后重试原请求一次。
- 没有 Cookie 且配置了账号密码时，仍然按现有 OAuth 登录流程登录。
- `Set-Cookie` 到达后先只合并到内存。
- 登录/刷新流程完成后最多触发一次 Cookie 持久化。
- 持久化通过请求上下文提供的异步后台任务执行，不阻塞 `fs/get` 或 `fs/list` 的响应。

为了保持驱动层可测试，`Pan189Client` 不直接依赖 Hono；由存储层注入一个可选的异步持久化回调。Workers 请求有 `waitUntil` 时使用后台任务；没有 `waitUntil` 的 Node/测试环境则等待回调完成，保证持久化语义不丢失。

### 4. 根目录 `fs/get` 快速返回

对于已经由 `resolvePath()` 判定为存储根目录的 `fs/get`，在不需要文件元信息的情况下直接返回目录对象，避免为了确认根目录而先初始化远程驱动。实际目录内容仍由后续 `fs/list` 请求加载。

该项只处理根目录，不改变文件和非根目录路径的解析行为。

## 不在本阶段处理

- 不移植原版 `189CloudPC` 的 access token / refresh token / SessionKey 协议。
- 不修改普通 189 的 60 条分页协议。
- 不修改全局 `StorageDriver.list()` 接口或前端分页协议。
- 不引入 Durable Object。
- 不改变现有存储配置字段格式；Cookie 仍可从现有 `addition.cookie` 读取。

## 预期请求链路

### 有效 Cookie、冷启动

```text
fs/get 根目录  -> 本地返回根目录对象
fs/list        -> 直接请求 listFiles
```

### Cookie 失效

```text
fs/list -> listFiles 返回 InvalidSessionKey
       -> 执行一次 login()
       -> 重试原 listFiles 请求一次
```

### 账号密码登录

```text
fs/list -> loginUrl / OAuth 登录链路
       -> listFiles
```

## 需要修改的主要文件

- `src/backend/drivers/189/driver.ts`
  - 移除 `validateRoot()` 初始化调用。
- `src/backend/drivers/189/util.ts`
  - 增加 Cookie 快速路径状态。
  - 将 Cookie 持久化从每个响应改为一次性异步通知。
  - 保留单次 `InvalidSessionKey` 重试。
- `src/backend/internal/op/storage.ts`
  - 使用 Promise 形式的 driver cache。
  - 将请求上下文的异步持久化能力传递给 189 Cookie 回调。
  - 根目录 `getItem()` 快速路径。
- `src/backend/server/fs.ts` 或请求上下文适配层
  - 仅在当前 Hono/Workers 请求上下文可用时注册 `waitUntil`。
- `src/backend/drivers/189/util.test.ts`
  - 增加有效 Cookie 不触发 `loginUrl` 的测试。
  - 增加初始化并发只执行一次的测试。
  - 增加 Cookie 持久化不阻塞请求的测试。
  - 保留现有登录、重定向、失效 Session 和响应校验测试。

## 错误处理

- 登录失败继续返回明确的账号、验证码、设备保护错误。
- Cookie 持久化失败只记录警告，不影响当前请求已经获得的内存 Cookie。
- 初始化 Promise 失败时清理缓存，避免永久缓存 rejected Promise。
- 认证重试超过一次后直接返回原始 189 错误，不继续递归。

## 验证标准

1. 现有 `npm run test:189` 全部通过。
2. 有效 Cookie 的冷启动路径不再请求 `loginUrl.action`，且不再请求 `validateRoot`。
3. 同一 Worker 实例内并发调用同一存储时，登录流程只执行一次。
4. Cookie 持久化回调被延迟到响应关键路径之外，测试请求不会等待持久化 Promise。
5. 失效 Cookie 仍能完成一次登录并成功重试；连续失效时返回错误而不是无限递归。
6. 非 189 驱动行为和现有存储配置格式不变。
