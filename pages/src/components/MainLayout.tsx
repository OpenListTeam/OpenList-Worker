import {useState, useEffect} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
    Box,
    Typography,
    AppBar,
    Toolbar,
    IconButton,
    useTheme,
    useMediaQuery,
    TextField,
    InputAdornment,
    Collapse,
    Avatar,
    Menu as MuiMenu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Tooltip
} from '@mui/material';
import {
    Menu,
    Search,
    Refresh,
    GridView,
    AccountCircle,
    TableView,
    ViewModule,
    Close,
    Logout,
    Settings
} from '@mui/icons-material';
import {lightTheme, darkTheme} from '../theme';
import GroupedSidebar from './GroupedSidebar.tsx';
import {useApp} from './AppContext';
import {useDownloadProgress} from '../hooks/useDownloadProgress';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const { state, dispatch, logout } = useApp();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 768px以下为移动端
    const isTablet = useMediaQuery(theme.breakpoints.down('lg')); // 1024px以下为平板
    const isLargeScreen = useMediaQuery('(min-width:960px)'); // 960px以上为大屏幕
    
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
    
    // 顶栏功能状态
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
    
    // 下载队列相关状态
    const { downloads, isVisible: downloadQueueVisible, toggleVisibility } = useDownloadProgress();
    const downloadCount = downloads.filter(d => d.status === 'downloading' || d.status === 'pending').length;

    // 响应式侧边栏控制
    useEffect(() => {
        const currentScreenState = isLargeScreen ? 'large' : (isMobile ? 'mobile' : 'medium');
        const prevScreenState = localStorage.getItem('prevScreenState');
        const userManualAction = localStorage.getItem('userManualSidebarAction');
        
        // 只在屏幕状态真正改变时才调整侧边栏，且不覆盖用户的手动操作
        if (prevScreenState !== currentScreenState && !userManualAction) {
            if (isLargeScreen) {
                // 在大屏幕上默认展开侧边栏
                if (state.sidebarCollapsed) {
                    dispatch({ type: 'TOGGLE_SIDEBAR' });
                }
            } else if (isMobile) {
                // 在移动端默认隐藏侧边栏
                if (!state.sidebarCollapsed) {
                    dispatch({ type: 'TOGGLE_SIDEBAR' });
                }
            }
            localStorage.setItem('prevScreenState', currentScreenState);
        }
        
        // 清除用户手动操作标记（在屏幕状态改变后）
        if (prevScreenState !== currentScreenState && userManualAction) {
            localStorage.removeItem('userManualSidebarAction');
            localStorage.setItem('prevScreenState', currentScreenState);
        }
    }, [isLargeScreen, isMobile]);

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

    const handleSidebarToggle = () => {
        // 标记这是用户的手动操作
        localStorage.setItem('userManualSidebarAction', 'true');
        dispatch({ type: 'TOGGLE_SIDEBAR' });
    };

    // 顶栏功能处理函数
    const handleSearchToggle = () => {
        console.log('搜索切换:', { searchOpen, currentPath: location.pathname });
        setSearchOpen(!searchOpen);
        if (searchOpen) {
            console.log('关闭搜索，重置搜索值，当前路径:', location.pathname);
            setSearchValue('');
            // 触发搜索重置事件
            window.dispatchEvent(new CustomEvent('searchReset'));
            console.log('已触发searchReset事件');
        }
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchValue(value);
        // 触发搜索事件
        window.dispatchEvent(new CustomEvent('searchChange', { detail: { searchValue: value } }));
    };

    const handleRefresh = () => {
        // 触发刷新事件
        window.dispatchEvent(new CustomEvent('pageRefresh'));
        // 刷新当前页面
        window.location.reload();
    };

    const handleViewModeToggle = () => {
        const newMode = viewMode === 'table' ? 'grid' : 'table';
        setViewMode(newMode);
        // 触发视图模式切换事件
        window.dispatchEvent(new CustomEvent('viewModeChange', { detail: { viewMode: newMode } }));
    };

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
                    open={!state.sidebarCollapsed}
                    onClose={handleSidebarToggle}
                    isMobile={isMobile}
                    downloadQueueVisible={downloadQueueVisible}
                    onToggleDownloadQueue={toggleVisibility}
                    downloadCount={downloadCount}
                />

                {/* 主内容区域 */}
                <Box component="main" sx={{
                    flexGrow: 1,
                    overflow: 'visible',
                    backgroundColor: 'background.default',
                    borderRadius: isMobile ? '10px' : '15px',
                    marginLeft: state.sidebarCollapsed ? (isMobile ? '5px' : '10px') : (isMobile ? '8px' : '16px'),
                    marginTop: isMobile ? '5px' : '10px',
                    marginRight: isMobile ? '5px' : '10px',
                    marginBottom: isMobile ? '5px' : '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: 0, // 防止flex子元素溢出
                }}>
                    {/* 标题栏 */}
                    <AppBar position="static" sx={{
                        borderRadius: isMobile ? '10px' : '15px', 
                        mb: isMobile ? 1 : 2
                    }}>
                        <Toolbar sx={{ minHeight: isMobile ? '56px' : '64px' }}>
                            <IconButton 
                                edge="start" 
                                color="inherit" 
                                aria-label="menu" 
                                sx={{
                                    mr: isMobile ? 1 : 2,
                                    // 确保在窄屏幕下有足够的点击区域
                                    minWidth: isMobile ? '48px' : '40px',
                                    minHeight: isMobile ? '48px' : '40px',
                                    padding: isMobile ? '12px' : '8px',
                                    // 确保按钮在最上层
                                    zIndex: 1300,
                                    // 增加点击区域
                                    '&:before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: '-8px',
                                        left: '-8px',
                                        right: '-8px',
                                        bottom: '-8px',
                                        zIndex: -1,
                                    },
                                    // 确保在移动端有更好的触摸体验
                                    '@media (pointer: coarse)': {
                                        minWidth: '56px',
                                        minHeight: '56px',
                                        padding: '16px',
                                    }
                                }}
                                onClick={handleSidebarToggle}
                            >
                                <Menu/>
                            </IconButton>
                            
                            {/* 标题和搜索框 */}
                            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                                {!searchOpen ? (
                                    <Typography 
                                        variant={isMobile ? "subtitle1" : "h6"} 
                                        component="div" 
                                        sx={{
                                            fontSize: isMobile ? '1rem' : '1.25rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {getPageTitle(location.pathname)}
                                    </Typography>
                                ) : (
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        placeholder="搜索..."
                                        value={searchValue}
                                        onChange={handleSearchChange}
                                        size="small"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                color: 'inherit',
                                                '& fieldset': {
                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: 'rgba(255, 255, 255, 0.7)',
                                                },
                                            },
                                            '& .MuiInputBase-input::placeholder': {
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                opacity: 1,
                                            },
                                        }}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={handleSearchToggle}
                                                        sx={{ color: 'inherit' }}
                                                    >
                                                        <Close />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                        autoFocus
                                    />
                                )}
                            </Box>

                            {/* 功能按钮 */}
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {/* 搜索按钮 */}
                                {!searchOpen && (
                                    <Tooltip title="搜索">
                                        <IconButton color="inherit" onClick={handleSearchToggle}>
                                            <Search/>
                                        </IconButton>
                                    </Tooltip>
                                )}
                                
                                {/* 刷新按钮 */}
                                <Tooltip title="刷新">
                                    <IconButton color="inherit" onClick={handleRefresh}>
                                        <Refresh/>
                                    </IconButton>
                                </Tooltip>
                                
                                {/* 视图切换按钮 */}
                                {!isMobile && (
                                    <Tooltip title={viewMode === 'table' ? '切换到网格视图' : '切换到表格视图'}>
                                        <IconButton color="inherit" onClick={handleViewModeToggle}>
                                            {viewMode === 'table' ? <ViewModule/> : <TableView/>}
                                        </IconButton>
                                    </Tooltip>
                                )}
                                
                                {/* 用户菜单按钮 */}
                                <Tooltip title="用户菜单">
                                    <IconButton color="inherit" onClick={handleUserMenuOpen}>
                                        {state.isAuthenticated && state.user ? (
                                            <Avatar
                                                src={state.user.avatar}
                                                alt={state.user.username}
                                                sx={{ width: 32, height: 32 }}
                                            >
                                                {state.user.username?.charAt(0).toUpperCase()}
                                            </Avatar>
                                        ) : (
                                            <AccountCircle/>
                                        )}
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Toolbar>

                        {/* 用户菜单 */}
                        <MuiMenu
                            anchorEl={userMenuAnchor}
                            open={Boolean(userMenuAnchor)}
                            onClose={handleUserMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            {state.isAuthenticated && state.user ? (
                                [
                                    <MenuItem key="user-info" disabled>
                                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                                            <Avatar
                                                src={state.user.avatar}
                                                alt={state.user.username}
                                                sx={{ width: 40, height: 40, mr: 2 }}
                                            >
                                                {state.user.username?.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {state.user.username}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {state.user.email}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </MenuItem>,
                                    <Divider key="divider" />,
                                    <MenuItem key="settings" onClick={() => { handleUserMenuClose(); navigate('/@pages/account-settings'); }}>
                                        <ListItemIcon>
                                            <Settings fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>账号设置</ListItemText>
                                    </MenuItem>,
                                    <MenuItem key="logout" onClick={handleLogout}>
                                        <ListItemIcon>
                                            <Logout fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>退出登录</ListItemText>
                                    </MenuItem>
                                ]
                            ) : (
                                <MenuItem onClick={() => { handleUserMenuClose(); navigate('/login'); }}>
                                    <ListItemIcon>
                                        <AccountCircle fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>登录</ListItemText>
                                </MenuItem>
                            )}
                        </MuiMenu>
                    </AppBar>

                    {/* 路由内容区域 */}
                    <Box sx={{
                        flexGrow: 1,
                        overflow: 'auto',
                        backgroundColor: 'background.paper',
                        borderRadius: isMobile ? '10px' : '15px',
                        minWidth: 0, // 防止flex子元素溢出
                        minHeight: 0 // 防止flex子元素溢出
                    }}>
                        {children}
                    </Box>
                </Box>
            </Box>
        </ThemeProvider>
    );
};

export default MainLayout;