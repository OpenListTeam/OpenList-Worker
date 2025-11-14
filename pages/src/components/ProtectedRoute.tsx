import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from './AppContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * 路由保护组件
 * 检查用户是否已登录，未登录则重定向到登录页面并显示提示
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { state, showNotification } = useApp();
    const location = useLocation();
    const { isAuthenticated } = state;

    useEffect(() => {
        // 如果用户未登录，显示提示消息
        if (!isAuthenticated) {
            showNotification('warning', '请先登录后再访问该页面');
        }
    }, [isAuthenticated, showNotification]);

    // 如果未登录，重定向到登录页面，并保存当前路径以便登录后返回
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 已登录，渲染子组件
    return <>{children}</>;
};

export default ProtectedRoute;
