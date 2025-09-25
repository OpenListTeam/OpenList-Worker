import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Menu,
  Search,
  Refresh,
  MoreVert,
  GridView,
  DarkMode,
  AccountCircle,
} from '@mui/icons-material';
import { useLocation, Link as RouterLink } from 'react-router-dom';

interface TopBarProps {
  darkMode: boolean;
  onDarkModeToggle: () => void;
  onMenuToggle?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ darkMode, onDarkModeToggle, onMenuToggle }) => {
  const location = useLocation();
  
  // 根据当前路径生成面包屑
  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    const breadcrumbMap: { [key: string]: string } = {
      'public-directory': '公共目录',
      'my-files': '我的文件',
      'my-shares': '我的分享',
      'crypt-config': '加密配置',
      'mates-config': '元组配置',
      'connection-config': '连接配置',
      'task-config': '任务配置',
      'offline-download': '离线下载',
      'account-settings': '账号设置',
      'mount-management': '挂载管理',
      'user-management': '用户管理',
      'group-management': '分组管理',
      'oauth-management': '授权管理',
      'site-settings': '站点设置',
      'about-platform': '关于平台',
    };

    return pathnames.map((name, index) => {
      const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
      const isLast = index === pathnames.length - 1;
      const displayName = breadcrumbMap[name] || name;

      return isLast ? (
        <Typography key={routeTo} color="text.primary">
          {displayName}
        </Typography>
      ) : (
        <Link
          key={routeTo}
          component={RouterLink}
          to={routeTo}
          underline="hover"
          color="inherit"
        >
          {displayName}
        </Link>
      );
    });
  };

  return (
    <AppBar position="static" sx={{ mb: 2, borderRadius: '30px' }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={onMenuToggle}
        >
          <Menu />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Breadcrumbs aria-label="breadcrumb" sx={{ color: 'inherit' }}>
            <Link
              component={RouterLink}
              to="/"
              underline="hover"
              color="inherit"
            >
              首页
            </Link>
            {getBreadcrumbs()}
          </Breadcrumbs>
        </Typography>
        
        <IconButton color="inherit" aria-label="search">
          <Search />
        </IconButton>
        <IconButton color="inherit" aria-label="refresh">
          <Refresh />
        </IconButton>
        <IconButton color="inherit" aria-label="more">
          <MoreVert />
        </IconButton>
        <IconButton color="inherit" aria-label="view">
          <GridView />
        </IconButton>
        <IconButton color="inherit" aria-label="dark mode" onClick={onDarkModeToggle}>
          <DarkMode />
        </IconButton>
        <IconButton color="inherit" aria-label="account">
          <AccountCircle />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;