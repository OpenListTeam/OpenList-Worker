import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Menu,
  Avatar,
  Button,
  Switch,
  Typography,
  Progress,
  Dropdown,
  Tooltip,
  Divider,
  Space,
} from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  ShareAltOutlined,
  FolderOpenOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  CloudDownloadOutlined,
  CloudOutlined,
  UserOutlined,
  TeamOutlined,
  KeyOutlined,
  SettingOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  MoonOutlined,
  SunOutlined,
  LoginOutlined,
  UserAddOutlined,
  LogoutOutlined,
  MoreOutlined,
  MailOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';

interface SidebarMenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  path: string;
}

interface MenuGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: SidebarMenuItem[];
  defaultExpanded?: boolean;
}

interface GroupedSidebarProps {
  darkMode: boolean;
  onDarkModeToggle: () => void;
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const GroupedSidebar: React.FC<GroupedSidebarProps> = ({
  darkMode,
  onDarkModeToggle,
  open,
  onClose,
  isMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const logout = useAuthStore(state => state.logout);
  const isAuthenticated = !!token && !!user;

  // 定义菜单分组数据
  const menuGroups: MenuGroup[] = [
    {
      id: 'file-management',
      title: '文件管理',
      icon: <FolderOutlined />,
      defaultExpanded: true,
      items: [
        { id: 'public-directory', title: '公共目录', icon: <FolderOutlined />, path: '/' },
        { id: 'my-files', title: '我的文件', icon: <FileOutlined />, path: '/@pages/myfile' },
        { id: 'my-shares', title: '我的分享', icon: <ShareAltOutlined />, path: '/@pages/my-shares' },
      ],
    },
    {
      id: 'personal-settings',
      title: '个人设置',
      icon: <UserOutlined />,
      defaultExpanded: false,
      items: [
        { id: 'account-settings', title: '账号设置', icon: <UserOutlined />, path: '/@pages/account-settings' },
      ],
    },
    {
      id: 'storage-management',
      title: '存储管理',
      icon: <DatabaseOutlined />,
      defaultExpanded: false,
      items: [
        { id: 'mount-management', title: '挂载管理', icon: <CloudOutlined />, path: '/@pages/mount-management' },
        { id: 'mates-config', title: '目录配置', icon: <FolderOpenOutlined />, path: '/@pages/mates-config' },
        { id: 'crypt-config', title: '加密配置', icon: <SafetyCertificateOutlined />, path: '/@pages/crypt-config' },
      ],
    },
    {
      id: 'user-management',
      title: '用户管理',
      icon: <TeamOutlined />,
      defaultExpanded: false,
      items: [
        { id: 'user-management', title: '用户管理', icon: <TeamOutlined />, path: '/@pages/user-management' },
        { id: 'group-management', title: '分组管理', icon: <CrownOutlined />, path: '/@pages/group-management' },
        { id: 'oauth-management', title: '三方登录', icon: <KeyOutlined />, path: '/@pages/oauth-management' },
      ],
    },
    {
      id: 'setup-settings',
      title: '系统设置',
      icon: <SettingOutlined />,
      defaultExpanded: false,
      items: [
        { id: 'site-settings', title: '站点设置', icon: <GlobalOutlined />, path: '/@pages/site-settings' },
        { id: 'about-platform', title: '关于平台', icon: <InfoCircleOutlined />, path: '/@pages/about-platform' },
      ],
    },
  ];

  // 构建 Antd Menu items
  const menuItems: MenuProps['items'] = menuGroups.map((group) => ({
    key: group.id,
    icon: group.icon,
    label: group.title,
    children: group.items.map((item) => ({
      key: item.path,
      icon: item.icon,
      label: item.title,
    })),
  }));

  // 默认展开的分组
  const defaultOpenKeys = menuGroups
    .filter((g) => g.defaultExpanded)
    .map((g) => g.id);

  // 当前选中的菜单项
  const selectedKeys = [location.pathname];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
    if (isMobile) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  // 用户下拉菜单
  const userDropdownItems: MenuProps['items'] = [
    {
      key: 'account-settings',
      icon: <UserOutlined />,
      label: '账号设置',
      onClick: () => navigate('/@pages/account-settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];

  // 渲染用户信息区域
  const renderUserSection = () => {
    if (isAuthenticated && user) {
      return (
        <div style={{ padding: '12px 16px' }}>
          <Dropdown menu={{ items: userDropdownItems }} trigger={['click']} placement="bottomRight">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
              }}
            >
              <Avatar
                size={40}
                style={{ marginRight: 10, flexShrink: 0 }}
              >
                {(user.users_name || 'U').charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text
                  strong
                  ellipsis
                  style={{ display: 'block', fontSize: 14, lineHeight: 1.3 }}
                >
                  {user.users_name}
                </Typography.Text>
                <Space size={4} style={{ marginTop: 4 }}>
                  <Tooltip title={user.users_mail}>
                    <MailOutlined style={{ fontSize: 14, color: '#999', cursor: 'pointer' }} />
                  </Tooltip>
                  <Tooltip title="个人设置">
                    <SettingOutlined
                      style={{ fontSize: 14, color: '#999', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/@pages/account-settings');
                      }}
                    />
                  </Tooltip>
                </Space>
              </div>
              <MoreOutlined style={{ fontSize: 16, color: '#999', marginLeft: 4 }} />
            </div>
          </Dropdown>
        </div>
      );
    } else {
      return (
        <div style={{ padding: '12px 16px' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Button
              type="primary"
              block
              icon={<LoginOutlined />}
              onClick={handleLogin}
              style={{ borderRadius: 12, height: 38 }}
            >
              登录
            </Button>
            <Button
              block
              icon={<UserAddOutlined />}
              onClick={handleRegister}
              style={{ borderRadius: 12, height: 38 }}
            >
              注册
            </Button>
          </Space>
        </div>
      );
    }
  };

  // 侧边栏宽度
  const sidebarWidth = isMobile ? 280 : 220;

  const sidebarContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo 区域 */}
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src="https://res.oplist.org/logo/120x120.webp"
          alt="logo"
          style={{ width: 40, height: 40, marginRight: 8 }}
        />
        <Typography.Title level={4} style={{ margin: 0 }}>
          OpenList
        </Typography.Title>
      </div>

      <Divider style={{ margin: 0 }} />

      {/* 用户信息区域 */}
      {renderUserSection()}

      <Divider style={{ margin: 0 }} />

      {/* 菜单分组区域 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={defaultOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            background: 'transparent',
          }}
        />
      </div>

      {/* 底部区域 */}
      <div style={{ padding: '12px 16px' }}>
        {/* 主题切换 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Space size={8}>
            {darkMode ? (
              <MoonOutlined style={{ fontSize: 16 }} />
            ) : (
              <SunOutlined style={{ fontSize: 16 }} />
            )}
            <Typography.Text style={{ fontSize: 14 }}>深色模式</Typography.Text>
          </Space>
          <Switch checked={darkMode} onChange={onDarkModeToggle} size="small" />
        </div>

        {/* 存储空间显示 */}
        <div
          style={{
            backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <Typography.Text style={{ fontSize: 13 }}>存储空间</Typography.Text>
          <Progress percent={50} showInfo={false} size="small" style={{ margin: '6px 0 4px' }} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            5GB / 10GB
          </Typography.Text>
        </div>
      </div>
    </div>
  );

  // 如果是桌面端且侧边栏关闭，则不渲染
  if (!isMobile && !open) {
    return null;
  }

  // 移动端使用 Drawer，桌面端直接渲染
  if (isMobile) {
    return (
      <Drawer
        placement="left"
        open={open}
        onClose={onClose}
        width={sidebarWidth}
        closable={false}
        styles={{
          body: { padding: 0 },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // 桌面端 - 固定侧边栏
  return (
    <div
      style={{
        width: sidebarWidth,
        height: 'calc(100vh - 18px)',
        flexShrink: 0,
        margin: '8px 22px 10px 8px',
        borderRadius: 15,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        background: darkMode ? '#141414' : '#fff',
      }}
    >
      {sidebarContent}
    </div>
  );
};

export default GroupedSidebar;