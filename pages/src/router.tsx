import React from 'react';
import { Routes, Route } from 'react-router-dom';

// 文件管理页面
import PublicDirectory from './pages/Files/PublicDirectory';
import MyFiles from './pages/Files/MyFiles';
import UnifiedFileManager from './pages/Files/UnifiedFileManager';
import MyFilesWrapper from './pages/Files/MyFilesWrapper';

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
      {/* 文件管理 */}
      <Route 
        path="/public-directory" 
        element={<UnifiedFileManager defaultPath="/" title="公共目录" />} 
      />
      <Route 
        path="/my-files" 
        element={<MyFilesWrapper />} 
      />

      {/* 个人管理 */}
      <Route path="/my-shares" element={<MyShares />} />
      <Route path="/crypt-config" element={<CryptConfig />} />
      <Route path="/mates-config" element={<MatesConfig />} />
      <Route path="/connection-config" element={<ConnectionConfig />} />
      <Route path="/task-config" element={<TaskConfig />} />
      <Route path="/offline-download" element={<OfflineDownload />} />
      <Route path="/account-settings" element={<AccountSettings />} />

      {/* 系统管理 */}
      <Route path="/mount-management" element={<MountManagement />} />
      <Route path="/user-management" element={<UserManagement />} />
      <Route path="/group-management" element={<GroupManagement />} />
      <Route path="/oauth-management" element={<OAuthManagement />} />
      <Route path="/site-settings" element={<SiteSettings />} />
      <Route path="/about-platform" element={<AboutPlatform />} />

      {/* 默认路由 */}
      <Route path="/" element={<MyFiles />} />
    </Routes>
  );
};

export default Router;