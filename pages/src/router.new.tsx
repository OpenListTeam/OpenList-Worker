/**
 * 路由配置 — 基于系统结构设置文档
 * 使用 useAuthStore 进行统一鉴权
 */
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store';

// ─── 鉴权路由组件 ────────────────────────────────────────────────────────────

/** 需要登录才能访问的路由 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

/** 仅未登录可访问（已登录跳转到 /files） */
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/files" replace />;
  }
  return <>{children}</>;
};

// ─── 懒加载页面组件 ──────────────────────────────────────────────────────────

const LoginPage = lazy(() => import('./pages/Login/AuthPage'));
const FileManager = lazy(() => import('./pages/Files/FileManager'));
const MountManagement = lazy(() => import('./pages/Admin/MountManagement'));
const UserManagement = lazy(() => import('./pages/Admin/UserManagement'));
const GroupManagement = lazy(() => import('./pages/Admin/GroupManagement'));
const OAuthManagement = lazy(() => import('./pages/Admin/OAuthManagement'));
const SiteSettings = lazy(() => import('./pages/Admin/SiteSettings'));
const PathRules = lazy(() => import('./pages/Admin/PathRules'));
const MatesConfig = lazy(() => import('./pages/Users/MatesConfig'));
const CryptConfig = lazy(() => import('./pages/Users/CryptConfig'));
const ShareManage = lazy(() => import('./pages/Users/MyShares'));
const TaskConfig = lazy(() => import('./pages/Users/TaskConfig'));
const OfflineDownload = lazy(() => import('./pages/Users/OfflineDownload'));
const AccountSettings = lazy(() => import('./pages/Users/AccountSettings'));
const AboutPage = lazy(() => import('./pages/Admin/AboutPlatform'));
const ConnectionConfig = lazy(() => import('./pages/Users/ConnectionConfig'));
const OAuthCallback = lazy(() => import('./pages/OAuth/OAuthCallback'));
const FilePreview = lazy(() => import('./pages/Files/FilePreview'));

// ─── 加载占位 ────────────────────────────────────────────────────────────────

const LazyLoad: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '60vh',
    }}>
      <Spin size="large" />
    </div>
  }>
    {children}
  </Suspense>
);

// ─── 路由配置 ────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // 登录 / 注册（已登录自动跳转到 /files）
  {
    path: '/login',
    element: <GuestRoute><LazyLoad><LoginPage /></LazyLoad></GuestRoute>,
  },
  {
    path: '/register',
    element: <GuestRoute><LazyLoad><LoginPage /></LazyLoad></GuestRoute>,
  },
  // OAuth 回调（无需鉴权）
  {
    path: '/oauth/callback',
    element: <LazyLoad><OAuthCallback /></LazyLoad>,
  },
  // 主布局（需要登录）
  {
    path: '/',
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      // 默认重定向到文件管理
      { index: true, element: <Navigate to="/files" replace /> },

      // ═══════════ 文件管理 ═══════════
      { path: 'files', element: <LazyLoad><FileManager /></LazyLoad> },
      { path: 'files/*', element: <LazyLoad><FileManager /></LazyLoad> },
      // 文件预览（/preview/* 匹配文件完整路径）
      { path: 'preview/*', element: <LazyLoad><FilePreview /></LazyLoad> },

      // ═══════════ 存储管理 ═══════════
      { path: 'admin/mounts', element: <LazyLoad><MountManagement /></LazyLoad> },
      { path: 'admin/path-rules', element: <LazyLoad><PathRules /></LazyLoad> },
      { path: 'admin/path-manage', element: <LazyLoad><MatesConfig /></LazyLoad> },
      { path: 'admin/index-manage', element: <LazyLoad><SiteSettings /></LazyLoad> },

      // ═══════════ 用户管理 ═══════════
      { path: 'admin/users', element: <LazyLoad><UserManagement /></LazyLoad> },
      { path: 'admin/groups', element: <LazyLoad><GroupManagement /></LazyLoad> },
      { path: 'admin/auth', element: <LazyLoad><OAuthManagement /></LazyLoad> },
      { path: 'admin/private-space', element: <LazyLoad><SiteSettings /></LazyLoad> },

      // ═══════════ 全局设置 ═══════════
      { path: 'admin/site-settings', element: <LazyLoad><SiteSettings /></LazyLoad> },
      { path: 'admin/appearance', element: <LazyLoad><SiteSettings /></LazyLoad> },
      { path: 'admin/backup', element: <LazyLoad><SiteSettings /></LazyLoad> },

      // ═══════════ 任务 ═══════════
      { path: 'user/tasks', element: <LazyLoad><TaskConfig /></LazyLoad> },
      { path: 'user/offline-download', element: <LazyLoad><OfflineDownload /></LazyLoad> },
      { path: 'user/upload', element: <LazyLoad><TaskConfig /></LazyLoad> },
      { path: 'user/cloud-copy', element: <LazyLoad><TaskConfig /></LazyLoad> },
      { path: 'user/cloud-move', element: <LazyLoad><TaskConfig /></LazyLoad> },
      { path: 'user/cloud-extract', element: <LazyLoad><TaskConfig /></LazyLoad> },

      // ═══════════ 连接 ═══════════
      { path: 'admin/ldap', element: <LazyLoad><ConnectionConfig /></LazyLoad> },
      { path: 'admin/ftp', element: <LazyLoad><ConnectionConfig /></LazyLoad> },
      { path: 'admin/nfs', element: <LazyLoad><ConnectionConfig /></LazyLoad> },
      { path: 'admin/smb', element: <LazyLoad><ConnectionConfig /></LazyLoad> },

      // ═══════════ 分享 ═══════════
      { path: 'admin/share-settings', element: <LazyLoad><SiteSettings /></LazyLoad> },
      { path: 'user/shares', element: <LazyLoad><ShareManage /></LazyLoad> },

      // ═══════════ 安全 ═══════════
      { path: 'user/crypt', element: <LazyLoad><CryptConfig /></LazyLoad> },

      // ═══════════ 用户设置 ═══════════
      { path: 'user/account', element: <LazyLoad><AccountSettings /></LazyLoad> },

      // ═══════════ 关于 ═══════════
      { path: 'about', element: <LazyLoad><AboutPage /></LazyLoad> },
      { path: 'help', element: <LazyLoad><AboutPage /></LazyLoad> },

      // ═══════════ 404 ═══════════
      { path: '*', element: <Navigate to="/files" replace /> },
    ],
  },
]);
