import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

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
      {/* 管理页面路由 */}
      <Route path="/@pages/my-shares" element={<MyShares />} />
      <Route path="/@pages/crypt-config" element={<CryptConfig />} />
      <Route path="/@pages/mates-config" element={<MatesConfig />} />
      <Route path="/@pages/connection-config" element={<ConnectionConfig />} />
      <Route path="/@pages/task-config" element={<TaskConfig />} />
      <Route path="/@pages/offline-download" element={<OfflineDownload />} />
      <Route path="/@pages/account-settings" element={<AccountSettings />} />
      <Route path="/@pages/mount-management" element={<MountManagement />} />
      <Route path="/@pages/user-management" element={<UserManagement />} />
      <Route path="/@pages/group-management" element={<GroupManagement />} />
      <Route path="/@pages/oauth-management" element={<OAuthManagement />} />
      <Route path="/@pages/site-settings" element={<SiteSettings />} />
      <Route path="/@pages/about-platform" element={<AboutPlatform />} />

      {/* 动态文件路径路由 - /@pages/* 格式 */}
      <Route path="/@pages/*" element={<DynamicFileManager />} />
      
      {/* 动态文件路径路由 - /* 格式 */}
      <Route path="/*" element={<DynamicFileManager />} />
    </Routes>
  );
};

export default Router;