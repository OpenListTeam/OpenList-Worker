# 189Cloud Phase One Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce 189Cloud cold-start and first-browse latency while preserving the ordinary OpenList 189Cloud authentication and listing behavior.

**Architecture:** Keep the existing `Pan189Client` OAuth/API protocol, but make authentication lazy when a Cookie is already present, remove the duplicate root preflight, and serialize driver initialization with a cached Promise. Cookie updates stay in the driver’s in-memory state and are flushed once after the request through an injected persistence hook; the Hono request context decides whether the flush is awaited or scheduled with `waitUntil`.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers `ExecutionContext`, Node test runner via `tsx --test`, existing OpenListNext storage-driver interfaces.

**Spec:** `docs/superpowers/specs/2026-08-23-189cloud-phase1-design.md`

## Global Constraints

- Preserve the current `cloud.189.cn` ordinary 189 API and retry semantics.
- Do not add the 189PC driver, change pagination, change `StorageDriver.list()`, or add Durable Objects in this phase.
- Cookie persistence failures must not fail an already successful file request.
- A failed driver initialization must not leave a rejected Promise permanently cached.
- Authentication retry is limited to one login and one original-request retry.
- Non-189 drivers and existing storage configuration fields must remain compatible.

---

### Task 1: Replace the root-preflight contract with a login-only initialization test

**Files:**

- Modify: `src/backend/drivers/189/util.test.ts`
- Modify: `src/backend/drivers/189/driver.ts:114-117`

**Interfaces:**

- Consumes: existing `Cloud189Driver.init()` and `Pan189Client.login()`.
- Produces: `Cloud189Driver.init()` that only prepares authentication and does not call `validateRoot()`.

- [ ] **Step 1: Write the failing test**

Replace the current test that expects `driver.init()` to fail on an unreadable root with a test that stubs the login redirect as already logged in, returns an `AccessDenied` body for any later API call, calls `await driver.init()`, and asserts that initialization resolves and only the login URL was fetched.

```ts
test("driver initialization does not preflight the root directory", async () => {
  const calls: string[] = []
  globalThis.fetch = (async (input) => {
    const url = requestUrl(input)
    calls.push(url)
    if (url.includes("/api/portal/loginUrl.action")) {
      return mockResponse("https://cloud.189.cn/web/main", "", { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const driver = new Cloud189Driver({
    username: "",
    password: "",
    cookie: "valid=value",
  })

  await driver.init()
  assert.equal(calls.length, 1)
  assert.match(calls[0], /loginUrl\.action/)
})
```

The assertion isolates removal of the extra root request. The Cookie fast path is tested separately in Task 2.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm run test:189 -- --test-name-pattern="does not preflight"`

Expected: FAIL because the current `init()` calls `validateRoot()` after the login URL request, causing an unexpected second fetch.

- [ ] **Step 3: Implement the minimal production change**

Change `Cloud189Driver.init()` to call `this.client.login()` without `validateRoot()`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm run test:189 -- --test-name-pattern="does not preflight"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/drivers/189/driver.ts src/backend/drivers/189/util.test.ts
git commit -m "perf(189): remove browse-time root preflight"
```

### Task 2: Add Cookie fast-path login and one-shot Cookie flush state

**Files:**

- Modify: `src/backend/drivers/189/util.ts:120-260,398-486`
- Modify: `src/backend/drivers/189/driver.ts:90-117`
- Modify: `src/backend/drivers/189/util.test.ts`

**Interfaces:**

- Consumes: `Cloud189Addition.cookie`, existing `login()` OAuth flow, and `request()` invalid-session retry.
- Produces:
  - `login(options?: { force?: boolean }): Promise<void>` where `force=false` skips network when Cookie exists and `force=true` runs the existing login URL/OAuth decision tree.
  - `consumePendingCookie(): string | null` on `Pan189Client` (or an equivalent driver-level accessor) that returns a changed merged Cookie once and marks it clean.

- [ ] **Step 1: Write the failing tests**

Add these tests before changing production logic:

```ts
test("valid configured Cookie skips login URL during initialization", async () => {
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    throw new Error("login URL must not be requested")
  }) as typeof fetch

  const client = new Pan189Client({
    username: "13800138000",
    password: "password",
    cookie: "cookieUserSession=valid",
  })

  await client.login()
  assert.equal(calls, 0)
})

test("forced login keeps the existing OAuth flow for an invalid Cookie", async () => {
  const loginUrl = "https://cloud.189.cn/api/portal/loginUrl.action"
  globalThis.fetch = (async (input) => {
    const url = requestUrl(input)
    if (url.startsWith(loginUrl)) {
      return mockResponse("https://cloud.189.cn/web/main", "", { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch

  const client = new Pan189Client({
    username: "13800138000",
    password: "password",
    cookie: "expired=value",
  })

  await client.login({ force: true })
})

test("Cookie updates are exposed once for deferred persistence", async () => {
  globalThis.fetch = (async (input) =>
    mockResponse(
      requestUrl(input),
      { res_code: 0 },
      {
        status: 200,
        headers: { "set-cookie": "cookieUserSession=next; Path=/" },
      },
    )) as typeof fetch

  const client = new Pan189Client({
    username: "",
    password: "",
    cookie: "cookieUserSession=old",
  })

  await client.request("https://cloud.189.cn/api/test")
  assert.equal(client.consumePendingCookie(), "cookieUserSession=next")
  assert.equal(client.consumePendingCookie(), null)
})
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm run test:189 -- --test-name-pattern="configured Cookie|forced login|deferred persistence"`

