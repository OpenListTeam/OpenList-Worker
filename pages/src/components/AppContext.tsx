import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import React from 'react';
import { getUserAvatarUrl } from '../utils/gravatar';

// 用户类型定义
interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role: 'admin' | 'user';
    permissions: string[];
}

// 系统设置类型定义
interface SystemSettings {
    siteName: string;
    siteDescription: string;
    allowRegistration: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    storageQuota: number;
}

// 应用状态类型定义
interface AppState {
    user: User | null;
    isAuthenticated: boolean;
    systemSettings: SystemSettings;
    theme: 'light' | 'dark';
    sidebarCollapsed: boolean;
    notifications: Array<{
        id: string;
        type: 'info' | 'success' | 'warning' | 'error';
        message: string;
        timestamp: Date;
    }>;
    loading: boolean;
}

// 动作类型定义
type AppAction =
    | { type: 'SET_USER'; payload: User | null }
    | { type: 'SET_AUTHENTICATED'; payload: boolean }
    | { type: 'SET_SYSTEM_SETTINGS'; payload: Partial<SystemSettings> }
    | { type: 'SET_THEME'; payload: 'light' | 'dark' }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'ADD_NOTIFICATION'; payload: { type: 'info' | 'success' | 'warning' | 'error'; message: string } }
    | { type: 'REMOVE_NOTIFICATION'; payload: string }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'CLEAR_NOTIFICATIONS' };

// 初始状态
const initialState: AppState = {
    user: null,
    isAuthenticated: false,
    systemSettings: {
        siteName: 'OpenList',
        siteDescription: '开源文件管理系统',
        allowRegistration: true,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedFileTypes: ['*'],
        storageQuota: 10 * 1024 * 1024 * 1024, // 10GB
    },
    theme: (() => {
        try {
            return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
        } catch (error) {
            console.warn('无法访问localStorage，使用默认主题');
            return 'light';
        }
    })(),
    sidebarCollapsed: (() => {
        try {
            return localStorage.getItem('sidebarCollapsed') === 'true';
        } catch (error) {
            console.warn('无法访问localStorage，使用默认侧边栏状态');
            return false;
        }
    })(),
    notifications: [],
    loading: false,
};

// Reducer函数
const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload };
        case 'SET_AUTHENTICATED':
            return { ...state, isAuthenticated: action.payload };
        case 'SET_SYSTEM_SETTINGS':
            return { 
                ...state, 
                systemSettings: { ...state.systemSettings, ...action.payload } 
            };
        case 'SET_THEME':
            try {
                localStorage.setItem('theme', action.payload);
            } catch (error) {
                console.warn('无法保存主题设置到localStorage');
            }
            return { ...state, theme: action.payload };
        case 'TOGGLE_SIDEBAR':
            const newCollapsed = !state.sidebarCollapsed;
            try {
                localStorage.setItem('sidebarCollapsed', String(newCollapsed));
            } catch (error) {
                console.warn('无法保存侧边栏状态到localStorage');
            }
            return { ...state, sidebarCollapsed: newCollapsed };
        case 'ADD_NOTIFICATION':
            const newNotification = {
                id: Date.now().toString(),
                type: action.payload.type,
                message: action.payload.message,
                timestamp: new Date(),
            };
            return { 
                ...state, 
                notifications: [...state.notifications, newNotification] 
            };
        case 'REMOVE_NOTIFICATION':
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.payload),
            };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'CLEAR_NOTIFICATIONS':
            return { ...state, notifications: [] };
        default:
            return state;
    }
};

// Context类型
interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    // 便捷方法
    login: (user: User) => void;
    logout: () => void;
    updateSystemSettings: (settings: Partial<SystemSettings>) => void;
    toggleTheme: () => void;
    showNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
    hideNotification: (id: string) => void;
    setLoading: (loading: boolean) => void;
}

// 创建Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context Provider组件
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // 便捷方法
    const login = (user: User) => {
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_AUTHENTICATED', payload: true });
        localStorage.setItem('user', JSON.stringify(user));
    };

    const logout = () => {
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_AUTHENTICATED', payload: false });
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const updateSystemSettings = (settings: Partial<SystemSettings>) => {
        dispatch({ type: 'SET_SYSTEM_SETTINGS', payload: settings });
    };

    const toggleTheme = () => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        dispatch({ type: 'SET_THEME', payload: newTheme });
    };

    const showNotification = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type, message } });
        
        // 自动移除通知
        setTimeout(() => {
            const notificationId = Date.now().toString();
            dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
        }, 5000);
    };

    const hideNotification = (id: string) => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    };

    const setLoading = (loading: boolean) => {
        dispatch({ type: 'SET_LOADING', payload: loading });
    };

    // 初始化用户状态
    useEffect(() => {
        const initializeAuth = async () => {
            const savedUser = localStorage.getItem('user');
            const savedToken = localStorage.getItem('token');
            
            if (savedUser && savedToken) {
                try {
                    // 验证token有效性
                    const response = await fetch('/@users/select/none', {
                        headers: {
                            'Authorization': `Bearer ${savedToken}`
                        }
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.flag) {
                            // Token有效，恢复用户状态
                            const user = JSON.parse(savedUser);
                            // 如果用户没有头像或头像为空，使用Gravatar生成
                            if (!user.avatar || user.avatar === '') {
                                user.avatar = getUserAvatarUrl({ email: user.email || '' }, 80);
                            }
                            dispatch({ type: 'SET_USER', payload: user });
                            dispatch({ type: 'SET_AUTHENTICATED', payload: true });
                            return;
                        }
                    }
                    
                    // Token无效，清除本地存储
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                } catch (error) {
                    console.error('Token验证失败:', error);
                    // 验证失败，清除本地存储
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                }
            }
        };

        initializeAuth();
    }, []);

    const contextValue: AppContextType = {
        state,
        dispatch,
        login,
        logout,
        updateSystemSettings,
        toggleTheme,
        showNotification,
        hideNotification,
        setLoading,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

// 自定义Hook使用Context
export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export default AppContext;