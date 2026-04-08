# OpenList - 云存储聚合管理系统

OpenList 是一个基于 Cloudflare Workers 的现代化云存储聚合管理系统，支持多种云存储服务的统一管理、文件分享、加密存储等功能。

温馨提醒：本项目还在**早期开发**阶段，部分功能可能不稳定或缺失，请勿生产环境中使用，建议仅在测试环境中部署。已实现内容：
 - 部分网盘管理（谷歌云盘、Onedrive、百度云盘、123云盘、115云盘、天翼云盘）
 - 基本文件操作（上传、下载、删除、重命名）

## ✨ 核心特性

### 🌐 多云存储支持
支持 80+ 种云存储驱动，包括：
- **国内云盘**: 阿里云盘、百度网盘、天翼云盘、115网盘、123云盘、夸克网盘、迅雷云盘、移动云盘等
- **国际云盘**: Google Drive、OneDrive、Dropbox、MEGA、Yandex Disk 等
- **对象存储**: AWS S3、Azure Blob、阿里云 OSS、又拍云 USS 等
- **自建服务**: WebDAV、FTP、SFTP、SMB、Seafile、Cloudreve 等
- **特殊驱动**: 本地存储、虚拟目录、加密目录、别名目录等

### 🔐 安全特性
- **用户认证**: JWT Token 认证、OAuth 第三方登录
- **权限管理**: 用户组权限、路径权限、文件权限控制
- **加密存储**: 支持文件加密存储，多种加密模式
- **安全分享**: 密码保护、有效期限制、访问统计

### 📁 文件管理
- **文件操作**: 上传、下载、删除、重命名、移动、复制
- **目录管理**: 创建、删除、重命名目录
- **文件预览**: 支持图片、视频、音频、文档预览
- **批量操作**: 批量上传、下载、删除
- **离线下载**: 支持 HTTP/HTTPS 离线下载到云盘

### 🎯 高级功能
- **路径挂载**: 灵活的路径挂载配置，支持多级目录
- **缓存系统**: 智能缓存机制，提升访问速度
- **代理模式**: 支持文件代理下载
- **任务管理**: 异步任务处理，支持任务队列
- **分享管理**: 文件/目录分享，支持密码和有效期
- **元数据配置**: 路径级别的权限、加密、缓存配置

## 🏗️ 技术架构

### 后端技术栈
- **运行环境**: Cloudflare Workers (Edge Computing)
- **Web 框架**: Hono.js (轻量级高性能框架)
- **数据库**: Cloudflare D1 (SQLite) / 支持 MySQL、PostgreSQL、MariaDB
- **缓存**: Cloudflare KV (可选)
- **语言**: TypeScript
- **构建工具**: Wrangler, esbuild

### 前端技术栈
- **框架**: React 19 + TypeScript
- **UI 库**: Material-UI v7
- **路由**: React Router v7
- **状态管理**: React Context API
- **HTTP 客户端**: Axios
- **构建工具**: Vite

### 项目结构
```
OpenList-TSWorker/
├── src/                      # 后端源码
│   ├── admin/               # 系统管理模块
│   ├── binds/               # OAuth 绑定管理
│   ├── crypt/               # 加密配置管理
│   ├── drive/               # 云存储驱动
│   │   ├── alicloud/       # 阿里云盘驱动
│   │   ├── baiduyun/       # 百度网盘驱动
│   │   ├── cloud189/       # 天翼云盘驱动
│   │   ├── goodrive/       # Google Drive 驱动
│   │   ├── onedrive/       # OneDrive 驱动
│   │   └── ...             # 其他驱动
│   ├── fetch/               # 离线下载管理
│   ├── files/               # 文件操作管理
│   ├── group/               # 用户组管理
│   ├── mates/               # 元数据配置管理
│   ├── mount/               # 挂载路径管理
│   ├── oauth/               # OAuth 认证管理
│   ├── saves/               # 数据持久化
│   ├── share/               # 分享管理
│   ├── system/              # 系统信息
│   ├── tasks/               # 任务管理
│   ├── token/               # Token 管理
│   ├── users/               # 用户管理
│   └── index.ts            # 主入口文件
├── pages/                   # 前端源码
│   ├── src/
│   │   ├── components/     # 通用组件
│   │   ├── contexts/       # 全局状态
│   │   ├── layouts/        # 布局组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API 服务
│   │   └── theme/          # 主题配置
│   └── public/             # 静态资源
├── drivers/                 # Go 驱动源码（参考）
├── schema.sql              # 数据库结构
├── wrangler.jsonc          # Cloudflare Workers 配置
└── package.json            # 项目依赖

```

## 📦 部署指南

### 前置要求
- Node.js 18+ 
- npm 或 yarn
- Cloudflare 账号（用于部署到 Workers）

### 本地开发

#### 1. 克隆项目
```bash
git clone https://github.com/OpenListTeam/OpenList-TSWorker.git
cd OpenList-TSWorker
```

#### 2. 安装依赖
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd pages
npm install
cd ..
```

#### 3. 配置数据库
```bash
# 创建本地 D1 数据库（如果使用 Cloudflare D1）
wrangler d1 create openlist-db

