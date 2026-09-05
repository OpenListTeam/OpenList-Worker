# 半成品驱动说明

本目录包含 3 个**未完成的半成品驱动实现**，均存在类型错误且未注册到系统中。

## 📋 驱动列表

### 1. 189PC 驱动 - 重复实现
- **目录**: `src/backend/drivers/189pc/`
- **状态**: ❌ 重复，已有完整实现
- **说明**: 前端的 `189CloudPC` 实际映射到 `Cloud189Driver`（别名 `189cloudpc`）
- **建议**: **删除整个目录**（除 README.md）

### 2. AutoIndex 驱动 - 半成品
- **目录**: `src/backend/drivers/autoindex/`
- **状态**: ⚠️ 半成品，有类型错误
- **功能**: Nginx AutoIndex 页面解析（只读）
- **工作量**: 2-3 小时
- **优先级**: 低（只读驱动，用途有限）
- **建议**: **暂时删除代码文件**，保留 README 作为未来参考

### 3. ProtonDrive 驱动 - 半成品
- **目录**: `src/backend/drivers/proton_drive/`
- **状态**: ⚠️ 半成品，缺少端到端加密
- **功能**: Proton Drive 云盘（需 OpenPGP 加密）
- **工作量**: 8-12 小时
- **优先级**: 低（国内用户少，实现复杂）
- **建议**: **暂时删除代码文件**，保留 README 作为未来参考

## ❌ 共同问题

所有三个驱动都存在以下问题：

### 1. 接口不匹配
使用 Go 风格接口，与 TSWorker 的 `StorageDriver` 接口不兼容：

```typescript
// 当前（错误）
async list(dir: string): Promise<FileItem[]>
async get(path: string): Promise<FileItem | null>

// TSWorker 要求
async list(virtualPath: string, physicalPath: string): Promise<FileItem[]>
async get(virtualPath: string, physicalPath: string): Promise<FileItem>
```

### 2. 未注册到系统
- ❌ 未在 `src/backend/internal/op/storage.ts` 中注册
- ❌ 前端虽有配置，但后端无法使用

### 3. 类型错误
- 方法签名不匹配
- 返回类型错误（不能返回 null）
- physicalPath 解析逻辑缺失

## 🗑️ 清理建议

### 立即删除（重复实现）
```bash
# 189PC 驱动 - 与 Cloud189Driver 重复
rm -rf src/backend/drivers/189pc/driver.ts
rm -rf src/backend/drivers/189pc/types.ts
rm -rf src/backend/drivers/189pc/util.ts
rm -rf src/backend/drivers/189pc/crypto.ts
rm -rf src/backend/drivers/189pc/consts.ts
# 保留 README.md
```

### 暂时删除（半成品，待完善）
```bash
# AutoIndex 驱动
rm -rf src/backend/drivers/autoindex/driver.ts
rm -rf src/backend/drivers/autoindex/types.ts
rm -rf src/backend/drivers/autoindex/util.ts
# 保留 README.md

# ProtonDrive 驱动
rm -rf src/backend/drivers/proton_drive/driver.ts
rm -rf src/backend/drivers/proton_drive/types.ts
rm -rf src/backend/drivers/proton_drive/util.ts
rm -rf src/backend/drivers/proton_drive/consts.ts
# 保留 README.md
```

### 保留文件
每个目录保留 `README.md` 作为：
- 问题说明文档
- 未来实现的参考
- 前后端配置对应关系说明

## 📊 影响评估

### 对用户的影响
- **189CloudPC**: ✅ 无影响（使用 Cloud189Driver）
- **AutoIndex**: ⚠️ 从未可用（未注册）
- **ProtonDrive**: ⚠️ 从未可用（未注册）

### 对代码库的影响
- ✅ 减少类型错误
- ✅ 减少维护负担
- ✅ 避免误导开发者

## 💡 未来实现指南

当需要重新实现这些驱动时：

### 1. 从 Go 版本重新移植
- **位置**: `OpenList/drivers/`
- **参考**: Go 版本的完整实现

### 2. 严格遵循 TSWorker 接口
- 双路径参数（virtualPath + physicalPath）
- 实现 physicalPath 解析逻辑
- 不能返回 null（抛出错误）

### 3. 注册到系统
- 在 `storage.ts` 中添加驱动注册逻辑
- 添加别名支持（可选）

### 4. 完整测试
- 列表、获取、上传、下载
- 移动、复制、删除
- 边界情况处理

## 📚 相关文档

- **驱动接口**: `src/backend/internal/driver/base.ts`
- **驱动注册**: `src/backend/internal/op/storage.ts`
- **完整示例**: `src/backend/drivers/mopan/driver.ts`
- **前端配置**: `OpenList-Frontend/src/lang/en/drivers.json`

## 📈 统计信息

| 驱动 | 代码行数 | 类型错误 | 优先级 | 建议 |
|------|---------|---------|--------|------|
| 189PC | ~450 行 | 多个 | N/A | 删除（重复） |
| AutoIndex | ~200 行 | 多个 | 低 | 暂时删除 |
| ProtonDrive | ~400 行 | 多个 | 低 | 暂时删除 |
| **合计** | **~1050 行** | **多个** | - | **清理** |

---

**创建时间**: 2026-09-05  
**用途**: 半成品驱动清理说明  
**建议**: 删除所有半成品代码文件，保留 README 作为参考
