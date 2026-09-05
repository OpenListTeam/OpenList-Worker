# ProtonDrive Driver - TODO

## Status: ⚠️ Incomplete Implementation

This driver is a **partial port** from the Go version and is **not yet functional** in TSWorker.

## Issues

Same as 189PC driver - the interface doesn't match TSWorker's StorageDriver requirements.

Additionally, ProtonDrive has complex encryption requirements:
- End-to-end encryption with PGP
- Share keys and link keys management
- SRP (Secure Remote Password) authentication
- Content encryption before upload

## What Needs to be Done

1. **Adapt to TSWorker's StorageDriver interface** (see 189PC README)
2. **Implement proper encryption**:
   - Use `openpgp.js` or similar library
   - Key derivation and management
   - Encrypted file names and content
3. **Complete SRP authentication**:
   - Current implementation is simplified
   - Need proper SRP library (e.g., `secure-remote-password`)
4. **Handle 2FA properly**

## Reference Implementation

- TSWorker interface: `src/backend/drivers/mopan/driver.ts`
- Go implementation: https://github.com/OpenListTeam/OpenList/tree/main/drivers/proton_drive

## Complexity

⚠️ **High complexity** - requires cryptography expertise

---

**Estimated Work:** 8-12 hours for complete adaptation
