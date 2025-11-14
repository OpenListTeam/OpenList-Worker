import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// 文件管理页面
import DynamicFileManager from './pages/Files/DynamicFileManager';

// 个人管理页面
import MyShares from './pages/Users/MyShares';
import CryptConfig from './pages/Users/CryptConfig';
import MatesConfig from './pages/Users/MatesConfig';
import ConnectionConfig from './pages/Users/ConnectionConfig';
import TaskConfig from './pages/Users/TaskConfig';
import OfflineDownload from './pages/Users/OfflineDownload';
import AccountSettings from './pages/Users/AccountSettings';

// 系统管理页面
import MountManagement from './pages/Admin/MountManagement';
import UserManagement from './pages/Admin/UserManagement';
import GroupManagement from './pages/Admin/GroupManagement';
import OAuthManagement from './pages/Admin/OAuthManagement';
import SiteSettings from './pages/Admin/SiteSettings';
import AboutPlatform from './pages/Admin/AboutPlatform';

const Router: React.FC = () => {
  return (
    <Routes>
      {/* 管理页面路由 - 需要登录保护 */}
      <Route path="/@pages/my-shares" element={<ProtectedRoute><MyShares /></ProtectedRoute>} />
      <Route path="/@pages/crypt-config" element={<ProtectedRoute><CryptConfig /></ProtectedRoute>} />
      <Route path="/@pages/mates-config" element={<ProtectedRoute><MatesConfig /></ProtectedRoute>} />
      <Route path="/@pages/connection-config" element={<ProtectedRoute><ConnectionConfig /></ProtectedRoute>} />
      <Route path="/@pages/task-config" element={<ProtectedRoute><TaskConfig /></ProtectedRoute>} />
      <Route path="/@pages/offline-download" element={<ProtectedRoute><OfflineDownload /></ProtectedRoute>} />
      <Route path="/@pages/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
      <Route path="/@pages/mount-management" element={<ProtectedRoute><MountManagement /></ProtectedRoute>} />
      <Route path="/@pages/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/@pages/group-management" element={<ProtectedRoute><GroupManagement /></ProtectedRoute>} />
      <Route path="/@pages/oauth-management" element={<ProtectedRoute><OAuthManagement /></ProtectedRoute>} />
      <Route path="/@pages/site-settings" element={<ProtectedRoute><SiteSettings /></ProtectedRoute>} />
      <Route path="/@pages/about-platform" element={<ProtectedRoute><AboutPlatform /></ProtectedRoute>} />

      {/* 动态文件路径路由 - /@pages/* 格式 - 需要登录保护 */}
      <Route path="/@pages/*" element={<ProtectedRoute><DynamicFileManager /></ProtectedRoute>} />
      
      {/* 动态文件路径路由 - /* 格式 - 需要登录保护 */}
      <Route path="/*" element={<ProtectedRoute><DynamicFileManager /></ProtectedRoute>} />
    </Routes>
  );
};

export default Router;