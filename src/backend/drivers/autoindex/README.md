# AutoIndex Driver - TODO

## Status: ⚠️ Incomplete Implementation

This driver is a **partial port** from the Go version and is **not yet functional** in TSWorker.

## Issues

1. **Interface mismatch** with TSWorker's StorageDriver (see 189PC README)
2. **Read-only driver** - only implements `list()` and `link()`
3. **XPath parsing** - uses `xpath` and `@xmldom/xmldom` packages

## What Needs to be Done

1. **Adapt to TSWorker interface**:
   - `list(virtualPath, physicalPath)` instead of `list(dir)`
   - `get(virtualPath, physicalPath)` returning `FileItem`
2. **Implement error handling** for unsupported operations
3. **Test XPath parsing** with different Nginx AutoIndex formats

## Reference Implementation

- TSWorker interface: `src/backend/drivers/mopan/driver.ts`
- Go implementation: https://github.com/OpenListTeam/OpenList/tree/main/drivers/autoindex

## Complexity

⚠️ **Low complexity** - mostly read-only, simpler than cloud storage drivers

---

**Estimated Work:** 2-3 hours for complete adaptation