Expected: FAIL because `login()` has no `force` option, still performs the login URL request for a Cookie, and currently invokes persistence immediately on every response.

- [ ] **Step 3: Implement the minimal authentication state change**

Implement the following behavior in `Pan189Client`:

```ts
async login(options: { force?: boolean } = {}): Promise<void> {
  if (this.cookie && !options.force) return
  // existing resolveLoginUrl + username/password OAuth logic
}
```

Update the invalid-session branch in `request()` to call `await this.login({ force: true })` before the single retry. Keep the existing `retryOnInvalidSession: false` guard.

- [ ] **Step 4: Implement one-shot Cookie tracking**

Change `updateCookie()` so it only merges Set-Cookie values and marks a dirty flag. Add `consumePendingCookie()` that returns the current Cookie once when it differs from the last consumed value. Do not call the storage persistence callback from `updateCookie()`.

- [ ] **Step 5: Run the focused tests and verify they pass**

Run: `npm run test:189 -- --test-name-pattern="configured Cookie|forced login|deferred persistence"`

Expected: PASS.

- [ ] **Step 6: Run the complete 189 test suite**

Run: `npm run test:189`

Expected: Existing redirect, invalid-session, response-validation, and upload tests pass after updating assertions that depended on immediate Cookie callbacks.

- [ ] **Step 7: Commit**

```bash
git add src/backend/drivers/189/driver.ts src/backend/drivers/189/util.ts src/backend/drivers/189/util.test.ts
git commit -m "perf(189): use Cookie fast path and deferred session state"
```

### Task 3: Make driver initialization concurrency-safe

**Files:**

- Modify: `src/backend/internal/op/storage.ts:34-350`
- Create: `src/backend/internal/op/storage.test.ts`

**Interfaces:**

- Consumes: existing `getDriver(driverName, storageConfig)` call sites.
- Produces: the same `getDriver()` return type, backed by a `Map<string, Promise<StorageDriver>>` that removes rejected initialization Promises.

- [ ] **Step 1: Write the failing helper test**

Extract a small internal helper with this signature and test it without loading the full database:

```ts
async function getOrCreateDriver(
  cache: Map<string, Promise<StorageDriver>>,
  key: string,
  factory: () => Promise<StorageDriver>,
): Promise<StorageDriver>
```

Test that two concurrent calls invoke `factory` once and return the same driver object:

```ts
test("concurrent driver initialization shares one Promise", async () => {
  let calls = 0
  let release!: () => void
  const gate = new Promise<void>((resolve) => (release = resolve))
  const driver = {} as StorageDriver
  const cache = new Map<string, Promise<StorageDriver>>()

  const factory = async () => {
    calls++
    await gate
    return driver
  }

  const first = getOrCreateDriver(cache, "189-1", factory)
  const second = getOrCreateDriver(cache, "189-1", factory)
  release()

  assert.equal(await first, driver)
  assert.equal(await second, driver)
  assert.equal(calls, 1)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/backend/internal/op/storage.test.ts` (or the repository’s `tsx --test` equivalent after the test file is created).

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the helper and integrate it**

Store the Promise before awaiting the factory. On rejection, delete the entry only if the cached value is the same Promise:

```ts
const pending = factory()
cache.set(key, pending)
try {
  return await pending
} catch (error) {
  if (cache.get(key) === pending) cache.delete(key)
  throw error
}
```

Convert the existing driver construction branch to run inside this helper while preserving all non-189 callbacks and cache keys.

- [ ] **Step 4: Run the focused and 189 suites**

