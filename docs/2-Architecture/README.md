# 架构设计

本目录包含 OpenList-TSWorker 的技术架构和驱动实现文档。

## 📖 文档列表

### 架构设计

- **[2-00000-Frontend-Unification.md](./2-00000-Frontend-Unification.md)**
  - 前端统一架构方案
  - 组件复用和模块化设计

- **[2-00001-Feature-Gap-Analysis.md](./2-00001-Feature-Gap-Analysis.md)**
  - 与上游 Go 版本的功能差距分析
  - 功能兼容性说明

- **[2-00004-Implementation-Summary.md](./2-00004-Implementation-Summary.md)**
  - 总体实现摘要
  - 技术选型和实现方案

### 驱动系统

- **[2-00002-Driver-Implementation-Summary.md](./2-00002-Driver-Implementation-Summary.md)**
  - 驱动实现摘要
  - 驱动架构设计

- **[2-00003-Driver-Implementation-Comparison.md](./2-00003-Driver-Implementation-Comparison.md)**
  - Go 版本与 TS 版本驱动对比
  - 实现差异说明

- **[2-00007-Driver-Status.md](./2-00007-Driver-Status.md)**
  - **当前驱动实现状态**
  - **覆盖率: 85.9% (73/85 驱动)**

### MoPan 驱动实现

- **[2-00005-MoPan-Driver-Implementation.md](./2-00005-MoPan-Driver-Implementation.md)**
  - MoPan (中国移动和彩云) 驱动实现说明
  - 功能特性和 API 说明

- **[2-00006-MoPan-Implementation-Report.md](./2-00006-MoPan-Implementation-Report.md)**
  - MoPan 驱动完整实现报告
  - 代码量、测试覆盖率

## 🏗️ 架构概览

OpenList-TSWorker 采用模块化架构：

```
┌─────────────────────────────────────┐
│         Frontend (Unified)          │
├─────────────────────────────────────┤
│         API Layer (TypeScript)      │
├─────────────────────────────────────┤
│      Driver System (85.9%)          │
│  - 73 Drivers Implemented           │
│  - Pluggable Architecture           │
├─────────────────────────────────────┤
│    Storage Backends (Multi-DB)      │
│  - D1, KV, Postgres, etc.           │
└─────────────────────────────────────┘
```

## 📊 当前状态

- **总驱动数**: 85 个（Go 版本）
- **已实现**: 73 个（包括 MoPan）
- **覆盖率**: 85.9%
- **待实现**: 12 个

## 📚 相关资源

- 开发指南：查看 [../1-Development/](../1-Development/)
- 部署指南：查看 [../0-Getting-Started/](../0-Getting-Started/)

---

**返回**: [文档中心](../README.md)
