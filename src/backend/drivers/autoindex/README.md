# AutoIndex (Nginx AutoIndex) 驱动 - 待完成

## ⚠️ 状态：半成品实现，建议清理

本目录中的 AutoIndex 驱动是一个**未完成的半成品实现**（~200 行），存在多个类型错误且未注册到 storage.ts。

---

## ❌ 当前问题

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

### 2. 类型错误
- `DOMParser` 的 `errorHandler.warning` 属性不存在
- `xpath.select()` 参数类型不匹配
- `sortFileItems()` 参数类型错误

### 3. 功能限制
- ✅ 只读驱动（仅支持列表和下载）
- ❌ 不支持上传、删除、移动等写操作
- ❌ 未注册到 `storage.ts`

### 4. physicalPath 解析
- ❌ 未实现路径映射逻辑
- ❌ 依赖 HTML 解析，性能较低

---

## 📋 前端配置状态

### 前端已有配置
- **位置**: `OpenList-Frontend/src/lang/en/drivers.json` 第 358 行
- **驱动名**: `AutoIndex`
- **配置字段**:
  - `url` - Nginx AutoIndex 页面 URL
  - `item_xpath` - 条目 XPath（默认: `//a`）
  - `name_xpath` - 文件名 XPath（默认: `./text()`）
  - `size_xpath` - 文件大小 XPath
  - `modified_xpath` - 修改时间 XPath
  - `modified_time_format` - 时间格式
  - `ignore_file_names` - 忽略的文件名

### 后端状态
- **实现**: ⚠️ 半成品（未完成）
- **注册**: ❌ 未注册到 storage.ts
- **可用性**: ❌ 不可用

---

## 🔧 完成所需工作量

### 预计工作量：2-3 小时

1. **接口适配**（1 小时）
   - 重构方法签名为双路径参数
   - 实现简单的 physicalPath 解析（URL 拼接）
   - 修改返回类型（不能返回 null）

2. **类型修复**（0.5 小时）
   - 修复 `DOMParser` 错误处理
   - 修复 `xpath` 类型声明
   - 修复 `sortFileItems` 调用

3. **注册驱动**（0.5 小时）
   - 在 `storage.ts` 中注册
   - 添加别名支持（`autoindex`, `nginx`, `nginxautoindex`）

---

## 📚 工作原理

### Nginx AutoIndex 页面示例
```html
<html>
<head><title>Index of /files/</title></head>
<body>
<h1>Index of /files/</h1>
<pre>
<a href="../">../</a>
<a href="document.pdf">document.pdf</a>     2024-01-15 10:30  1.2M
<a href="image.jpg">image.jpg</a>          2024-01-16 14:20  500K
<a href="folder/">folder/</a>              2024-01-10 09:00    -
</pre>
</body>
</html>
```

### XPath 解析
- **条目**: `//pre/a` - 所有链接
- **文件名**: `./text()` - 链接文本
- **大小**: 后续文本节点解析
- **时间**: 后续文本节点解析

---

## 🎯 优先级

**低** - AutoIndex 是只读驱动，使用场景有限。

适用场景：
- 静态文件服务器索引
- 公开下载站点
- 只需浏览和下载的场景

不适用场景：
- 需要上传文件
- 需要文件管理（移动、重命名、删除）
- 需要权限控制

---

## 💡 实现建议

### 简化方案：只读驱动
由于 AutoIndex 本质上是静态页面，可以简化实现：

```typescript
export class AutoIndexDriver implements StorageDriver {
  async list(virtualPath: string, physicalPath: string): Promise<FileItem[]> {
    const url = this.buildUrl(physicalPath)
    const html = await fetch(url).then(r => r.text())
    return this.parseHtml(html)
  }
  
  async get(virtualPath: string, physicalPath: string): Promise<FileItem> {
    // 返回直接下载链接
    return {
      name: basename(physicalPath),
      raw_url: this.buildUrl(physicalPath),
      // ...
    }
  }
  
  // 其他方法抛出 "不支持的操作" 错误
  async put(): Promise<void> {
    throw new Error("AutoIndex 是只读驱动，不支持上传")
  }
}
```

---

## 🗑️ 建议清理

本目录中的以下文件为半成品实现，**建议暂时删除**：
- `driver.ts` (~150 行，有类型错误)
- `types.ts`
- `util.ts` (~50 行，XPath 解析工具)

**保留文件**:
- `README.md` (本文件，作为未来实现的参考)

---

## 📦 依赖

当前使用的依赖（需要卸载）：
```json
{
  "xpath": "^0.0.32",
  "@xmldom/xmldom": "^0.8.10"
}
```

---

## 💡 未来实现建议

当需要实现 AutoIndex 驱动时：

1. **从 Go 版本重新移植**
   - 位置: `OpenList/drivers/autoindex/`
   - 参考 HTML 解析逻辑

2. **使用更现代的解析库**
   ```bash
   npm install cheerio  # 替代 xpath + xmldom
   ```

3. **严格遵循 TSWorker 接口**
   - 双路径参数
   - physicalPath = URL 路径
   - 只读驱动（写操作抛出错误）

4. **注册到 storage.ts**
   ```typescript
   else if (
     normDriver === "autoindex" ||
     normDriver === "nginx" ||
     normDriver === "nginxautoindex"
   ) {
     driver = new AutoIndexDriver(addition)
   }
   ```

---

**创建时间**: 2026-09-05  
**状态**: 半成品，待清理  
**建议**: 删除所有 .ts 代码文件，保留 README 作为未来参考  
**优先级**: 低（只读驱动，用途有限）
