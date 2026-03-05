import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Layout,
    Button,
    Input,
    Avatar,
    Dropdown,
    Tooltip,
    Typography,
    theme,
    Divider,
} from 'antd';
import {
    MenuOutlined,
    SearchOutlined,
    ReloadOutlined,
    AppstoreOutlined,
    TableOutlined,
    CloseOutlined,
    LogoutOutlined,
    SettingOutlined,
    UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import GroupedSidebar from './GroupedSidebar.tsx';
import { useApp } from './AppContext';
import { useDownloadProgress } from '../hooks/useDownloadProgress';

const { Header, Content } = Layout;
const { useToken } = theme;

// 自定义响应式 hook
const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { state, dispatch, logout } = useApp();
    const navigate = useNavigate();
    const { token } = useToken();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');
    const isLargeScreen = useMediaQuery('(min-width: 960px)');

    const [darkMode, setDarkMode] = useState(() => {
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

    // 下载队列相关状态
    const { downloads, isVisible: downloadQueueVisible, toggleVisibility } = useDownloadProgress();
    const downloadCount = downloads.filter(d => d.status === 'downloading' || d.status === 'pending').length;

    // 响应式侧边栏控制
    useEffect(() => {
        const currentScreenState = isLargeScreen ? 'large' : (isMobile ? 'mobile' : 'medium');
        const prevScreenState = localStorage.getItem('prevScreenState');
        const userManualAction = localStorage.getItem('userManualSidebarAction');

        if (prevScreenState !== currentScreenState && !userManualAction) {
            if (isLargeScreen) {
                if (state.sidebarCollapsed) {
                    dispatch({ type: 'TOGGLE_SIDEBAR' });
                }
            } else if (isMobile) {
                if (!state.sidebarCollapsed) {
                    dispatch({ type: 'TOGGLE_SIDEBAR' });
                }
            }
            localStorage.setItem('prevScreenState', currentScreenState);
        }

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
            window.dispatchEvent(new CustomEvent('searchReset'));
            console.log('已触发searchReset事件');
        }
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchValue(value);
        window.dispatchEvent(new CustomEvent('searchChange', { detail: { searchValue: value } }));
    };

    const handleRefresh = () => {
        window.dispatchEvent(new CustomEvent('pageRefresh'));
        window.location.reload();
    };

    const handleViewModeToggle = () => {
        const newMode = viewMode === 'table' ? 'grid' : 'table';
        setViewMode(newMode);
        window.dispatchEvent(new CustomEvent('viewModeChange', { detail: { viewMode: newMode } }));
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // 获取页面标题
    const getPageTitle = (pathname: string): string => {
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

        if (staticTitles[pathname]) {
            return staticTitles[pathname];
        }

        if (pathname.startsWith('/@pages/myfile')) {
            return '我的文件';
        }

        if (pathname.startsWith('/@pages/') || pathname === '/') {
            return '公共目录';
        }

        return 'OpenList';
    };

    // 构建用户下拉菜单
    const userMenuItems: MenuProps['items'] = state.isAuthenticated && state.user
        ? [
            {
                key: 'user-info',
                label: (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
                        <Avatar
                            src={state.user.avatar}
                            alt={state.user.username}
                            size={40}
                            style={{ marginRight: 12 }}
                        >
                            {state.user.username?.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                            <Typography.Text strong style={{ display: 'block' }}>
                                {state.user.username}
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {state.user.email}
                            </Typography.Text>
                        </div>
                    </div>
                ),
                disabled: true,
            },
            { type: 'divider' as const },
            {
                key: 'settings',
                icon: <SettingOutlined />,
                label: '账号设置',
                onClick: () => navigate('/@pages/account-settings'),
            },
            {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                onClick: handleLogout,
            },
        ]
        : [
            {
                key: 'login',
                icon: <UserOutlined />,
                label: '登录',
                onClick: () => navigate('/login'),
            },
        ];

    const borderRadius = isMobile ? 10 : 15;

    return (
        <Layout style={{ height: '100vh', width: '100vw', background: token.colorBgLayout }}>
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
            <Layout style={{
                background: token.colorBgLayout,
                borderRadius,
                marginLeft: state.sidebarCollapsed ? (isMobile ? 5 : 10) : (isMobile ? 8 : 16),
                marginTop: isMobile ? 5 : 10,
                marginRight: isMobile ? 5 : 10,
                marginBottom: isMobile ? 5 : 10,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: 0,
                overflow: 'hidden',
            }}>
                {/* 标题栏 */}
                <Header style={{
                    background: token.colorPrimary,
                    borderRadius,
                    marginBottom: isMobile ? 8 : 16,
                    padding: isMobile ? '0 12px' : '0 24px',
                    height: isMobile ? 56 : 64,
                    lineHeight: isMobile ? '56px' : '64px',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                }}>
                    {/* 菜单按钮 */}
                    <Button
                        type="text"
                        icon={<MenuOutlined />}
                        onClick={handleSidebarToggle}
                        style={{
                            color: '#fff',
                            marginRight: isMobile ? 8 : 16,
                            fontSize: 18,
                            width: isMobile ? 48 : 40,
                            height: isMobile ? 48 : 40,
                        }}
                    />

                    {/* 标题和搜索框 */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                        {!searchOpen ? (
                            <Typography.Title
                                level={isMobile ? 5 : 4}
                                style={{
                                    margin: 0,
                                    color: '#fff',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontSize: isMobile ? 16 : 20,
                                }}
                            >
                                {getPageTitle(location.pathname)}
                            </Typography.Title>
                        ) : (
                            <Input
                                placeholder="搜索..."
                                value={searchValue}
                                onChange={handleSearchChange}
                                suffix={
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CloseOutlined />}
                                        onClick={handleSearchToggle}
                                        style={{ color: 'rgba(255,255,255,0.7)' }}
                                    />
                                }
                                autoFocus
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    borderColor: 'rgba(255,255,255,0.3)',
                                    color: '#fff',
                                }}
                                styles={{
                                    input: { color: '#fff' },
                                }}
                            />
                        )}
                    </div>

                    {/* 功能按钮 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {/* 搜索按钮 */}
                        {!searchOpen && (
                            <Tooltip title="搜索">
                                <Button
                                    type="text"
                                    icon={<SearchOutlined />}
                                    onClick={handleSearchToggle}
                                    style={{ color: '#fff' }}
                                />
                            </Tooltip>
                        )}

                        {/* 刷新按钮 */}
                        <Tooltip title="刷新">
                            <Button
                                type="text"
                                icon={<ReloadOutlined />}
                                onClick={handleRefresh}
                                style={{ color: '#fff' }}
                            />
                        </Tooltip>

                        {/* 视图切换按钮 */}
                        {!isMobile && (
                            <Tooltip title={viewMode === 'table' ? '切换到网格视图' : '切换到表格视图'}>
                                <Button
                                    type="text"
                                    icon={viewMode === 'table' ? <AppstoreOutlined /> : <TableOutlined />}
                                    onClick={handleViewModeToggle}
                                    style={{ color: '#fff' }}
                                />
                            </Tooltip>
                        )}

                        {/* 用户菜单 */}
                        <Dropdown
                            menu={{ items: userMenuItems }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <Button
                                type="text"
                                style={{ color: '#fff', padding: 4, height: 'auto' }}
                            >
                                {state.isAuthenticated && state.user ? (
                                    <Avatar
                                        src={state.user.avatar}
                                        alt={state.user.username}
                                        size={32}
                                    >
                                        {state.user.username?.charAt(0).toUpperCase()}
                                    </Avatar>
                                ) : (
                                    <UserOutlined style={{ fontSize: 20 }} />
                                )}
                            </Button>
                        </Dropdown>
                    </div>
                </Header>

                {/* 路由内容区域 */}
                <Content style={{
                    flex: 1,
                    overflow: 'auto',
                    background: token.colorBgContainer,
                    borderRadius,
                    minWidth: 0,
                    minHeight: 0,
                }}>
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;