# OpenList TSWorker 驱动移植状态报告

## 📊 总体进度

| 项目 | 数量 | 百分比 |
|------|------|--------|
| Go 版本驱动总数 | 85 | 100% |
| TSWorker 已实现 | 70 | 82.4% |
| 待实现 | 15 | 17.6% |

## ✅ 最近完成的驱动

### MoPan（中国移动和彩云）- 2024/09
- **状态**: ✅ 已完成并提交
- **代码行数**: ~940 行
- **功能**: 完整实现（列表、上传、下载、移动、复制、删除）
- **特性**: 
  - 密码登录 + 短信验证码登录
  - AES-128-CBC + RSA 混合加密
  - 分片上传和秒传支持
  - Token 自动刷新和持久化

## ⚠️ 待清理的半成品驱动

### 1. 189PC（天翼云 PC 协议）- **建议删除**
- **状态**: ❌ 重复实现（Cloud189Driver 已支持）
- **代码行数**: ~450 行（未使用）
- **问题**: 
  - 与 Cloud189Driver 功能重复
  - Cloud189Driver 已通过别名 `189cloudpc` 支持前端配置
  - 有类型错误且未注册
- **建议**: **删除代码文件**，保留 README 说明
- **详细说明**: `src/backend/drivers/189pc/README.md`

### 2. ProtonDrive（Proton Drive 国际服务）- **建议清理**
- **状态**: ⚠️ 半成品实现
- **代码行数**: ~400 行（未完成）
- **问题**: 
  - 接口不匹配
  - 缺少 PGP 端到端加密
  - 有类型错误且未注册
- **预计完成工作量**: 8-12 小时
- **优先级**: 低（国际服务，用户少）
- **建议**: **删除代码文件**，保留 README 作为未来参考
- **详细说明**: `src/backend/drivers/proton_drive/README.md`

### 3. AutoIndex（Nginx AutoIndex 适配器）- **建议清理**
- **状态**: ⚠️ 半成品实现
- **代码行数**: ~200 行（未完成）
- **问题**: 
  - 接口不匹配
  - 有类型错误且未注册
- **预计完成工作量**: 2-3 小时
- **优先级**: 低（只读驱动，用途有限）
- **建议**: **删除代码文件**，保留 README 作为未来参考
- **详细说明**: `src/backend/drivers/autoindex/README.md`

## 🔧 TSWorker 驱动接口说明

### Go 版本接口（原始）
```typescript
interface StorageDriver {
  // 简单的单参数方法
  list(dir: string): Promise<FileItem[]>
  get(path: string): Promise<FileItem | null>
  put(dstDirPath: string, content: ReadableStream, fileName: string): Promise<void>
  makeDir(parentDir: string, dirName: string): Promise<void>
  move(srcPath: string, dstDirPath: string): Promise<void>
  rename(srcPath: string, newName: string): Promise<void>
  copy(srcPath: string, dstDirPath: string): Promise<void>
  remove(path: string): Promise<void>
  link(file: FileItem): Promise<{ url: string; headers?: Record<string, string> }>
}
```

### TSWorker 接口（需要适配）
```typescript
interface StorageDriver {
  // 双路径参数 (virtualPath, physicalPath)
  list(virtualPath: string, physicalPath: string): Promise<FileItem[]>
  get(virtualPath: string, physicalPath: string): Promise<FileItem>  // 不能返回 null
  put(virtualPath: string, physicalPath: string, content: Buffer): Promise<void>
  mkdir(virtualPath: string, physicalPath: string): Promise<void>
  
  // 批量操作
  move(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void>
  rename(virtualPath: string, physicalPath: string, newName: string): Promise<void>
  copy(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string): Promise<void>
  remove(virtualPath: string, physicalPath: string, names: string[]): Promise<void>
}
```

### 关键差异

1. **双路径系统**: 
   - `virtualPath`: 用户看到的路径（如 `/我的文件/照片`）
   - `physicalPath`: 云端实际路径或文件 ID（如 `123456789`）

2. **physicalPath 解析**: 需要实现路径到文件 ID 的映射逻辑

3. **批量操作**: `move/copy/remove` 支持一次操作多个文件

4. **Buffer vs Stream**: `put()` 使用 `Buffer` 而非 `ReadableStream`

5. **严格类型**: `get()` 不能返回 `null`，找不到文件时抛出异常

## 📝 适配步骤（通用）

1. **重构方法签名**
   ```typescript
   // 原: async list(dir: string)
   // 改: async list(_virtualPath: string, physicalPath: string)
   ```

2. **实现 physicalPath 解析**
   ```typescript
   private async resolveFolderId(physicalPath: string): Promise<string> {
     if (!physicalPath) return this.rootFolderId
     // 实现路径分段解析逻辑...
   }
   ```

3. **修改 get() 返回类型**
   ```typescript
   // 原: return null
   // 改: throw new Error("File not found")
   ```

4. **适配批量操作**
   ```typescript
   async move(srcDir: string, dstDir: string, names: string[], srcPhys: string, dstPhys: string) {
     for (const name of names) {
       // 移动单个文件...
     }
   }
   ```

## 🎯 建议优先级

### 高优先级
- ✅ MoPan（已完成）

### 中优先级
- ⚠️ 189PC（国内用户多，PC 协议更稳定）

### 低优先级
- ⚠️ AutoIndex（只读驱动，用途有限）
- ⚠️ ProtonDrive（国际服务，国内用户少）

## 📚 参考实现

完整参考 MoPan 驱动的实现：
- 路径: `src/backend/drivers/mopan/driver.ts`
- 行数: ~940 行
- 关键方法:
  - `resolveFolderId()` - physicalPath 解析
  - `list()` - 双路径参数
  - `get()` - 严格返回 FileItem
  - `put()` - Buffer 参数

## 📊 驱动覆盖率详情

### 已实现（70 个）
115, 115_open, 115_share, 123_open, 123_share, 123pan, 139 (Yun139), 189 (Cloud189), 189_tv, alias, alist_v3, aliyundrive_open, aliyundrive_share, azure_blob, baidu_netdisk, baidu_photo, chaoxing, chunk, cloudreve_v3, cloudreve_v4, cnb_releases, crypt, degoo, doubao, dropbox, febbox, ftp, github, github_releases, google_drive, google_photo, halalcloud_open, ipfs_api, kodbox, lanzou, lenovonas_share, mediafire, mediatrack, mega, misskey, **mopan**, netease_music, onedrive, onedrive_app, onedrive_sharelink, openlist, openlist_share, pikpak, pikpak_share, quark, quark_open, quark_uc_tv, s3, seafile, sftp, smb, strm, teambition, teldrive, terabox, thunder, url_tree, uss, virtual, webdav, weiyun, wopan, wps, yandex

### 待适配（3 个）
- ⚠️ **189pc** - 天翼云 PC 协议
- ⚠️ **proton_drive** - Proton Drive
- ⚠️ **autoindex** - Nginx AutoIndex

### 未实现（12 个）
待从 Go 版本移植的驱动...

---

**文档更新时间**: 2026-09-05  
**最后完成驱动**: MoPan (2024-09)  
**下一个目标**: 189PC（预计 4-6 小时工作量）
