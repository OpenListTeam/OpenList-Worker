/**
 * 侧边栏导航 — 精致极简主义设计
 * 分组：文件 | 存储 | 用户 | 全局 | 任务 | 连接 | 分享 | 安全 | 关于
 *
 * 权限控制：
 * - 未登录(guest)：只显示文件管理（公共文件 + 媒体库）
 * - 普通用户(user)：文件管理 + 我的文件 + 个人设置 + 任务 + 分享
 * - 管理员(admin)：显示所有菜单
 */
import React, { useMemo } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Tooltip, Badge } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  DatabaseOutlined,
  UserOutlined,
  SettingOutlined,
  CloudSyncOutlined,
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
  VideoCameraOutlined,
  CustomerServiceOutlined,
  PictureOutlined,
  ReadOutlined,
  IdcardOutlined,
  SecurityScanOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSidebarStore, useAuthStore, useThemeStore, useLangStore } from '../store';
import type { MenuProps } from 'antd';

const { Sider } = Layout;
const { Text } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

// 工具图标按钮组件
const IconBtn: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  isDark: boolean;
}> = ({ icon, title, onClick, active, isDark }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <Tooltip title={title} placement="right">
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          background: active
            ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.15))'
            : hovered
              ? isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              : 'transparent',
          color: active ? '#60A5FA' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
          border: active ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
          transform: hovered ? 'translateY(-1px)' : 'none',
          boxShadow: hovered && !active ? (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)') : 'none',
          fontSize: 15,
        }}
      >
        {icon}
      </div>
    </Tooltip>
  );
};

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
  const isDark = themeMode === 'dark' || themeMode === 'transparent';

  // 基于用户角色构建菜单
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];

    const fileChildren: MenuItem[] = [
      { key: '/files', icon: <FolderOpenOutlined />, label: '公共文件' },
    ];
    if (_isLoggedIn) {
      fileChildren.push({ key: '/files/my', icon: <FolderOutlined />, label: '我的文件' });
    }
    fileChildren.push(
      { type: 'divider' },
      { key: '/media/video', icon: <VideoCameraOutlined />, label: '视频影音' },
      { key: '/media/music', icon: <CustomerServiceOutlined />, label: '音乐音频' },
      { key: '/media/image', icon: <PictureOutlined />, label: '照片图片' },
      { key: '/media/books', icon: <ReadOutlined />, label: '书籍报刊' },
    );
    items.push({ key: 'files-group', icon: <FolderOutlined />, label: '文件管理', children: fileChildren });

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

    if (_isAdmin) {
      items.push({ type: 'divider' });
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
      items.push({
        key: 'security-group',
        icon: <LockOutlined />,
        label: t('sidebar.security'),
        children: [
          { key: '/admin/crypt-settings', icon: <SecurityScanOutlined />, label: '加密设置' },
          { key: '/user/crypt', icon: <LockOutlined />, label: t('sidebar.cryptManage') },
        ],
      });
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
    items.push({
      key: 'sharing-group',
      icon: <ShareAltOutlined />,
      label: t('sidebar.sharing'),
      children: _isAdmin
        ? [
            { key: '/admin/share-settings', icon: <SettingOutlined />, label: t('sidebar.shareSettings') },
            { key: '/user/shares', icon: <ShareAltOutlined />, label: t('sidebar.shareManage') },
          ]
        : [{ key: '/user/shares', icon: <ShareAltOutlined />, label: t('sidebar.shareManage') }],
    });
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
  }, [t, _isAdmin, _isGuest, _isLoggedIn]);

  const selectedKeys = useMemo(() => [location.pathname], [location.pathname]);

  const defaultOpenKeys = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/files') || path.startsWith('/media')) return ['files-group'];
    if (path.startsWith('/user/profile') || path.startsWith('/user/password')) return ['personal-group'];
    if (path.startsWith('/admin/mount') || path.startsWith('/admin/path') || path.startsWith('/admin/index')) return ['storage-group'];
    if (path.startsWith('/admin/user') || path.startsWith('/admin/group') || path.startsWith('/admin/auth')) return ['users-group'];
    if (path.startsWith('/admin/site') || path.startsWith('/admin/appear') || path.startsWith('/admin/backup')) return ['global-group'];
    if (path.startsWith('/user/task') || path.startsWith('/user/offline') || path.startsWith('/user/upload') || path.startsWith('/user/cloud')) return ['tasks-group'];
    if (path.startsWith('/admin/share') || path.startsWith('/user/share')) return ['sharing-group'];
    if (path.startsWith('/user/crypt') || path.startsWith('/admin/crypt')) return ['security-group'];
    if (path.startsWith('/about') || path.startsWith('/help')) return ['about-group'];
    return ['files-group'];
  }, [location.pathname]);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === '/homepage') { window.open('https://github.com/OpenListTeam', '_blank'); return; }
    navigate(key);
  };

  const userMenuItems: MenuProps['items'] = _isLoggedIn ? [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息', onClick: () => navigate('/user/profile') },
    { key: 'password', icon: <KeyOutlined />, label: '修改密码', onClick: () => navigate('/user/password') },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: t('common.logout'), danger: true, onClick: () => { logout(); navigate('/login'); } },
  ] : [
    { key: 'login', icon: <LoginOutlined />, label: '登录', onClick: () => navigate('/login') },
  ];

  const nextTheme = () => {
    const modes: Array<'light' | 'dark' | 'transparent'> = ['light', 'dark', 'transparent'];
    setThemePreference(modes[(modes.indexOf(themeMode) + 1) % modes.length]);
  };

  const themeIcon = themeMode === 'dark' ? <MoonOutlined /> : themeMode === 'transparent' ? <BgColorsOutlined /> : <SunOutlined />;
  const themeLabel = themeMode === 'dark' ? '深色模式' : themeMode === 'transparent' ? '透明模式' : '浅色模式';

  // 边框颜色
  const borderColor = themeMode === 'transparent'
    ? 'rgba(255,255,255,0.07)'
    : themeMode === 'dark' ? '#2D3039' : '#EAECF0';

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={260}
      collapsedWidth={72}
      breakpoint="lg"
      onBreakpoint={(broken) => { if (broken) useSidebarStore.getState().setCollapsed(true); }}
      style={{
        height: '100%',
        borderRight: `1px solid ${borderColor}`,
        backdropFilter: themeMode === 'transparent' ? 'blur(24px) saturate(200%)' : undefined,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Logo 区域 ── */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0' : '0 18px',
        borderBottom: `1px solid ${borderColor}`,
        transition: 'all 0.3s',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 顶部装饰光晕（仅深色/透明模式） */}
        {isDark && (
          <div style={{
            position: 'absolute',
            top: -20, left: collapsed ? '50%' : 18,
            transform: collapsed ? 'translateX(-50%)' : 'none',
            width: 80, height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}

        {/* Logo 图标 */}
        <div style={{
          width: 36, height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
          position: 'relative',
          zIndex: 1,
        }}>
          <FolderOutlined style={{ fontSize: 18, color: '#fff' }} />
        </div>

        {/* Logo 文字 */}
        {!collapsed && (
          <div style={{ marginLeft: 11, position: 'relative', zIndex: 1 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
              display: 'block',
            }}>
              OpenList
            </span>
            <span style={{
              fontSize: 10,
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1,
              display: 'block',
              marginTop: 2,
            }}>
              File Manager
            </span>
          </div>
        )}
      </div>

      {/* ── 导航菜单 ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: 6,
        paddingBottom: 6,
        scrollbarWidth: 'thin',
        scrollbarColor: isDark ? 'rgba(255,255,255,0.1) transparent' : 'rgba(0,0,0,0.1) transparent',
      }}>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={collapsed ? [] : defaultOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none', padding: '0 8px', background: 'transparent' }}
        />
      </div>

      {/* ── 底部工具栏 ── */}
      <div style={{
        borderTop: `1px solid ${borderColor}`,
        padding: collapsed ? '10px 0' : '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flexShrink: 0,
      }}>
        {/* 工具按钮行 */}
        <div style={{
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 2,
        }}>
          <IconBtn
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            title={collapsed ? '展开菜单' : '收起菜单'}
            onClick={toggleCollapsed}
            isDark={isDark}
          />
          {!collapsed && (
            <>
              <IconBtn
                icon={themeIcon}
                title={themeLabel}
                onClick={nextTheme}
                isDark={isDark}
              />
              <IconBtn
                icon={<GlobalOutlined />}
                title={language === 'en-US' ? '切换为中文' : 'Switch to English'}
                onClick={() => {
                  const newLang = language === 'en-US' ? 'zh-CN' : 'en-US';
                  setLanguage(newLang);
                  import('i18next').then(i18n => i18n.default.changeLanguage(newLang));
                }}
                isDark={isDark}
              />
            </>
          )}
        </div>

        {/* 用户信息卡片 */}
        {_isLoggedIn ? (
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="topRight" getPopupContainer={() => document.body} overlayStyle={{ zIndex: 20000 }}>
            <div
              className="sidebar-user-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: collapsed ? '7px 0' : '8px 10px',
                borderRadius: 11,
                cursor: 'pointer',
                justifyContent: collapsed ? 'center' : 'flex-start',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)';
                e.currentTarget.style.borderColor = isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
              }}
            >
              {/* 头像 */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar
                  size={collapsed ? 34 : 30}
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    fontSize: collapsed ? 14 : 12,
                    fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {user?.users_name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                {/* 在线状态点 */}
                <span style={{
                  position: 'absolute',
                  bottom: 0, right: 0,
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: '#10B981',
                  border: `2px solid ${isDark ? '#1A1D23' : '#fff'}`,
                }} />
              </div>

              {!collapsed && (
                <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Text strong ellipsis style={{
                      display: 'block',
                      fontSize: 13,
                      lineHeight: '17px',
                      color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.85)',
                      maxWidth: 100,
                    }}>
                      {user?.users_name || 'User'}
                    </Text>
                    {/* 角色徽章 */}
                    {_isAdmin && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
                        border: '1px solid rgba(245,158,11,0.25)',
                        fontSize: 10,
                        color: '#F59E0B',
                        fontWeight: 600,
                        lineHeight: '14px',
                        flexShrink: 0,
                      }}>
                        <CrownOutlined style={{ fontSize: 9 }} />
                        Admin
                      </span>
                    )}
                  </div>
                  <Text style={{
                    fontSize: 11,
                    lineHeight: '14px',
                    color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                    display: 'block',
                  }}>
                    {_isAdmin ? '系统管理员' : '普通用户'}
                  </Text>
                </div>
              )}
            </div>
          </Dropdown>
        ) : (
          /* 未登录状态 */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: collapsed ? '7px 0' : '8px 10px',
              borderRadius: 11,
              cursor: 'pointer',
              justifyContent: collapsed ? 'center' : 'flex-start',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onClick={() => navigate('/login')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)';
              e.currentTarget.style.borderColor = isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
              e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
            }}
          >
            <Avatar
              size={collapsed ? 34 : 30}
              icon={<LoginOutlined />}
              style={{
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                flexShrink: 0,
              }}
            />
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <Text strong style={{
                  display: 'block', fontSize: 13, lineHeight: '17px',
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                }}>
                  未登录
                </Text>
                <Text style={{
                  fontSize: 11, lineHeight: '14px',
                  color: '#3B82F6',
                  display: 'block',
                }}>
                  点击登录 →
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
