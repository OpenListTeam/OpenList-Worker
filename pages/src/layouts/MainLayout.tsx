/**
 * 主布局组件 — 包含侧边栏 + 内容区域
 * 支持响应式、暗黑、透明模式
 * 美化：精致顶部栏、面包屑、内容区动画
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Breadcrumb, Button, Drawer, Typography } from 'antd';
import { MenuOutlined, HomeOutlined, RightOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppSidebar from './AppSidebar';
import { useSidebarStore, useThemeStore } from '../store';

const { Text } = Typography;

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

  // 响应式 isMobile（监听窗口大小变化）
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  // 内容区域动画 key，路由切换时触发重新渲染
  const [contentKey, setContentKey] = useState(location.pathname);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 监听路由变化：关闭移动端抽屉 + 触发内容动画
  useEffect(() => {
    setMobileOpen(false);
    setContentKey(location.pathname);
  }, [location.pathname, setMobileOpen]);

  // 面包屑
  const getBreadcrumbItems = useCallback(() => {
    const items = [
      {
        title: (
          <span
            onClick={() => navigate('/files')}
            style={{
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              opacity: 0.7,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
          >
            <HomeOutlined style={{ fontSize: 13 }} />
          </span>
        ),
      },
    ];
    const current = breadcrumbMap[location.pathname];
    if (current) {
      items.push({
        title: (
          <Text
            style={{
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {t(current)}
          </Text>
        ),
      });
    }
    return items;
  }, [location.pathname, navigate, t]);

  const siderWidth = collapsed ? 72 : 260;

  // 主题相关样式变量
  const isTransparent = themeMode === 'transparent';
  const isDark = themeMode === 'dark' || isTransparent;

  const headerBg = isTransparent
    ? 'rgba(17, 19, 24, 0.55)'
    : isDark
      ? 'rgba(26, 29, 35, 0.92)'
      : 'rgba(255, 255, 255, 0.88)';

  const headerBorder = isTransparent
    ? '1px solid rgba(255,255,255,0.07)'
    : isDark
      ? '1px solid rgba(255,255,255,0.06)'
      : '1px solid rgba(0,0,0,0.06)';

  const headerShadow = isDark
    ? '0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.2)'
    : '0 1px 0 rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)';

  return (
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
          styles={{
            body: { padding: 0, overflow: 'hidden' },
            mask: { backdropFilter: 'blur(4px)' },
          }}
          closable={false}
        >
          <AppSidebar />
        </Drawer>
      )}

      {/* 主内容区域 */}
      <div
        style={{
          paddingLeft: isMobile ? 0 : siderWidth,
          transition: 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── 顶部栏 ── */}
        <header
          style={{
            padding: '0 20px 0 24px',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: headerBg,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: headerBorder,
            boxShadow: headerShadow,
            transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
          }}
        >
          {/* 左侧：汉堡菜单（移动端）+ 面包屑 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <Button
                type="text"
                size="small"
                icon={<MenuOutlined />}
                onClick={() => setMobileOpen(true)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            )}
            <Breadcrumb
              separator={
                <RightOutlined
                  style={{ fontSize: 10, opacity: 0.35, verticalAlign: 'middle' }}
                />
              }
              items={getBreadcrumbItems()}
              style={{ fontSize: 13 }}
            />
          </div>

          {/* 右侧：预留插槽（可扩展搜索、通知等） */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} />
        </header>

        {/* ── 内容区域 ── */}
        <main
          key={contentKey}
          style={{
            padding: isMobile ? '16px 12px' : '24px 28px',
            flex: 1,
            overflow: 'auto',
            animation: 'mainContentFadeIn 0.28s ease-out both',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* 内容区域进入动画 keyframes（注入到 head，避免依赖外部 CSS） */}
      <style>{`
        @keyframes mainContentFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
