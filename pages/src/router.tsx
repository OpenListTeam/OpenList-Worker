import React from 'react';
import { Routes, Route } from 'react-router-dom';

// 文件管理页面
import PublicDirectory from './pages/FileManagement/PublicDirectory';
import MyFiles from './pages/FileManagement/MyFiles';

// 个人管理页面
import MyShares from './pages/PersonalManagement/MyShares';
import CryptConfig from './pages/PersonalManagement/CryptConfig';
import MatesConfig from './pages/PersonalManagement/MatesConfig';
import ConnectionConfig from './pages/PersonalManagement/ConnectionConfig';
import TaskConfig from './pages/PersonalManagement/TaskConfig';
import OfflineDownload from './pages/PersonalManagement/OfflineDownload';
import AccountSettings from './pages/PersonalManagement/AccountSettings';

// 系统管理页面
import MountManagement from './pages/SystemManagement/MountManagement';
import UserManagement from './pages/SystemManagement/UserManagement';
import GroupManagement from './pages/SystemManagement/GroupManagement';
import OAuthManagement from './pages/SystemManagement/OAuthManagement';
import SiteSettings from './pages/SystemManagement/SiteSettings';
import AboutPlatform from './pages/SystemManagement/AboutPlatform';

const Router: React.FC = () => {
  return (
    <Routes>
      {/* 文件管理 */}
      <Route path="/public-directory" element={<PublicDirectory />} />
      <Route path="/my-files" element={<MyFiles />} />

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