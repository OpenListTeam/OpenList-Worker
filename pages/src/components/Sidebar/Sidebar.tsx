import React from 'react';
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
  ListSubheader
} from '@mui/material';
import {
  Folder,
  InsertDriveFile,
  Share,
  Cloud,
  Settings,
  AccountCircle,
  Lock,
  Link,
  Assignment,
  Download,
  Group,
  VpnKey,
  Storage,
  AdminPanelSettings,
  Palette,
  Visibility,
  Extension,
  Backup,
  Info
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  darkMode: boolean;
  onDarkModeToggle: () => void;
}

const menuItems = {
  fileManagement: [
    { id: 'public-directory', title: '公共目录', icon: Folder, path: '/public-directory' },
    { id: 'my-files', title: '我的文件', icon: InsertDriveFile, path: '/my-files' },
  ],
  personalManagement: [
    { id: 'my-shares', title: '我的分享', icon: Share, path: '/my-shares' },
    { id: 'crypt-config', title: '加密配置', icon: Lock, path: '/crypt-config' },
    { id: 'mates-config', title: '元组配置', icon: Storage, path: '/mates-config' },
    { id: 'connection-config', title: '连接配置', icon: Link, path: '/connection-config' },
    { id: 'task-config', title: '任务配置', icon: Assignment, path: '/task-config' },
    { id: 'offline-download', title: '离线下载', icon: Download, path: '/offline-download' },
    { id: 'account-settings', title: '账号设置', icon: AccountCircle, path: '/account-settings' },
  ],
  systemManagement: [
    { id: 'mount-management', title: '挂载管理', icon: Cloud, path: '/mount-management' },
    { id: 'user-management', title: '用户管理', icon: Group, path: '/user-management' },
    { id: 'group-management', title: '分组管理', icon: AdminPanelSettings, path: '/group-management' },
    { id: 'oauth-management', title: '授权认证', icon: VpnKey, path: '/oauth-management' },
    { id: 'site-settings', title: '站点设置', icon: Settings, path: '/site-settings' },
    { id: 'global-settings', title: '全局设置', icon: Settings, path: '/global-settings' },
    { id: 'appearance-settings', title: '外观设置', icon: Palette, path: '/appearance-settings' },
    { id: 'preview-settings', title: '预览设置', icon: Visibility, path: '/preview-settings' },
    { id: 'plugin-management', title: '插件管理', icon: Extension, path: '/plugin-management' },
    { id: 'backup-restore', title: '备份恢复', icon: Backup, path: '/backup-restore' },
    { id: 'about-platform', title: '关于平台', icon: Info, path: '/about-platform' },
  ]
};

const Sidebar: React.FC<SidebarProps> = ({ darkMode, onDarkModeToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const renderMenuGroup = (title: string, items: any[]) => (
    <List
      subheader={
        <ListSubheader component="div" sx={{ backgroundColor: 'transparent', fontWeight: 'bold', color: 'text.primary' }}>
          {title}
        </ListSubheader>
      }
    >
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <ListItem
            key={item.id}
            onClick={() => handleMenuClick(item.path)}
            sx={{
              backgroundColor: isActive ? '#BAD5F1' : 'transparent',
              borderRadius: '20px',
              margin: '4px 8px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: isActive ? '#BAD5F1' : 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <IconComponent />
            </ListItemIcon>
            <ListItemText 
              primary={item.title} 
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </ListItem>
        );
      })}
    </List>
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          backgroundColor: '#F5F5F5',
          borderRadius: '30px',
          margin: '8px 24px 8px 8px',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 2, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img 
          src="https://res.oplist.org/logo/120x120.webp" 
          alt="logo" 
          style={{ width: '40px', height: '40px', marginRight: '8px' }} 
        />
        <Typography variant="h6">OpenList</Typography>
      </Box>
      
      <Divider />
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {renderMenuGroup('文件管理', menuItems.fileManagement)}
        
        <Divider sx={{ my: 1 }} />
        
        {renderMenuGroup('个人管理', menuItems.personalManagement)}
        
        <Divider sx={{ my: 1 }} />
        
        {renderMenuGroup('系统管理', menuItems.systemManagement)}
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2, backgroundColor: 'white', borderRadius: '30px', margin: '8px', mt: 'auto', mb: '30px' }}>
        <Typography variant="body2">存储空间</Typography>
        <LinearProgress variant="determinate" value={50} sx={{ mt: 1 }} />
        <Typography variant="caption">5GB / 10GB</Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;