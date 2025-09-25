# OpenList 前端项目

基于 React + TypeScript + Material-UI 的现代化文件管理系统前端。

## 🚀 项目架构

### 技术栈
- **React 19** - 前端框架
- **TypeScript** - 类型安全
- **Material-UI v7** - UI组件库
- **React Router v7** - 路由管理
- **Vite** - 构建工具
- **Axios** - HTTP客户端
- **React Context** - 状态管理

### 项目结构
```
pages/
├── src/
│   ├── components/          # 通用组件
│   │   ├── DataTable/      # 增强数据表格
│   │   ├── PageTemplate/   # 页面模板
│   │   └── Sidebar/        # 侧边栏
│   ├── contexts/           # React Context
│   │   └── AppContext.tsx  # 全局状态管理
│   ├── layouts/            # 布局组件
│   │   └── MainLayout.tsx  # 主布局
│   ├── pages/              # 页面组件
│   │   ├── FileManagement/ # 文件管理
│   │   ├── PersonalManagement/ # 个人管理
│   │   └── SystemManagement/   # 系统管理
│   ├── services/           # API服务
│   │   └── api.ts         # API接口封装
│   ├── theme/              # 主题配置
│   │   └── index.ts       # 主题定义
│   ├── types/              # 类型定义
│   ├── App.tsx            # 主应用组件
│   ├── router.tsx         # 路由配置
│   └── main.tsx           # 应用入口
├── public/                 # 静态资源
└── package.json           # 项目配置
```

## 🎯 核心功能

### 1. 模块化架构
- **文件管理**: 我的文件、公共目录、文件分享
- **个人管理**: 账号设置、加密配置、伙伴配置、任务配置
- **系统管理**: 用户管理、群组管理、OAuth管理、系统设置

### 2. 响应式设计
- 支持桌面端和移动端
- 自适应布局
- 触摸友好的交互

### 3. 主题系统
- 支持浅色/深色主题切换
- 主题持久化存储
- 自定义主题配置

### 4. 数据管理
- 统一API服务层
- 错误处理机制
- 数据缓存策略

## 🛠️ 开发指南

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建项目
```bash
npm run build
```

### 代码检查
```bash
npm run lint
```

## 📋 使用说明

### 创建新页面

1. 在 `src/pages/` 下创建页面组件：
```tsx
import React from 'react';
import PageTemplate from '../../components/PageTemplate';

const MyPage: React.FC = () => {
    return (
        <PageTemplate
            title="页面标题"
            breadcrumbs={[{ name: '首页' }, { name: '页面标题' }]}
        >
            {/* 页面内容 */}
        </PageTemplate>
    );
};

export default MyPage;
```

2. 在 `src/router.tsx` 中添加路由：
```tsx
<Route path="/my-page" element={<MyPage />} />
```

### 使用数据表格

```tsx
import DataTable from '../components/DataTable';

const columns = [
    { id: 'name', label: '名称', sortable: true },
    { id: 'size', label: '大小', align: 'right' },
    { id: 'date', label: '日期', format: (value) => new Date(value).toLocaleDateString() },
];

const MyComponent = () => {
    const rows = [
        { id: '1', name: '文件1', size: '1MB', date: '2025-09-25' },
        { id: '2', name: '文件2', size: '2MB', date: '2025-09-24' },
    ];

    return (
        <DataTable
            columns={columns}
            rows={rows}
            title="文件列表"
            showCheckbox={true}
            showPagination={true}
        />
    );
};
```

### 使用API服务

```tsx
import { fileApi, userApi } from '../posts/api';

// 获取文件列表
const files = await fileApi.getFiles({ path: '/documents' });

// 上传文件
const result = await fileApi.uploadFile(file, '/uploads', (progress) => {
    console.log(`上传进度: ${progress}%`);
});

// 获取用户信息
const userInfo = await userApi.getUserInfo();
```

### 使用全局状态

```tsx
import { useApp } from '../contexts/AppContext';

const MyComponent = () => {
    const { state, login, logout, toggleTheme, showNotification } = useApp();

    // 获取当前用户信息
    const { user, isAuthenticated, theme } = state;

    // 切换主题
    const handleToggleTheme = () => {
        toggleTheme();
    };

    // 显示通知
    const handleShowNotification = () => {
        showNotification('success', '操作成功！');
    };

    return (
        <div>
            <p>当前主题: {theme}</p>
            <p>用户: {user?.username}</p>
            <button onClick={handleToggleTheme}>切换主题</button>
            <button onClick={handleShowNotification}>显示通知</button>
        </div>
    );
};
```

## 🔧 配置说明

### 环境变量
创建 `.env` 文件：
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

### 主题配置
在 `src/theme/index.ts` 中自定义主题：
```ts
export const lightTheme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});
```

## 🎨 UI组件库

### Material-UI 组件
- **布局**: Box, Grid, Container, Stack
- **导航**: AppBar, Drawer, Menu, Breadcrumbs
- **数据展示**: Table, List, Card, Chip
- **反馈**: Snackbar, Dialog, Progress
- **输入**: TextField, Button, Select, Checkbox

### 自定义组件
- **PageTemplate**: 页面模板，包含标题、面包屑、操作栏
- **DataTable**: 增强数据表格，支持排序、分页、选择
- **MainLayout**: 主布局，包含侧边栏和顶部栏

## 🔒 安全特性

- JWT认证
- 权限控制
- 输入验证
- XSS防护
- CSRF防护

## 📱 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 许可证

此项目基于 MIT 许可证开源 - 查看 [LICENSE](../LICENSE) 文件了解详情。