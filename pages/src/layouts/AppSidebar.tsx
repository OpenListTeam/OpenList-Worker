/**
 * 侧边栏导航 — 基于系统结构设置文档
 * 分组：文件 | 存储 | 用户 | 全局 | 任务 | 连接 | 分享 | 安全 | 关于
 */
import React, { useMemo } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Tooltip, Badge } from 'antd';
import {
  FolderOutlined,
  DatabaseOutlined,
  UserOutlined,
  SettingOutlined,
  CloudSyncOutlined,
  ApiOutlined,
  ShareAltOutlined,
  LockOutlined,
  InfoCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
  GlobalOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  CopyOutlined,
  SwapOutlined,
  FileZipOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  EyeInvisibleOutlined,
  BgColorsOutlined,
  SaveOutlined,
  FundProjectionScreenOutlined,
  QuestionCircleOutlined,
  HomeOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSidebarStore, useAuthStore, useThemeStore, useLangStore } from '../store';
import type { MenuProps } from 'antd';

const { Sider } = Layout;
const { Text } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

const AppSidebar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleCollapsed } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const { themeMode, setThemePreference } = useThemeStore();
  const { language, setLanguage } = useLangStore();

  // 基于系统结构设置文档构建菜单
  const menuItems: MenuItem[] = useMemo(() => [
    // ═══════════ 文件管理 ═══════════
    {
      key: '/files',
      icon: <FolderOutlined />,
      label: t('sidebar.files'),
    },

    { type: 'divider' },

    // ═══════════ 存储 ═══════════
    {
      key: 'storage-group',
      icon: <DatabaseOutlined />,
      label: t('sidebar.storage'),
      children: [
        { key: '/admin/mounts', icon: <CloudSyncOutlined />, label: t('sidebar.storageManage') },
        { key: '/admin/path-rules', icon: <NodeIndexOutlined />, label: t('sidebar.pathRules') },
        { key: '/admin/path-manage', icon: <AppstoreOutlined />, label: t('sidebar.pathManage') },
        { key: '/admin/index-manage', icon: <FundProjectionScreenOutlined />, label: t('sidebar.indexManage') },
      ],
    },

    // ═══════════ 用户 ═══════════
    {
      key: 'users-group',
      icon: <TeamOutlined />,
      label: t('sidebar.users'),
      children: [
        { key: '/admin/users', icon: <UserOutlined />, label: t('sidebar.userManage') },
        { key: '/admin/groups', icon: <SafetyCertificateOutlined />, label: t('sidebar.groupManage') },
        { key: '/admin/auth', icon: <KeyOutlined />, label: t('sidebar.authManage') },
        { key: '/admin/private-space', icon: <EyeInvisibleOutlined />, label: t('sidebar.privateSpace') },
      ],
    },

    // ═══════════ 全局 ═══════════
    {
      key: 'global-group',
      icon: <SettingOutlined />,
      label: t('sidebar.global'),
      children: [
        { key: '/admin/site-settings', icon: <SettingOutlined />, label: t('sidebar.siteSettings') },
        { key: '/admin/appearance', icon: <BgColorsOutlined />, label: t('sidebar.appearance') },
        { key: '/admin/backup', icon: <SaveOutlined />, label: t('sidebar.backupRestore') },
      ],
    },

    // ═══════════ 任务 ═══════════
    {
      key: 'tasks-group',
      icon: <CloudSyncOutlined />,
      label: t('sidebar.tasks'),
      children: [
        { key: '/user/tasks', icon: <CloudSyncOutlined />, label: t('sidebar.taskSettings') },
        { key: '/user/offline-download', icon: <CloudDownloadOutlined />, label: t('sidebar.offlineDownload') },
        { key: '/user/upload', icon: <CloudUploadOutlined />, label: t('sidebar.localUpload') },
        { key: '/user/cloud-copy', icon: <CopyOutlined />, label: t('sidebar.cloudCopy') },
        { key: '/user/cloud-move', icon: <SwapOutlined />, label: t('sidebar.cloudMove') },
        { key: '/user/cloud-extract', icon: <FileZipOutlined />, label: t('sidebar.cloudExtract') },
      ],
    },

    // ═══════════ 连接 ═══════════
    {
      key: 'connections-group',
      icon: <ApiOutlined />,
      label: t('sidebar.connections'),
      children: [
        { key: '/admin/ldap', icon: <LinkOutlined />, label: t('sidebar.ldap') },
        { key: '/admin/ftp', icon: <ApiOutlined />, label: t('sidebar.ftpSftp') },
        { key: '/admin/nfs', icon: <ApiOutlined />, label: t('sidebar.nfsDlna') },
        { key: '/admin/smb', icon: <ApiOutlined />, label: t('sidebar.smb') },
      ],
    },

    // ═══════════ 分享 ═══════════
    {
      key: 'sharing-group',
      icon: <ShareAltOutlined />,
      label: t('sidebar.sharing'),
      children: [
        { key: '/admin/share-settings', icon: <SettingOutlined />, label: t('sidebar.shareSettings') },
        { key: '/user/shares', icon: <ShareAltOutlined />, label: t('sidebar.shareManage') },
      ],
    },

    // ═══════════ 安全 ═══════════
    {
      key: 'security-group',
      icon: <LockOutlined />,
      label: t('sidebar.security'),
      children: [
        { key: '/user/crypt', icon: <LockOutlined />, label: t('sidebar.cryptManage') },
      ],
    },

    { type: 'divider' },

    // ═══════════ 关于 ═══════════
    {
      key: 'about-group',
      icon: <InfoCircleOutlined />,
      label: t('sidebar.about'),
      children: [
        { key: '/about', icon: <InfoCircleOutlined />, label: t('sidebar.aboutSite') },
        { key: '/help', icon: <QuestionCircleOutlined />, label: t('sidebar.helpDoc') },
        { key: '/homepage', icon: <HomeOutlined />, label: t('sidebar.homepage') },
      ],
    },
  ], [t]);

  // 选中的菜单项
  const selectedKeys = useMemo(() => {
    const path = location.pathname;
    return [path];
  }, [location.pathname]);

  // 默认展开的菜单组
  const defaultOpenKeys = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/admin/mount') || path.startsWith('/admin/path') || path.startsWith('/admin/index'))
      return ['storage-group'];
    if (path.startsWith('/admin/user') || path.startsWith('/admin/group') || path.startsWith('/admin/auth') || path.startsWith('/admin/private'))
      return ['users-group'];
    if (path.startsWith('/admin/site') || path.startsWith('/admin/appear') || path.startsWith('/admin/backup'))
      return ['global-group'];
    if (path.startsWith('/user/task') || path.startsWith('/user/offline') || path.startsWith('/user/upload') || path.startsWith('/user/cloud'))
      return ['tasks-group'];
    if (path.startsWith('/admin/ldap') || path.startsWith('/admin/ftp') || path.startsWith('/admin/nfs') || path.startsWith('/admin/smb'))
      return ['connections-group'];
    if (path.startsWith('/admin/share') || path.startsWith('/user/share'))
      return ['sharing-group'];
    if (path.startsWith('/user/crypt'))
      return ['security-group'];
    if (path.startsWith('/about') || path.startsWith('/help'))
      return ['about-group'];
    return [];
  }, [location.pathname]);

  // 菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === '/homepage') {
      window.open('https://github.com/OpenListTeam', '_blank');
      return;
    }
    navigate(key);
  };

  // 用户头像下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'account',
      icon: <UserOutlined />,
      label: t('user.accountSettings'),
      onClick: () => navigate('/user/account'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('common.logout'),
      danger: true,
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  // 主题切换
  const nextTheme = () => {
    const modes: Array<'light' | 'dark' | 'transparent'> = ['light', 'dark', 'transparent'];
    const idx = modes.indexOf(themeMode);
    setThemePreference(modes[(idx + 1) % modes.length]);
  };

  const themeIcon = themeMode === 'dark'
    ? <MoonOutlined />
    : themeMode === 'transparent'
      ? <BgColorsOutlined />
      : <SunOutlined />;

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={260}
      collapsedWidth={72}
      breakpoint="lg"
      onBreakpoint={(broken) => {
        if (broken) useSidebarStore.getState().setCollapsed(true);
      }}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        borderRight: themeMode === 'transparent'
          ? '1px solid rgba(255,255,255,0.06)'
          : themeMode === 'dark'
            ? '1px solid #2D3039'
            : '1px solid #E5E7EB',
        backdropFilter: themeMode === 'transparent' ? 'blur(20px) saturate(180%)' : undefined,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Logo区域 */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0' : '0 20px',
        borderBottom: themeMode === 'transparent'
          ? '1px solid rgba(255,255,255,0.06)'
          : themeMode === 'dark'
            ? '1px solid #2D3039'
            : '1px solid #F0F0F0',
        transition: 'all 0.3s',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
        }}>
          <FolderOutlined style={{ fontSize: 18, color: '#fff' }} />
        </div>
        {!collapsed && (
          <span style={{
            marginLeft: 12,
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            OpenList
          </span>
        )}
      </div>

      {/* 导航菜单 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        paddingTop: 8,
        paddingBottom: 8,
      }}>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={collapsed ? [] : defaultOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            padding: '0 8px',
          }}
        />
      </div>

      {/* 底部工具栏 */}
      <div style={{
        borderTop: themeMode === 'transparent'
          ? '1px solid rgba(255,255,255,0.06)'
          : themeMode === 'dark'
            ? '1px solid #2D3039'
            : '1px solid #F0F0F0',
        padding: collapsed ? '12px 0' : '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {/* 工具按钮行 */}
        <div style={{
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 4,
          paddingLeft: collapsed ? 0 : 4,
        }}>
          <Tooltip title={collapsed ? t('sidebar.files') : undefined} placement="right">
            <div
              onClick={toggleCollapsed}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
                opacity: 0.7,
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
          </Tooltip>
          {!collapsed && (
            <>
              <Tooltip title={t(`theme.${themeMode}`)}>
                <div
                  onClick={nextTheme}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background 0.2s', opacity: 0.7,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  {themeIcon}
                </div>
              </Tooltip>
              <Tooltip title="Language">
                <div
                  onClick={() => {
                    const newLang = language === 'en-US' ? 'zh-CN' : 'en-US';
                    setLanguage(newLang);
                    // 同步i18n语言切换（无需reload）
                    import('i18next').then(i18n => i18n.default.changeLanguage(newLang));
                  }}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background 0.2s', opacity: 0.7,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  <GlobalOutlined />
                </div>
              </Tooltip>
            </>
          )}
        </div>

        {/* 用户信息 */}
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="topRight">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'background 0.2s',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = themeMode === 'light'
                ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Avatar
              size={collapsed ? 36 : 32}
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                flexShrink: 0,
              }}
            >
              {user?.users_name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <Text strong ellipsis style={{ display: 'block', fontSize: 13, lineHeight: '18px' }}>
                  {user?.users_name || 'User'}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, lineHeight: '14px' }}>
                  {user?.users_mail || 'admin'}
                </Text>
              </div>
            )}
          </div>
        </Dropdown>
      </div>
    </Sider>
  );
};

export default AppSidebar;
