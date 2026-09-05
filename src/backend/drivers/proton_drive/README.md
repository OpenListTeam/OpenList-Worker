# ProtonDrive 驱动 - 待完成

## ⚠️ 状态：半成品实现，建议清理

本目录中的 ProtonDrive 驱动是一个**未完成的半成品实现**（~400 行），存在多个类型错误且未注册到 storage.ts。

---

## ❌ 当前问题

### 1. 接口不匹配
使用 Go 风格接口，与 TSWorker 的 `StorageDriver` 接口不兼容：

```typescript
// 当前（错误）
async list(shareId: string): Promise<FileItem[]>
async get(linkId: string): Promise<FileItem | null>

// TSWorker 要求
async list(virtualPath: string, physicalPath: string): Promise<FileItem[]>
async get(virtualPath: string, physicalPath: string): Promise<FileItem>
```

### 2. 类型错误
- `FileItem` 中不存在 `hash` 字段
- `sortFileItems()` 参数类型错误

### 3. 功能缺失
- ❌ 缺少端到端加密（PGP/OpenPGP）
- ❌ SRP 认证为简化版本
- ❌ 未实现完整的文件上传流程
- ❌ 未注册到 `storage.ts`

### 4. physicalPath 解析
- ❌ 未实现路径到 Link ID 的映射逻辑
- ❌ 缺少 Share → Volume → Link 的层级关系处理

---

## 📋 前端配置状态

### 前端已有配置
- **位置**: `OpenList-Frontend/src/lang/en/drivers.json` 第 1046 行
- **驱动名**: `ProtonDrive`
- **配置字段**:
  - `email` - 邮箱
  - `password` - 密码
  - `two_fa_code` - 2FA 验证码
  - `root_folder_id` - 根文件夹 ID
  - `chunk_size` - 分片大小
  - `use_reusable_login` - 使用可重用登录

### 后端状态
- **实现**: ⚠️ 半成品（未完成）
- **注册**: ❌ 未注册到 storage.ts
- **可用性**: ❌ 不可用

---

## 🔧 完成所需工作量

### 预计工作量：8-12 小时

1. **接口适配**（2-3 小时）
   - 重构所有方法签名为双路径参数
   - 实现 physicalPath 解析逻辑
   - 修改返回类型（不能返回 null）

2. **端到端加密**（4-6 小时）
   - 集成 OpenPGP.js 库
   - 实现文件加密/解密
   - 实现密钥管理

3. **SRP 认证完善**（1-2 小时）
   - 使用完整的 SRP 库
   - 实现正确的 proof 计算

4. **上传功能**（1-2 小时）
   - 实现加密分片上传
   - 处理上传会话管理

---

## 📚 参考资料

### ProtonDrive API
- **官方文档**: https://proton.me/support/proton-drive-api
- **认证**: SRP (Secure Remote Password)
- **加密**: End-to-end encryption with OpenPGP

### 依赖库
```json
{
  "openpgp": "^5.x",     // OpenPGP 加密
  "secure-remote-password": "^0.6.x"  // SRP 认证
}
```

### TSWorker 接口参考
- 完整实现: `src/backend/drivers/mopan/driver.ts`
- 接口定义: `src/backend/internal/driver/base.ts`

---

## 🎯 优先级

**低** - ProtonDrive 是国际服务，国内用户较少，且实现复杂度较高。

建议等待以下条件之一再继续开发：
1. 有明确的用户需求
2. 有时间进行完整的端到端加密实现
3. ProtonDrive 提供更简单的 API

---

## 🗑️ 建议清理

本目录中的以下文件为半成品实现，**建议暂时删除**：
- `driver.ts` (~400 行，有类型错误)
- `types.ts`
- `util.ts`
- `consts.ts`

**保留文件**:
- `README.md` (本文件，作为未来实现的参考)

---

## 💡 未来实现建议

当需要实现 ProtonDrive 驱动时：

1. **从 Go 版本重新移植**
   - 位置: `OpenList/drivers/proton_drive/`
   - 参考完整的加密和认证逻辑

2. **安装必要依赖**
   ```bash
   npm install openpgp secure-remote-password
   ```

3. **严格遵循 TSWorker 接口**
   - 双路径参数
   - physicalPath 解析
   - 批量操作支持

4. **完整测试加密流程**
   - 上传加密
   - 下载解密
   - 密钥管理

---

**创建时间**: 2026-09-05  
**状态**: 半成品，待清理  
**建议**: 删除所有 .ts 代码文件，保留 README 作为未来参考
