# 开发文档

本目录包含 OpenList-TSWorker 的开发指南和扩展文档。

## 📖 文档列表

### 开发指南

- **[1-00000-Plugin-Development.md](./1-00000-Plugin-Development.md)**
  - 插件开发完整指南
  - 如何创建自定义插件扩展功能

- **[1-00001-Database-Backend-Support.md](./1-00001-Database-Backend-Support.md)**
  - 多数据库后端支持说明
  - 支持的数据库类型和配置方法

- **[1-00002-Development-Plan.md](./1-00002-Development-Plan.md)**
  - 项目开发路线图
  - 未来功能规划

## 🛠️ 开发环境

开发 OpenList-TSWorker 需要：
- Node.js 18+
- TypeScript
- Wrangler CLI (Cloudflare Workers)
- 或 EdgeOne CLI (腾讯云)

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建
npm run build

# 部署
npm run deploy
```

## 📚 相关资源

- 架构设计：查看 [../2-Architecture/](../2-Architecture/)
- 部署指南：查看 [../0-Getting-Started/](../0-Getting-Started/)

---

**返回**: [文档中心](../README.md)