# 导入数据库结构
wrangler d1 execute openlist-db --file=./schema.sql
```

#### 4. 配置环境
编辑 `wrangler.jsonc` 文件：
```jsonc
{
  "name": "openlist-back-work",
  "main": "src/index.ts",
  "compatibility_date": "2025-08-16",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    "ENABLE_D1": true,
    "REMOTE_D1": ""  // 留空使用本地 D1，或填写远程数据库连接
  },
  // 配置 KV 和 D1 绑定
  "kv_namespaces": [{
    "binding": "KV_DATA",
    "id": "your-kv-namespace-id"  // 替换为你的 KV ID
  }],
  "d1_databases": [{
    "binding": "D1_DATA",
    "database_name": "openlist-db",
    "database_id": "your-d1-database-id"  // 替换为你的 D1 ID
  }]
}
```

#### 5. 启动开发服务器
```bash
# 启动后端开发服务器
npm run dev

# 在另一个终端启动前端开发服务器
npm run dev:pages
```

访问 `http://localhost:8086` 查看前端界面。

### 生产部署

#### 部署到 Cloudflare Workers

1. **登录 Cloudflare**
```bash
wrangler login
```

2. **创建生产数据库**
```bash
# 创建 KV 命名空间
wrangler kv namespace create "KV_DATA"

# 创建 D1 数据库
wrangler d1 create openlist-prod-db

# 导入数据库结构
wrangler d1 execute openlist-prod-db --file=./schema.sql
```

3. **更新配置**
将生成的 KV ID 和 D1 ID 更新到 `wrangler.jsonc` 中。

4. **一键部署（前端+后端）**
```bash
npm run deploy
```

该命令会自动完成以下操作：
- 构建前端项目到 `public` 目录
- 部署后端和前端到 Cloudflare Workers

部署成功后，Cloudflare 会提供一个 Workers 域名，例如：
`https://openlist-back-work.your-subdomain.workers.dev`

#### 使用自定义域名

1. 在 Cloudflare Dashboard 中添加自定义域名
2. 配置 DNS 记录指向 Workers
3. 启用 HTTPS

#### 使用远程数据库

如果不使用 Cloudflare D1，可以使用远程数据库：

在 `wrangler.jsonc` 中配置：
```jsonc
{
  "vars": {
    "ENABLE_D1": true,
    "REMOTE_D1": "mysql://username:password@host:port/database"
    // 支持格式：
    // mysql://username:password@host:port/database
    // maria://username:password@host:port/database
    // pgsql://username:password@host:port/database
  }
}
```

### Docker 部署（可选）

如果需要本地部署而非使用 Cloudflare Workers：

```bash
# 使用 Node.js 服务器模式
npm install @hono/node-server

# 修改入口文件使用 Node.js 适配器
# 然后构建 Docker 镜像
docker build -t openlist .
docker run -p 8080:8080 openlist
```

## 🔧 配置说明

### 数据库配置
系统支持多种数据库：
- **Cloudflare D1**: 推荐用于 Workers 部署
- **MySQL/MariaDB**: 适合自建服务器
- **PostgreSQL**: 适合大规模部署

### 存储配置
- **KV 存储**: 用于缓存和会话管理（可选）
- **D1 存储**: 用于持久化数据存储

### 环境变量
```bash
ENABLE_D1=true          # 是否启用 D1 数据库
REMOTE_D1=              # 远程数据库连接字符串
```

## 📖 API 文档

### 认证接口
- `POST /@users/login/none` - 用户登录
- `POST /@users/logout/none` - 用户登出
- `POST /@users/create/none` - 创建用户
- `GET /@users/select/none` - 查询用户列表

### 文件接口
- `GET /@files/list/path/*` - 列出文件
- `POST /@files/upload/path/*` - 上传文件
- `GET /@files/download/path/*` - 下载文件
- `DELETE /@files/delete/path/*` - 删除文件
- `POST /@files/move/path/*` - 移动文件
- `POST /@files/copy/path/*` - 复制文件

### 挂载接口
- `GET /@mount/select/none` - 查询挂载列表
- `POST /@mount/config/none` - 配置挂载
- `DELETE /@mount/remove/none` - 删除挂载
- `PUT /@mount/status/none` - 切换挂载状态

### 分享接口
- `POST /@share/create/none` - 创建分享
- `GET /@share/select/uuid` - 查询分享
- `DELETE /@share/remove/uuid` - 删除分享
- `GET /@share/access/uuid` - 访问分享

### 任务接口
- `GET /@tasks/select/user` - 查询用户任务
- `POST /@tasks/create/none` - 创建任务
- `PUT /@tasks/status/none` - 更新任务状态

### 系统接口
- `GET /@system/info/none` - 获取系统信息

详细 API 文档请参考代码中的注释。

## 🎨 前端使用

前端项目详细文档请查看 [pages/README.md](pages/README.md)

### 快速开始
```bash
cd pages
npm install
npm run dev
```

### 构建生产版本
```bash
npm run build
```

构建产物在 `pages/dist` 目录，可以部署到任何静态托管服务。

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 [GNU Affero General Public License v3.0](LICENSE) 开源。

## 🙏 致谢

- [Hono.js](https://hono.dev/) - 轻量级 Web 框架
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge Computing 平台
- [React](https://react.dev/) - 前端框架
- [Material-UI](https://mui.com/) - UI 组件库
- 所有贡献者和支持者

## 📞 联系方式

- GitHub Issues: [提交问题](https://github.com/OpenListTeam/OpenList-TSWorker/issues)
- 项目主页: [OpenList](https://github.com/OpenListTeam)

## 🗺️ 路线图

- [ ] 支持更多云存储驱动
- [ ] 移动端 App
- [ ] 文件在线编辑
- [ ] 视频转码
- [ ] 全文搜索
- [ ] WebSocket 实时通知
- [ ] 多语言支持
- [ ] 插件系统

---

**注意**: 本项目仍在积极开发中，API 可能会有变动。生产环境使用请谨慎评估。
