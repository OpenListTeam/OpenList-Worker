# 189PC Driver - TODO

## Status: ⚠️ Incomplete Implementation

This driver is a **partial port** from the Go version and is **not yet functional** in TSWorker.

## Issues

The current implementation uses the **Go-style StorageDriver interface**, which differs significantly from TSWorker's interface:

### Go Interface (Original)
```typescript
interface StorageDriver {
  list(dir: string): Promise<FileItem[]>
  get(path: string): Promise<FileItem | null>
  put(dstDirPath: string, content: ReadableStream, fileName: string): Promise<void>
  makeDir(parentDir: string, dirName: string): Promise<void>
  // ...
}
```

### TSWorker Interface (Required)
```typescript
interface StorageDriver {
  list(virtualPath: string, physicalPath: string): Promise<FileItem[]>
  get(virtualPath: string, physicalPath: string): Promise<FileItem>  // Cannot return null
  put(virtualPath: string, physicalPath: string, content: Buffer): Promise<void>
  mkdir(virtualPath: string, physicalPath: string): Promise<void>
  // ...
}
```

## What Needs to be Done

1. **Refactor all methods** to accept `(virtualPath, physicalPath)` parameters
2. **Implement path resolution logic** (physicalPath → cloud file ID)
3. **Change `get()` return type** from `FileItem | null` to `FileItem` (throw error if not found)
4. **Change `put()` signature** from `ReadableStream` to `Buffer`
5. **Rename `makeDir()` to `mkdir()`**
6. **Update `move()`, `copy()`, `remove()` to match TSWorker's multi-file interface**

## Reference Implementation

See `src/backend/drivers/mopan/driver.ts` for a complete example of TSWorker's interface.

## Original Go Implementation

Source: https://github.com/OpenListTeam/OpenList/tree/main/drivers/189pc

---

**Estimated Work:** 4-6 hours for complete adaptation
