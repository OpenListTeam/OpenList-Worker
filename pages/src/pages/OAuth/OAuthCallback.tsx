import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    Button
} from '@mui/material';
import { useApp } from '../../components/AppContext';
import oauthService from '../../services/OAuthService';
import { getUserAvatarUrl } from '../../utils/gravatar';

const OAuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, showNotification } = useApp();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // 获取URL参数
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const errorParam = searchParams.get('error');

                // 检查是否有错误
                if (errorParam) {
                    setError(`OAuth授权失败: ${errorParam}`);
                    setLoading(false);
                    return;
                }

                // 检查必要参数
                if (!code || !state) {
                    setError('缺少必要的OAuth参数');
                    setLoading(false);
                    return;
                }

                // 验证state参数
                const savedState = sessionStorage.getItem('oauth_state');
                const oauthName = sessionStorage.getItem('oauth_name');
                const isBindMode = sessionStorage.getItem('oauth_bind_mode') === 'true';
                const bindProvider = sessionStorage.getItem('oauth_bind_provider');
                
                if (!savedState || !oauthName || savedState !== state) {
                    setError('OAuth状态验证失败，可能存在安全风险');
                    setLoading(false);
                    return;
                }

                // 清除sessionStorage中的临时数据
                sessionStorage.removeItem('oauth_state');
                sessionStorage.removeItem('oauth_name');
                sessionStorage.removeItem('oauth_bind_mode');
                sessionStorage.removeItem('oauth_bind_provider');

                if (isBindMode && bindProvider) {
                    // 绑定模式：调用绑定API
                    const response = await oauthService.bindAccount(code, state, bindProvider);
                    
                    if (response.flag) {
                        showNotification('success', 'OAuth账户绑定成功！');
                        
                        // 跳转回个人设置页面
                        setTimeout(() => {
                            navigate('/users/account-settings');
                        }, 1000);
                    } else {
                        throw new Error(response.text || 'OAuth账户绑定失败');
                    }
                } else {
                    // 登录模式：调用登录API
                    const response = await oauthService.handleCallback(code, state, oauthName);

                    if (response.flag && response.token && response.data) {
                        // 保存token和用户信息
                        localStorage.setItem('token', response.token);
                        localStorage.setItem('user', JSON.stringify(response.data));
                        
                        // 登录用户
                        login(response.data);
                        
                        showNotification('success', 'OAuth登录成功！');
                        
                        // 跳转到仪表板
                        setTimeout(() => {
                            navigate('/dashboard');
                        }, 1000);
                    } else {
                        throw new Error(response.text || 'OAuth登录失败');
                    }
                }
            } catch (error: any) {
                console.error('OAuth回调处理错误:', error);
                setError(error.message || 'OAuth登录处理失败');
            } finally {
                setLoading(false);
            }
        };

        handleOAuthCallback();
    }, [searchParams, navigate, login, showNotification]);

    const handleReturnToLogin = () => {
        navigate('/login');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                p: 2
            }}
        >
            <Card
                sx={{
                    width: '100%',
                    maxWidth: 450,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    borderRadius: 3,
                }}
            >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    {/* Logo和标题 */}
                    <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        OpenList
                    </Typography>
                    
                    {loading ? (
                        <>
                            <CircularProgress sx={{ mb: 2 }} />
                            <Typography variant="body1" color="text.secondary">
                                正在处理OAuth登录...
                            </Typography>
                        </>
                    ) : error ? (
                        <>
                            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                                {error}
                            </Alert>
                            <Button
                                variant="contained"
                                onClick={handleReturnToLogin}
                                sx={{ mt: 2 }}
                            >
                                返回登录页面
                            </Button>
                        </>
                    ) : (
                        <Typography variant="body1" color="text.secondary">
                            登录成功，正在跳转...
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default OAuthCallback;