Run: `npx tsx --test src/backend/internal/op/storage.test.ts` and `npm run test:189`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/internal/op/storage.ts src/backend/internal/op/storage.test.ts
git commit -m "perf(storage): deduplicate concurrent driver initialization"
```

### Task 4: Flush 189 Cookie state after a request without blocking it

**Files:**

- Modify: `src/backend/internal/op/storage.ts`
- Modify: `src/backend/server/fs.ts`
- Modify: `src/backend/server/raw.ts` if raw routes can create/refresh a 189 driver state
- Modify: `src/backend/drivers/189/driver.ts`
- Modify: `src/backend/drivers/189/util.test.ts`

**Interfaces:**

- Consumes: `Pan189Client.consumePendingCookie()` and Hono request `c.executionCtx` when available.
- Produces: request-scoped Cookie persistence that is scheduled with `waitUntil` on Workers and awaited in Node/tests.

- [ ] **Step 1: Write the failing persistence scheduling test**

Add a small storage-level test around a persistence scheduler:

```ts
test("Worker persistence is scheduled instead of awaited", async () => {
  let resolvePersistence!: () => void
  const persistence = new Promise<void>(
    (resolve) => (resolvePersistence = resolve),
  )
  let scheduled: Promise<void> | undefined
  const waitUntil = (task: Promise<void>) => {
    scheduled = task
  }

  scheduleStoragePersistence(waitUntil, persistence)
  assert.ok(scheduled)
  resolvePersistence()
  await scheduled
})
```

Add a Node fallback test where no `waitUntil` exists and the caller awaits the persistence Promise.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx tsx --test src/backend/internal/op/storage.test.ts`

Expected: FAIL because the scheduler is not implemented.

- [ ] **Step 3: Implement request-scoped scheduling**

Add an optional request context type:

```ts
export interface StorageRequestContext {
  waitUntil?: (promise: Promise<unknown>) => void
}
```

Thread it through `listItems()` and `getItem()` from `fs.ts`. After each 189 driver operation, consume one pending Cookie and schedule the persistence task. If `waitUntil` exists, call it; otherwise await the task before returning. The persistence task must update only the matching storage’s `addition.cookie` and retain the existing error warning behavior.

Do not retain a request-specific `waitUntil` closure inside a cached driver; pass the context only for the operation that is currently finishing.

- [ ] **Step 4: Verify behavior**

Run: `npx tsx --test src/backend/internal/op/storage.test.ts`, `npm run test:189`, and `npm run lint`.

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/backend/internal/op/storage.ts src/backend/server/fs.ts src/backend/server/raw.ts src/backend/drivers/189/driver.ts src/backend/drivers/189/util.test.ts
git commit -m "perf(189): schedule Cookie persistence outside request path"
```

### Task 5: Return storage roots without initializing remote drivers

**Files:**

- Modify: `src/backend/internal/op/storage.ts:440-463`
- Create or modify: `src/backend/internal/op/storage.test.ts`

**Interfaces:**

- Consumes: `resolvePath()` results with `relative === "/"` and the existing `FileItem` shape.
- Produces: `getItem()` root response that does not call `getDriver()` for a storage mount root.

- [ ] **Step 1: Write the failing test**

Add a test using a minimal in-memory storage configuration that calls `getItem("/189")` for a root-mounted 189 storage, stubs the driver factory to throw if invoked, and asserts that the returned item is a directory with provider `189Cloud`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx tsx --test src/backend/internal/op/storage.test.ts --test-name-pattern="root"`

Expected: FAIL because `getItem()` currently always calls `getDriver()` for non-virtual paths.

- [ ] **Step 3: Implement the root fast path**

Before `getDriver()` in `getItem()`, detect `resolved.storage && resolved.relative === "/"` and return a generic directory item. Use the final path segment of `resolved.cleanPath` as the display name, fall back to `"root"`, set `sign` to the configured root folder ID when available, and preserve the resolved storage driver as `provider`.

- [ ] **Step 4: Run focused, 189, and type-check tests**

Run: `npx tsx --test src/backend/internal/op/storage.test.ts`, `npm run test:189`, and `npm run lint`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/internal/op/storage.ts src/backend/internal/op/storage.test.ts
git commit -m "perf(fs): short-circuit mounted storage roots"
```

### Task 6: End-to-end verification and regression review

**Files:**

- Verify: all files changed by Tasks 1–5.
- Update: `docs/superpowers/specs/2026-08-23-189cloud-phase1-design.md` only if implementation decisions require a precise clarification.

- [ ] **Step 1: Run the complete automated checks**

Run from `openlistnext`:

```bash
npm run test:189
npx tsx --test src/backend/internal/op/storage.test.ts
npm run lint
```

Expected: all tests pass and TypeScript emits no errors.

- [ ] **Step 2: Review the diff for scope**

Run: `git diff 69faaa7..HEAD --stat` and `git diff 69faaa7..HEAD`.

Confirm that no 189PC code, pagination changes, Durable Object binding, or unrelated driver behavior was added.

- [ ] **Step 3: Verify request behavior manually or with Worker mocks**

Confirm these cases:

1. Valid Cookie + root browse: no `loginUrl.action`, no `validateRoot`, one list request.
2. Invalid Cookie + credentials: one forced login and one list retry.
3. Invalid Cookie without credentials: clear authentication error, no retry loop.
4. Two concurrent first requests: one initialization Promise and one login flow.
5. Cookie persistence is scheduled/awaited according to the runtime context and does not fail a successful list.

- [ ] **Step 4: Commit any final test-only or documentation correction**

```bash
git add docs/superpowers/specs/2026-08-23-189cloud-phase1-design.md src/backend
git commit -m "test(189): verify phase one worker behavior"
```
