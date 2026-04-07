/**
 * 路由配置 — 基于系统结构设置文档
 * 
 * 权限分层：
 * - 公开路由：文件管理（公共文件）、媒体库、关于、登录
 * - 登录用户路由：我的文件、个人设置、任务、分享
 * - 管理员路由：存储管理、用户管理、全局设置、连接管理、安全管理
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

/** 需要管理员权限才能访问的路由 */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!isAdmin()) {
    return <Navigate to="/files" replace />;
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
const FilePreview = lazy(() => import('./pages/Files/FilePreview'));
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

// 新增页面组件
const MediaLibrary = lazy(() => import('./pages/Files/MediaLibrary'));
const MyFiles = lazy(() => import('./pages/Files/MyFiles'));
const ProfileSettings = lazy(() => import('./pages/Users/ProfileSettings'));
const PasswordChange = lazy(() => import('./pages/Users/PasswordChange'));
const IndexManage = lazy(() => import('./pages/Admin/IndexManage'));
const AppearanceSettings = lazy(() => import('./pages/Admin/AppearanceSettings'));
const BackupRestore = lazy(() => import('./pages/Admin/BackupRestore'));
const ShareSettings = lazy(() => import('./pages/Admin/ShareSettings'));
const CryptSettings = lazy(() => import('./pages/Admin/CryptSettings'));
const UploadManage = lazy(() => import('./pages/Users/UploadManage'));
const CloudCopy = lazy(() => import('./pages/Users/CloudCopy'));
const CloudMove = lazy(() => import('./pages/Users/CloudMove'));
const CloudExtract = lazy(() => import('./pages/Users/CloudExtract'));


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
  // 主布局（公开访问，菜单根据角色动态显示）
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // 默认重定向到文件管理
      { index: true, element: <Navigate to="/files" replace /> },

      // ═══════════ 公开路由（未登录可访问） ═══════════
      // 公共文件管理
      { path: 'files', element: <LazyLoad><FileManager /></LazyLoad> },
      { path: 'files/*', element: <LazyLoad><FileManager /></LazyLoad> },
      // 文件预览
      { path: 'preview/*', element: <LazyLoad><FilePreview /></LazyLoad> },
      // 媒体库
      { path: 'media/video', element: <LazyLoad><MediaLibrary /></LazyLoad> },
      { path: 'media/music', element: <LazyLoad><MediaLibrary /></LazyLoad> },
      { path: 'media/image', element: <LazyLoad><MediaLibrary /></LazyLoad> },
      { path: 'media/books', element: <LazyLoad><MediaLibrary /></LazyLoad> },
      // 关于
      { path: 'about', element: <LazyLoad><AboutPage /></LazyLoad> },
      { path: 'help', element: <LazyLoad><AboutPage /></LazyLoad> },

      // ═══════════ 登录用户路由 ═══════════
      // 我的文件
      { path: 'files/my', element: <ProtectedRoute><LazyLoad><MyFiles /></LazyLoad></ProtectedRoute> },
      { path: 'files/my/*', element: <ProtectedRoute><LazyLoad><MyFiles /></LazyLoad></ProtectedRoute> },
      // 个人设置
      { path: 'user/profile', element: <ProtectedRoute><LazyLoad><ProfileSettings /></LazyLoad></ProtectedRoute> },
      { path: 'user/password', element: <ProtectedRoute><LazyLoad><PasswordChange /></LazyLoad></ProtectedRoute> },
      { path: 'user/account', element: <ProtectedRoute><LazyLoad><AccountSettings /></LazyLoad></ProtectedRoute> },
      // 任务
      { path: 'user/tasks', element: <ProtectedRoute><LazyLoad><TaskConfig /></LazyLoad></ProtectedRoute> },
      { path: 'user/offline-download', element: <ProtectedRoute><LazyLoad><OfflineDownload /></LazyLoad></ProtectedRoute> },
      { path: 'user/upload', element: <ProtectedRoute><LazyLoad><UploadManage /></LazyLoad></ProtectedRoute> },
      { path: 'user/cloud-copy', element: <ProtectedRoute><LazyLoad><CloudCopy /></LazyLoad></ProtectedRoute> },
      { path: 'user/cloud-move', element: <ProtectedRoute><LazyLoad><CloudMove /></LazyLoad></ProtectedRoute> },
      { path: 'user/cloud-extract', element: <ProtectedRoute><LazyLoad><CloudExtract /></LazyLoad></ProtectedRoute> },
      // 分享
      { path: 'user/shares', element: <ProtectedRoute><LazyLoad><ShareManage /></LazyLoad></ProtectedRoute> },
      // 加密
      { path: 'user/crypt', element: <ProtectedRoute><LazyLoad><CryptConfig /></LazyLoad></ProtectedRoute> },

      // ═══════════ 管理员路由 ═══════════
      // 存储管理
      { path: 'admin/mounts', element: <AdminRoute><LazyLoad><MountManagement /></LazyLoad></AdminRoute> },
      { path: 'admin/path-rules', element: <AdminRoute><LazyLoad><PathRules /></LazyLoad></AdminRoute> },
      { path: 'admin/path-manage', element: <AdminRoute><LazyLoad><MatesConfig /></LazyLoad></AdminRoute> },
      { path: 'admin/index-manage', element: <AdminRoute><LazyLoad><IndexManage /></LazyLoad></AdminRoute> },
      // 用户管理
      { path: 'admin/users', element: <AdminRoute><LazyLoad><UserManagement /></LazyLoad></AdminRoute> },
      { path: 'admin/groups', element: <AdminRoute><LazyLoad><GroupManagement /></LazyLoad></AdminRoute> },
      { path: 'admin/auth', element: <AdminRoute><LazyLoad><OAuthManagement /></LazyLoad></AdminRoute> },
      // 全局设置
      { path: 'admin/site-settings', element: <AdminRoute><LazyLoad><SiteSettings /></LazyLoad></AdminRoute> },
      { path: 'admin/appearance', element: <AdminRoute><LazyLoad><AppearanceSettings /></LazyLoad></AdminRoute> },
      { path: 'admin/backup', element: <AdminRoute><LazyLoad><BackupRestore /></LazyLoad></AdminRoute> },

      // 分享设置
      { path: 'admin/share-settings', element: <AdminRoute><LazyLoad><ShareSettings /></LazyLoad></AdminRoute> },
      // 安全管理
      { path: 'admin/crypt-settings', element: <AdminRoute><LazyLoad><CryptSettings /></LazyLoad></AdminRoute> },

      // ═══════════ 404 ═══════════
      { path: '*', element: <Navigate to="/files" replace /> },
    ],
  },
]);
