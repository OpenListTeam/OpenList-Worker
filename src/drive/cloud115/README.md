# 115云盘驱动配置说明

## 重要变更

**注意：** 从最新版本开始，115云盘驱动已从Cookie认证方式改为AccessToken + RefreshToken认证方式，以与Go版本保持一致。

## 配置参数

### 必需参数

- `access_token`: 访问令牌（必填）
- `refresh_token`: 刷新令牌（必填）

### 可选参数

- `root_folder_id`: 根文件夹ID，默认为 "0"（根目录）
- `order_by`: 排序方式，可选值：
  - `file_name`: 按文件名排序（默认）
  - `file_size`: 按文件大小排序
  - `user_utime`: 按修改时间排序
  - `file_type`: 按文件类型排序
- `order_direction`: 排序方向，可选值：
  - `asc`: 升序（默认）
  - `desc`: 降序
- `limit_rate`: API请求限流（请求/秒），默认为 1

## 如何获取AccessToken和RefreshToken

### 方法1：使用115 Open API（推荐）

1. 访问 [115开放平台](https://open.115.com/)
2. 注册并创建应用
3. 按照官方文档获取AccessToken和RefreshToken

### 方法2：使用第三方工具

可以使用支持115 Open API的第三方工具来获取Token，例如：
- [115-sdk-go](https://github.com/OpenListTeam/115-sdk-go)（Go语言SDK）
- 其他支持115 Open API的工具

### 方法3：从Go版本迁移

如果您已经在使用Go版本的OpenList，可以直接复制配置中的AccessToken和RefreshToken。

## 配置示例

```json
{
  "access_token": "your_access_token_here",
  "refresh_token": "your_refresh_token_here",
  "root_folder_id": "0",
  "order_by": "file_name",
  "order_direction": "asc",
  "limit_rate": 1
}
```

## 常见问题

### Q: 为什么不再使用Cookie方式？

A: Cookie方式不稳定且不符合115官方的API规范。使用AccessToken + RefreshToken方式更加安全和可靠，与Go版本保持一致。

### Q: 我的旧配置（Cookie方式）还能用吗？

A: 不能。您需要重新配置，使用AccessToken和RefreshToken。

### Q: Token过期了怎么办？

A: 目前TypeScript版本暂未实现自动刷新Token的功能。Token过期后需要手动更新。我们计划在未来版本中添加自动刷新功能。

### Q: 如何获取115 SDK？

A: 目前官方提供了Go语言版本的SDK。TypeScript版本的SDK正在开发中。

## 技术说明

本驱动基于115 Open API实现，参考了Go版本的实现方式。主要特性：

- 使用Bearer Token认证
- 支持文件列表、上传、下载、移动、复制、删除等操作
- 支持限流控制
- 支持自定义排序

## 相关链接

- [115开放平台](https://open.115.com/)
- [115-sdk-go](https://github.com/OpenListTeam/115-sdk-go)
- [OpenList项目](https://github.com/OpenListTeam/OpenList)
