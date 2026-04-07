/**
 * 侧边栏导航 — 基于系统结构设置文档
 * 分组：文件 | 存储 | 用户 | 全局 | 任务 | 连接 | 分享 | 安全 | 关于
 * 
 * 权限控制：
 * - 未登录(guest)：只显示文件管理（公共文件 + 媒体库）
 * - 普通用户(user)：文件管理 + 我的文件 + 个人设置 + 任务 + 分享
 * - 管理员(admin)：显示所有菜单
 */
import React, { useMemo } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Tooltip, Button } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
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
  LoginOutlined,
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
  BgColorsOutlined,
  SaveOutlined,
  FundProjectionScreenOutlined,
  QuestionCircleOutlined,
  HomeOutlined,
  LinkOutlined,
  VideoCameraOutlined,
  CustomerServiceOutlined,
  PictureOutlined,
  ReadOutlined,
  IdcardOutlined,
  SecurityScanOutlined,
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
  const { user, logout, isAuthenticated, isAdmin, isGuest } = useAuthStore();
  const { themeMode, setThemePreference } = useThemeStore();
  const { language, setLanguage } = useLangStore();

  const _isAdmin = isAdmin();
  const _isGuest = isGuest();
  const _isLoggedIn = isAuthenticated;

  // 基于用户角色构建菜单
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];

    // ═══════════ 文件管理（所有用户可见，下拉菜单） ═══════════
    const fileChildren: MenuItem[] = [
      { key: '/files', icon: <FolderOpenOutlined />, label: '公共文件' },
    ];

    // 登录用户可见：我的文件
    if (_isLoggedIn) {
      fileChildren.push(
        { key: '/files/my', icon: <FolderOutlined />, label: '我的文件' },
      );
    }

    // 媒体库（所有用户可见）
    fileChildren.push(
      { type: 'divider' },
      { key: '/media/video', icon: <VideoCameraOutlined />, label: '视频影音' },
      { key: '/media/music', icon: <CustomerServiceOutlined />, label: '音乐音频' },
      { key: '/media/image', icon: <PictureOutlined />, label: '照片图片' },
      { key: '/media/books', icon: <ReadOutlined />, label: '书籍报刊' },
    );

    items.push({
      key: 'files-group',
      icon: <FolderOutlined />,
      label: '文件管理',
      children: fileChildren,
    });

    // 未登录用户到此为止
    if (_isGuest) {
      items.push({ type: 'divider' });
      items.push({
        key: 'about-group',
        icon: <InfoCircleOutlined />,
        label: t('sidebar.about'),
        children: [
          { key: '/about', icon: <InfoCircleOutlined />, label: t('sidebar.aboutSite') },
          { key: '/help', icon: <QuestionCircleOutlined />, label: t('sidebar.helpDoc') },
          { key: '/homepage', icon: <HomeOutlined />, label: t('sidebar.homepage') },
        ],
      });
      return items;
    }

    // ═══════════ 以下仅登录用户可见 ═══════════

    // 普通用户：个人设置
    if (!_isAdmin) {
      items.push({ type: 'divider' });
      items.push({
        key: 'personal-group',
        icon: <IdcardOutlined />,
        label: '个人设置',
        children: [
          { key: '/user/profile', icon: <UserOutlined />, label: '个人信息' },
          { key: '/user/password', icon: <KeyOutlined />, label: '修改密码' },
        ],
      });
    }

    // ═══════════ 以下仅管理员可见 ═══════════
    if (_isAdmin) {
      items.push({ type: 'divider' });

      // ═══════════ 存储 ═══════════
      items.push({
        key: 'storage-group',
        icon: <DatabaseOutlined />,
        label: t('sidebar.storage'),
        children: [
          { key: '/admin/mounts', icon: <CloudSyncOutlined />, label: t('sidebar.storageManage') },
          { key: '/admin/path-rules', icon: <NodeIndexOutlined />, label: t('sidebar.pathRules') },
          { key: '/admin/path-manage', icon: <AppstoreOutlined />, label: t('sidebar.pathManage') },
          { key: '/admin/index-manage', icon: <FundProjectionScreenOutlined />, label: t('sidebar.indexManage') },
        ],
      });

      // ═══════════ 用户 ═══════════
      items.push({
        key: 'users-group',
        icon: <TeamOutlined />,
        label: t('sidebar.users'),
        children: [
          { key: '/admin/users', icon: <UserOutlined />, label: t('sidebar.userManage') },
          { key: '/admin/groups', icon: <SafetyCertificateOutlined />, label: t('sidebar.groupManage') },
          { key: '/admin/auth', icon: <KeyOutlined />, label: t('sidebar.authManage') },
        ],
      });

      // ═══════════ 全局 ═══════════
      items.push({
        key: 'global-group',
        icon: <SettingOutlined />,
        label: t('sidebar.global'),
        children: [
          { key: '/admin/site-settings', icon: <SettingOutlined />, label: t('sidebar.siteSettings') },
          { key: '/admin/appearance', icon: <BgColorsOutlined />, label: t('sidebar.appearance') },
          { key: '/admin/backup', icon: <SaveOutlined />, label: t('sidebar.backupRestore') },
        ],
      });

      // ═══════════ 安全 ═══════════
      items.push({
        key: 'security-group',
        icon: <LockOutlined />,
        label: t('sidebar.security'),
        children: [
          { key: '/admin/crypt-settings', icon: <SecurityScanOutlined />, label: '加密设置' },
          { key: '/user/crypt', icon: <LockOutlined />, label: t('sidebar.cryptManage') },
        ],
      });

      // 管理员也有个人设置
      items.push({
        key: 'personal-group',
        icon: <IdcardOutlined />,
        label: '个人设置',
        children: [
          { key: '/user/profile', icon: <UserOutlined />, label: '个人信息' },
          { key: '/user/password', icon: <KeyOutlined />, label: '修改密码' },
        ],
      });
    }

    // ═══════════ 任务（登录用户可见） ═══════════
    items.push({
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
    });

    // ═══════════ 分享（登录用户可见） ═══════════
    items.push({
      key: 'sharing-group',
      icon: <ShareAltOutlined />,
      label: t('sidebar.sharing'),
      children: _isAdmin
        ? [
            { key: '/admin/share-settings', icon: <SettingOutlined />, label: t('sidebar.shareSettings') },
            { key: '/user/shares', icon: <ShareAltOutlined />, label: t('sidebar.shareManage') },
          ]
        : [
            { key: '/user/shares', icon: <ShareAltOutlined />, label: t('sidebar.shareManage') },
          ],
    });

    items.push({ type: 'divider' });

    // ═══════════ 关于 ═══════════
    items.push({
      key: 'about-group',
      icon: <InfoCircleOutlined />,
      label: t('sidebar.about'),
      children: [
        { key: '/about', icon: <InfoCircleOutlined />, label: t('sidebar.aboutSite') },
        { key: '/help', icon: <QuestionCircleOutlined />, label: t('sidebar.helpDoc') },
        { key: '/homepage', icon: <HomeOutlined />, label: t('sidebar.homepage') },
      ],
    });

    return items;
  }, [t, _isAdmin, _isGuest, _isLoggedIn]);

  // 选中的菜单项
  const selectedKeys = useMemo(() => {
    const path = location.pathname;
    return [path];
  }, [location.pathname]);

  // 默认展开的菜单组
  const defaultOpenKeys = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/files') || path.startsWith('/media'))
      return ['files-group'];
    if (path.startsWith('/user/profile') || path.startsWith('/user/password'))
      return ['personal-group'];
    if (path.startsWith('/admin/mount') || path.startsWith('/admin/path') || path.startsWith('/admin/index'))
      return ['storage-group'];
    if (path.startsWith('/admin/user') || path.startsWith('/admin/group') || path.startsWith('/admin/auth'))
      return ['users-group'];
    if (path.startsWith('/admin/site') || path.startsWith('/admin/appear') || path.startsWith('/admin/backup'))
      return ['global-group'];
    if (path.startsWith('/user/task') || path.startsWith('/user/offline') || path.startsWith('/user/upload') || path.startsWith('/user/cloud'))
      return ['tasks-group'];
    if (path.startsWith('/admin/share') || path.startsWith('/user/share'))
      return ['sharing-group'];
    if (path.startsWith('/user/crypt') || path.startsWith('/admin/crypt'))
      return ['security-group'];
    if (path.startsWith('/about') || path.startsWith('/help'))
      return ['about-group'];
    return ['files-group'];
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
  const userMenuItems: MenuProps['items'] = _isLoggedIn ? [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/user/profile'),
    },
    {
      key: 'password',
      icon: <KeyOutlined />,
      label: '修改密码',
      onClick: () => navigate('/user/password'),
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
  ] : [
    {
      key: 'login',
      icon: <LoginOutlined />,
      label: '登录',
      onClick: () => navigate('/login'),
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
          <Tooltip title={collapsed ? '展开菜单' : '收起菜单'} placement="right">
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

        {/* 用户信息 / 登录按钮 */}
        {_isLoggedIn ? (
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
                    {_isAdmin ? '管理员' : '普通用户'}
                  </Text>
                </div>
              )}
            </div>
          </Dropdown>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'background 0.2s',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            onClick={() => navigate('/login')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = themeMode === 'light'
                ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Avatar
              size={collapsed ? 36 : 32}
              icon={<LoginOutlined />}
              style={{
                background: '#8c8c8c',
                flexShrink: 0,
              }}
            />
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <Text strong style={{ display: 'block', fontSize: 13, lineHeight: '18px' }}>
                  未登录
                </Text>
                <Text type="secondary" style={{ fontSize: 11, lineHeight: '14px' }}>
                  点击登录
                </Text>
              </div>
            )}
          </div>
        )}
      </div>
    </Sider>
  );
};

export default AppSidebar;
