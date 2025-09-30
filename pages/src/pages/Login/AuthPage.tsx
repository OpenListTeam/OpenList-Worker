import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    IconButton,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Link,
    Tabs,
    Tab,
    Divider,
    CircularProgress,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Login as LoginIcon,
    PersonAdd as RegisterIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../components/AppContext.tsx';
import { userApi } from '../../posts/api';
import { getUserAvatarUrl } from '../../utils/gravatar';
import type { UsersResult, UsersConfig } from '../../types';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
};

const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, showNotification } = useApp();
    
    // Tab状态
    const [tabValue, setTabValue] = useState(0);
    
    // 登录表单状态
    const [loginForm, setLoginForm] = useState({
        loginMethod: 'account',
        username: '',
        password: '',
        showPassword: false,
    });
    
    // 注册表单状态
    const [registerForm, setRegisterForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        showPassword: false,
        showConfirmPassword: false,
        agreeTerms: false,
        agreePrivacy: false,
    });
    
    // 通用状态
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 根据路由设置初始标签页
    useEffect(() => {
        if (location.pathname === '/register') {
            setTabValue(1);
        } else {
            setTabValue(0);
        }
    }, [location.pathname]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setError('');
    };

    // 登录相关处理函数
    const handleLoginInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setLoginForm(prev => ({
            ...prev,
            [field]: event.target.value
        }));
        if (error) setError('');
    };

    const handleLoginSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        if (!loginForm.username || !loginForm.password) {
            setError('请填写用户名和密码');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 调用真实的登录API
            const loginData: UsersConfig = {
                users_name: loginForm.username,
                users_pass: loginForm.password
            };

            const response: UsersResult = await userApi.login(loginData);
            
            if (response.flag && response.token && response.data && response.data.length > 0) {
                // 保存token到localStorage
                localStorage.setItem('token', response.token);
                
                // 设置axios默认header
                const apiService = (await import('../../posts/api')).apiService;
                apiService.instance.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
                
                // 获取用户信息
                const userInfo = response.data[0];
                const user = {
                    id: userInfo.users_name,
                    username: userInfo.users_name,
                    email: userInfo.users_mail || '',
                    avatar: getUserAvatarUrl({ email: userInfo.users_mail || '' }, 80),
                    role: 'user' as const,
                    permissions: ['read', 'write']
                };

                // 保存用户信息到localStorage
                localStorage.setItem('user', JSON.stringify(user));
                
                login(user);
                showNotification('登录成功！', 'success');
                navigate('/@pages/');
            } else {
                setError(response.text || '登录失败');
            }
        } catch (error: any) {
            console.error('登录错误:', error);
            
            // 处理不同类型的错误
            if (error.name === 'ApiError') {
                // API错误，显示具体错误信息
                setError(error.message);
            } else if (error.response?.data) {
                // HTTP响应错误
                const responseData = error.response.data;
                if (responseData.text) {
                    setError(responseData.text);
                } else if (responseData.message) {
                    setError(responseData.message);
                } else {
                    setError('登录失败，请稍后重试');
                }
            } else if (error.message) {
                // 其他错误，显示错误消息
                setError(error.message);
            } else {
                // 未知错误
                setError('登录失败，请检查网络连接或稍后重试');
            }
        } finally {
            setLoading(false);
        }
    };

    // 注册相关处理函数
    const handleRegisterInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setRegisterForm(prev => ({
            ...prev,
            [field]: event.target.value
        }));
        if (error) setError('');
    };

    const handleRegisterCheckboxChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setRegisterForm(prev => ({
            ...prev,
            [field]: event.target.checked
        }));
    };

    const handleRegisterSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        if (!registerForm.username || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
            setError('请填写所有必填字段');
            return;
        }

        if (registerForm.password !== registerForm.confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        if (registerForm.password.length < 6) {
            setError('密码长度至少为6位');
            return;
        }

        if (!registerForm.agreeTerms || !registerForm.agreePrivacy) {
            setError('请同意服务条款和隐私政策');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 调用真实的注册API
            const registerData: UsersConfig = {
                users_name: registerForm.username,
                users_mail: registerForm.email,
                users_pass: registerForm.password
            };

            const response: UsersResult = await userApi.register(registerData);
            
            if (response.flag) {
                showNotification('注册成功！请登录', 'success');
                setTabValue(0); // 切换到登录标签
                
                // 清空注册表单
                setRegisterForm({
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    showPassword: false,
                    showConfirmPassword: false,
                    agreeTerms: false,
                    agreePrivacy: false,
                });
            } else {
                setError(response.text || '注册失败');
            }
        } catch (error: any) {
            console.error('注册错误:', error);
            
            // 处理不同类型的错误
            if (error.name === 'ApiError') {
                // API错误，显示具体错误信息
                setError(error.message);
            } else if (error.response?.data) {
                // HTTP响应错误
                const responseData = error.response.data;
                if (responseData.text) {
                    setError(responseData.text);
                } else if (responseData.message) {
                    setError(responseData.message);
                } else {
                    setError('注册失败，请稍后重试');
                }
            } else if (error.message) {
                // 其他错误，显示错误消息
                setError(error.message);
            } else {
                // 未知错误
                setError('注册失败，请检查网络连接或稍后重试');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                width: '100vw',
                height: '100vh',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: 2,
                margin: 0,
                position: 'fixed',
                top: 0,
                left: 0,
                overflow: 'auto',
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
                <CardContent sx={{ p: 4 }}>
                    {/* Logo和标题 */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            OpenList
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            欢迎使用文件管理系统
                        </Typography>
                    </Box>

                    {/* 错误提示 */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* 标签页 */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                            <Tab 
                                icon={<LoginIcon />} 
                                label="登录" 
                                iconPosition="start"
                                sx={{ minHeight: 48 }}
                            />
                            <Tab 
                                icon={<RegisterIcon />} 
                                label="注册" 
                                iconPosition="start"
                                sx={{ minHeight: 48 }}
                            />
                        </Tabs>
                    </Box>

                    {/* 登录面板 */}
                    <TabPanel value={tabValue} index={0}>
                        <Box component="form" onSubmit={handleLoginSubmit}>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>登录方式</InputLabel>
                                <Select
                                    value={loginForm.loginMethod}
                                    label="登录方式"
                                    onChange={(e) => setLoginForm(prev => ({ ...prev, loginMethod: e.target.value }))}
                                >
                                    <MenuItem value="account">账号登录</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="用户名"
                                value={loginForm.username}
                                onChange={handleLoginInputChange('username')}
                                margin="normal"
                                required
                                autoComplete="username"
                            />

                            <TextField
                                fullWidth
                                label="密码"
                                type={loginForm.showPassword ? 'text' : 'password'}
                                value={loginForm.password}
                                onChange={handleLoginInputChange('password')}
                                margin="normal"
                                required
                                autoComplete="current-password"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setLoginForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                                                edge="end"
                                            >
                                                {loginForm.showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading}
                                sx={{ mt: 3, mb: 2, py: 1.5 }}
                            >
                                {loading ? <CircularProgress size={24} /> : '登录'}
                            </Button>
                        </Box>
                    </TabPanel>

                    {/* 注册面板 */}
                    <TabPanel value={tabValue} index={1}>
                        <Box component="form" onSubmit={handleRegisterSubmit}>
                            <TextField
                                fullWidth
                                label="用户名"
                                value={registerForm.username}
                                onChange={handleRegisterInputChange('username')}
                                margin="normal"
                                required
                                autoComplete="username"
                            />

                            <TextField
                                fullWidth
                                label="邮箱"
                                type="email"
                                value={registerForm.email}
                                onChange={handleRegisterInputChange('email')}
                                margin="normal"
                                required
                                autoComplete="email"
                            />

                            <TextField
                                fullWidth
                                label="密码"
                                type={registerForm.showPassword ? 'text' : 'password'}
                                value={registerForm.password}
                                onChange={handleRegisterInputChange('password')}
                                margin="normal"
                                required
                                autoComplete="new-password"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setRegisterForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                                                edge="end"
                                            >
                                                {registerForm.showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <TextField
                                fullWidth
                                label="确认密码"
                                type={registerForm.showConfirmPassword ? 'text' : 'password'}
                                value={registerForm.confirmPassword}
                                onChange={handleRegisterInputChange('confirmPassword')}
                                margin="normal"
                                required
                                autoComplete="new-password"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setRegisterForm(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                                                edge="end"
                                            >
                                                {registerForm.showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Box sx={{ mt: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={registerForm.agreeTerms}
                                            onChange={handleRegisterCheckboxChange('agreeTerms')}
                                            size="small"
                                        />
                                    }
                                    label={
                                        <Typography variant="body2">
                                            我同意 <Link href="#" underline="hover">服务条款</Link>
                                        </Typography>
                                    }
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={registerForm.agreePrivacy}
                                            onChange={handleRegisterCheckboxChange('agreePrivacy')}
                                            size="small"
                                        />
                                    }
                                    label={
                                        <Typography variant="body2">
                                            我同意 <Link href="#" underline="hover">隐私政策</Link>
                                        </Typography>
                                    }
                                />
                            </Box>

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading}
                                sx={{ mt: 3, mb: 2, py: 1.5 }}
                            >
                                {loading ? <CircularProgress size={24} /> : '注册'}
                            </Button>
                        </Box>
                    </TabPanel>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AuthPage;