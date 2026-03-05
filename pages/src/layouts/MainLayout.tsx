/**
 * 主布局组件 — 包含侧边栏 + 内容区域
 * 支持响应式、暗黑、透明模式
 */
import React, { useEffect } from 'react';
import { Breadcrumb, Button, Drawer } from 'antd';
import { MenuOutlined, HomeOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppSidebar from './AppSidebar';
import { useSidebarStore, useThemeStore } from '../store';



// 路由 → 面包屑映射
const breadcrumbMap: Record<string, string> = {
  '/files': 'sidebar.files',
  '/admin/mounts': 'sidebar.storageManage',
  '/admin/path-rules': 'sidebar.pathRules',
  '/admin/path-manage': 'sidebar.pathManage',
  '/admin/index-manage': 'sidebar.indexManage',
  '/admin/users': 'sidebar.userManage',
  '/admin/groups': 'sidebar.groupManage',
  '/admin/auth': 'sidebar.authManage',
  '/admin/private-space': 'sidebar.privateSpace',
  '/admin/site-settings': 'sidebar.siteSettings',
  '/admin/appearance': 'sidebar.appearance',
  '/admin/backup': 'sidebar.backupRestore',
  '/user/tasks': 'sidebar.taskSettings',
  '/user/offline-download': 'sidebar.offlineDownload',
  '/user/upload': 'sidebar.localUpload',
  '/user/cloud-copy': 'sidebar.cloudCopy',
  '/user/cloud-move': 'sidebar.cloudMove',
  '/user/cloud-extract': 'sidebar.cloudExtract',
  '/admin/ldap': 'sidebar.ldap',
  '/admin/ftp': 'sidebar.ftpSftp',
  '/admin/nfs': 'sidebar.nfsDlna',
  '/admin/smb': 'sidebar.smb',
  '/admin/share-settings': 'sidebar.shareSettings',
  '/user/shares': 'sidebar.shareManage',
  '/user/crypt': 'sidebar.cryptManage',
  '/user/account': 'user.accountSettings',
  '/about': 'sidebar.aboutSite',
  '/help': 'sidebar.helpDoc',
};

const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed, mobileOpen, setMobileOpen } = useSidebarStore();
  const { themeMode } = useThemeStore();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // 监听路由变化关闭移动端抽屉
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  // 面包屑
  const getBreadcrumbItems = () => {
    const items = [
      {
        title: <HomeOutlined onClick={() => navigate('/files')} style={{ cursor: 'pointer' }} />,
      },
    ];
    const current = breadcrumbMap[location.pathname];
    if (current) {
      items.push({ title: <span>{t(current)}</span> });
    }
    return items;
  };

  const siderWidth = collapsed ? 72 : 260;

  const headerStyle: React.CSSProperties = {
    padding: '0 24px',
    height: 56,
    lineHeight: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: themeMode === 'transparent' ? 'blur(20px) saturate(180%)' : 'blur(8px)',
    borderBottom: themeMode === 'transparent'
      ? '1px solid rgba(255,255,255,0.06)'
      : themeMode === 'dark'
        ? '1px solid #2D3039'
        : '1px solid #E5E7EB',
  };

  return (
    // 用普通 div 作为根容器，避免 Ant Design Layout flex 布局与 fixed 侧边栏冲突
    <div style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏（position: fixed，脱离文档流） */}
      {!isMobile && <AppSidebar />}

      {/* 移动端抽屉式侧边栏 */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          width={280}
          styles={{ body: { padding: 0 } }}
          closable={false}
        >
          <AppSidebar />
        </Drawer>
      )}

      {/* 主内容区域：用 paddingLeft 偏移，width 自然是 100vw，不受 flex 影响 */}
      <div style={{
        paddingLeft: isMobile ? 0 : siderWidth,
        transition: 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 顶部栏 */}
        <header style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileOpen(true)}
              />
            )}
            <Breadcrumb items={getBreadcrumbItems()} />
          </div>
        </header>

        {/* 内容区域 */}
        <main style={{
          padding: isMobile ? 16 : 24,
          flex: 1,
          overflow: 'auto',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
