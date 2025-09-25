import {useState, useEffect} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
    Box,
    Typography,
    AppBar,
    Toolbar,
    IconButton
} from '@mui/material';
import {
    Menu,
    Search,
    Refresh,
    MoreVert,
    GridView,
    AccountCircle
} from '@mui/icons-material';
import {lightTheme, darkTheme} from '../theme';
import GroupedSidebar from './GroupedSidebar.tsx';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [darkMode, setDarkMode] = useState(() => {
        // 从localStorage读取主题设置，添加错误处理
        try {
            const savedTheme = localStorage.getItem('theme');
            return savedTheme === 'dark';
        } catch (error) {
            console.warn('无法访问localStorage，使用默认主题');
            return false;
        }
    });
    const location = useLocation();

    // 保存主题设置到localStorage
    useEffect(() => {
        try {
            localStorage.setItem('theme', darkMode ? 'dark' : 'light');
        } catch (error) {
            console.warn('无法保存主题设置到localStorage');
        }
    }, [darkMode]);

    const handleDarkModeToggle = () => {
        setDarkMode(!darkMode);
    };

    // 获取页面标题
  const getPageTitle = (pathname: string): string => {
    // 静态页面标题映射
    const staticTitles: { [key: string]: string } = {
      '/@pages/my-shares': '我的分享',
      '/@pages/mates-config': '目录配置',
      '/@pages/crypt-config': '加密配置',
      '/@pages/task-config': '任务管理',
      '/@pages/offline-download': '离线下载',
      '/@pages/connection-config': '挂载连接',
      '/@pages/account-settings': '账号设置',
      '/@pages/mount-management': '挂载管理',
      '/@pages/user-management': '用户管理',
      '/@pages/group-management': '分组管理',
      '/@pages/oauth-management': '三方登录',
      '/@pages/site-settings': '站点设置',
      '/@pages/about-platform': '关于平台'
    };

    // 检查静态页面
    if (staticTitles[pathname]) {
      return staticTitles[pathname];
    }

    // 个人文件路径处理
    if (pathname.startsWith('/@pages/myfile')) {
      return '我的文件';
    }

    // 公共文件路径处理
    if (pathname.startsWith('/@pages/') || pathname === '/') {
      return '公共目录';
    }

    return 'OpenList';
  };

    return (
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline/>
            <Box sx={{display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'background.default'}}>
                {/* 新的分组侧边栏 */}
                <GroupedSidebar 
                    darkMode={darkMode} 
                    onDarkModeToggle={handleDarkModeToggle} 
                />

                {/* 主内容区域 */}
                <Box component="main" sx={{
                    flexGrow: 1,
                    overflow: 'visible',
                    backgroundColor: 'background.default',
                    borderRadius: '30px',
                    marginLeft: '16px',
                    marginTop: '10px',
                    marginRight: '10px',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                    {/* 标题栏 */}
                    <AppBar position="static" sx={{borderRadius: '30px', mb: 2}}>
                        <Toolbar>
                            <IconButton edge="start" color="inherit" aria-label="menu" sx={{mr: 2}}>
                                <Menu/>
                            </IconButton>
                            <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                                {getPageTitle(location.pathname)}
                            </Typography>
                            <IconButton color="inherit" aria-label="search">
                                <Search/>
                            </IconButton>
                            <IconButton color="inherit" aria-label="refresh">
                                <Refresh/>
                            </IconButton>
                            <IconButton color="inherit" aria-label="more">
                                <MoreVert/>
                            </IconButton>
                            <IconButton color="inherit" aria-label="view">
                                <GridView/>
                            </IconButton>
                            <IconButton color="inherit" aria-label="account">
                                <AccountCircle/>
                            </IconButton>
                        </Toolbar>
                    </AppBar>

                    {/* 路由内容区域 */}
                    <Box sx={{
                        flexGrow: 1,
                        overflow: 'auto',
                        backgroundColor: 'background.paper',
                        borderRadius: '20px'
                    }}>
                        {children}
                    </Box>
                </Box>
            </Box>
        </ThemeProvider>
    );
};

export default MainLayout;