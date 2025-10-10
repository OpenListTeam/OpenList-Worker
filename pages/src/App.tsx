import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './components/AppContext.tsx';
import MainLayout from './components/MainLayout.tsx';
import Router from './router';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { zhCN } from '@mui/material/locale';
import ErrorBoundary from './components/ErrorBoundary';
import AuthPage from './pages/Login/AuthPage';
import OAuthCallback from './pages/OAuth/OAuthCallback';
import DownloadProgress from './components/DownloadProgress';
import { useDownloadProgress } from './hooks/useDownloadProgress';

// 创建应用主题
const theme = createTheme(
    {
        palette: {
            mode: 'light',
            primary: {
                main: '#1976d2',
            },
            secondary: {
                main: '#dc004e',
            },
            background: {
                default: '#f5f5f5',
                paper: '#ffffff',
            },
        },
        typography: {
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            h4: {
                fontWeight: 600,
            },
            h5: {
                fontWeight: 600,
            },
            h6: {
                fontWeight: 600,
            },
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                    },
                },
            },
        },
    },
    zhCN
);

// 应用内容组件，处理条件渲染
const AppContent = () => {
    const location = useLocation();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/oauth/callback';
    const { downloads, removeDownload, cancelDownload, clearAllDownloads } = useDownloadProgress();

    if (isAuthPage) {
        // 认证页面不使用MainLayout
        return (
            <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
            </Routes>
        );
    }

    // 其他页面使用MainLayout
    return (
        <>
            <MainLayout>
                <Router />
            </MainLayout>
            {/* 下载进度条组件，全局显示 */}
            <DownloadProgress 
                downloads={downloads} 
                onRemove={removeDownload}
                onCancel={cancelDownload}
                onClearAll={clearAllDownloads}
            />
        </>
    );
};

function App() {
    // 应用初始化逻辑
    useEffect(() => {
        // 初始化应用设置
        const initializeApp = async () => {
            try {
                // 这里可以添加应用初始化逻辑，如：
                // 1. 检查用户认证状态
                // 2. 加载系统设置
                // 3. 初始化WebSocket连接
                // 4. 加载用户偏好设置

                console.log('应用初始化完成');
            } catch (error) {
                console.error('应用初始化失败:', error);
            }
        };

        initializeApp();
    }, []);

    return (
        <ErrorBoundary>
            <AppProvider>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <BrowserRouter>
                        <AppContent />
                    </BrowserRouter>
                </ThemeProvider>
            </AppProvider>
        </ErrorBoundary>
    );
}

export default App;