import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  LinearProgress,
  Collapse,
  ListItemButton,
  Switch,
  FormControlLabel,
  Avatar,
  Button,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import {
  // 文件管理图标
  Folder,
  InsertDriveFile,
  Share,
  // 目录管理图标
  FolderSpecial,
  Security,
  // 任务管理图标
  Assignment,
  CloudDownload,
  // 个人设置图标
  Cloud,
  AccountCircle,
  // 系统管理图标
  AdminPanelSettings,
  Group,
  VpnKey,
  Settings,
  Palette,
  Visibility,
  Language,
  Backup,
  Info,
  // 展开收起图标
  ExpandLess,
  ExpandMore,
  DarkMode,
  LightMode,
  // 用户相关图标
  Login,
  PersonAdd,
  Logout,
  MoreVert
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from './AppContext.tsx';

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  path: string;
}

interface MenuGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: MenuItem[];
  defaultExpanded?: boolean;
}

interface GroupedSidebarProps {
  darkMode: boolean;
  onDarkModeToggle: () => void;
}

const GroupedSidebar: React.FC<GroupedSidebarProps> = ({ darkMode, onDarkModeToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, logout } = useApp();
  
  // 用户菜单状态
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // 定义菜单分组数据
  const menuGroups: MenuGroup[] = [
    {
      id: 'file-management',
      title: '文件管理',
      icon: <Folder />,
      defaultExpanded: true,
      items: [
        { id: 'public-directory', title: '公共目录', icon: <Folder />, path: '/' },
        { id: 'my-files', title: '我的文件', icon: <InsertDriveFile />, path: '/@pages/myfile' },
        { id: 'my-shares', title: '我的分享', icon: <Share />, path: '/@pages/my-shares' }
      ]
    },
    {
      id: 'directory-management',
      title: '目录管理',
      icon: <FolderSpecial />,
      defaultExpanded: true,
      items: [
        { id: 'mates-config', title: '目录配置', icon: <FolderSpecial />, path: '/@pages/mates-config' },
        { id: 'crypt-config', title: '加密配置', icon: <Security />, path: '/@pages/crypt-config' }
      ]
    },
    {
      id: 'task-management',
      title: '任务管理',
      icon: <Assignment />,
      defaultExpanded: true,
      items: [
        { id: 'task-config', title: '任务管理', icon: <Assignment />, path: '/@pages/task-config' },
        { id: 'offline-download', title: '离线下载', icon: <CloudDownload />, path: '/@pages/offline-download' }
      ]
    },
    {
      id: 'personal-settings',
      title: '个人设置',
      icon: <AccountCircle />,
      defaultExpanded: true,
      items: [
        { id: 'connection-config', title: '挂载连接', icon: <Cloud />, path: '/@pages/connection-config' },
        { id: 'account-settings', title: '账号设置', icon: <AccountCircle />, path: '/@pages/account-settings' }
      ]
    },
    {
      id: 'system-management',
      title: '系统管理',
      icon: <AdminPanelSettings />,
      defaultExpanded: true,
      items: [
        // 挂载管理（无子菜单）
        { id: 'mount-management', title: '挂载管理', icon: <Cloud />, path: '/@pages/mount-management' }
      ]
    },
    {
      id: 'user-management',
      title: '用户管理',
      icon: <Group />,
      defaultExpanded: true,
      items: [
        { id: 'user-management', title: '用户管理', icon: <Group />, path: '/@pages/user-management' },
        { id: 'group-management', title: '分组管理', icon: <AdminPanelSettings />, path: '/@pages/group-management' },
        { id: 'oauth-management', title: '三方登录', icon: <VpnKey />, path: '/@pages/oauth-management' }
      ]
    },
    {
      id: 'system-settings',
      title: '系统设置',
      icon: <Settings />,
      defaultExpanded: true,
      items: [
        { id: 'site-settings', title: '站点设置', icon: <Language />, path: '/@pages/site-settings' }
      ]
    },
    {
      id: 'more-settings',
      title: '更多设置',
      icon: <Settings />,
      defaultExpanded: true,
      items: [
        { id: 'about-platform', title: '关于平台', icon: <Info />, path: '/@pages/about-platform' }
      ]
    }
  ];

  // 管理每个分组的展开状态
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    menuGroups.reduce((acc, group) => {
      acc[group.id] = group.defaultExpanded || false;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const handleGroupToggle = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // 用户菜单处理函数
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const getPageTitle = () => {
    for (const group of menuGroups) {
      const item = group.items.find(item => item.path === location.pathname);
      if (item) return item.title;
    }
    return 'OpenList';
  };

  // 渲染用户信息区域
  const renderUserSection = () => {
    if (state.isAuthenticated && state.user) {
      // 已登录状态
      return (
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'action.hover',
              borderRadius: '16px',
              p: 1.5,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.selected',
              },
            }}
            onClick={handleUserMenuOpen}
          >
            <Avatar
              src={state.user.avatar}
              alt={state.user.username}
              sx={{ width: 40, height: 40, mr: 1.5 }}
            >
              {state.user.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight="medium"
                noWrap
                sx={{ lineHeight: 1.2 }}
              >
                {state.user.username}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ lineHeight: 1.2 }}
              >
                {state.user.email}
              </Typography>
            </Box>
            <IconButton size="small" sx={{ ml: 0.5 }}>
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>

          {/* 用户菜单 */}
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={() => { handleUserMenuClose(); navigate('/@pages/account-settings'); }}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              <ListItemText>账号设置</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>退出登录</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      );
    } else {
      // 未登录状态
      return (
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<Login />}
              onClick={handleLogin}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 'medium'
              }}
            >
              登录
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PersonAdd />}
              onClick={handleRegister}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 'medium'
              }}
            >
              注册
            </Button>
          </Box>
        </Box>
      );
    }
  };

  const renderMenuGroup = (group: MenuGroup) => (
    <Box key={group.id}>
      <ListItemButton 
        onClick={() => handleGroupToggle(group.id)}
        sx={{
          borderRadius: '20px',
          margin: '4px 8px',
          backgroundColor: 'transparent',
          width: '180px',
          maxWidth: '180px',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          {group.icon}
        </ListItemIcon>
        <ListItemText 
          primary={group.title}
          primaryTypographyProps={{ 
            fontSize: '0.9rem',
            fontWeight: 'medium',
            width: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        />
        {expandedGroups[group.id] ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={expandedGroups[group.id]} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {group.items.map((item) => (
            <ListItem
              key={item.id}
              onClick={() => handleMenuClick(item.path)}
              sx={{
                backgroundColor: isActive(item.path) ? 'primary.light' : 'transparent',
                borderRadius: '20px',
                margin: '2px 10px',
                cursor: 'pointer',
                pl: 2,
                pr: 2,
                width: '180px',
                maxWidth: '180px',
                '&:hover': {
                  backgroundColor: isActive(item.path) ? 'primary.light' : 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.title}
                primaryTypographyProps={{ 
                  fontSize: '0.875rem',
                  width: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 220,
        height: 'calc(100vh - 10px)',
        flexShrink: 0,
        marginBottom: '10px',
        '& .MuiDrawer-paper': {
          width: 220,
          height: 'calc(100% - 18px)',
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
          borderRadius: '30px',
          margin: '8px 22px 0px 8px',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
      }}
    >
      {/* Logo 区域 */}
      <Box sx={{
        p: 2,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img
          src="https://res.oplist.org/logo/120x120.webp"
          alt="logo"
          style={{ width: '40px', height: '40px', marginRight: '8px' }}
        />
        <Typography variant="h6">OpenList</Typography>
      </Box>
      
      <Divider />

      {/* 用户信息区域 */}
      {renderUserSection()}
      
      <Divider />

      {/* 菜单分组区域 */}
      <List sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        {menuGroups.map((group) => renderMenuGroup(group))}
      </List>

      {/* 底部区域 */}
      <Box sx={{ p: 2 }}>
        {/* 主题切换 */}
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={(e) => onDarkModeToggle()}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {darkMode ? <DarkMode sx={{ fontSize: 20 }} /> : <LightMode sx={{ fontSize: 20 }} />}
              深色模式
            </Box>
          }
          sx={{ mb: 2 }}
        />
        
        {/* 存储空间显示 */}
        <Box sx={{ backgroundColor: 'action.hover', borderRadius: '20px', p: 2 }}>
          <Typography variant="body2">存储空间</Typography>
          <LinearProgress variant="determinate" value={50} sx={{ mt: 1 }} />
          <Typography variant="caption">5GB / 10GB</Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default GroupedSidebar;