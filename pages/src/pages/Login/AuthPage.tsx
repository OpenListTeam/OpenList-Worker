import React, { useState, useEffect } from 'react';
import {
    Card,
    Input,
    Button,
    Typography,
    Alert,
    Select,
    Checkbox,
    Tabs,
    Divider,
    Spin,
    Form,
} from 'antd';
import {
    LoginOutlined,
    UserAddOutlined,
    GoogleOutlined,
    GithubOutlined,
    WindowsOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { userApi } from '../../posts/api';
import oauthService from '../../services/OAuthService';
import { useAuthStore } from '../../store';
import type { UsersResult, UsersConfig } from '../../types';

const { Title, Text, Link: AntdLink } = Typography;
const { Password } = Input;

const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login: authLogin } = useAuthStore();
    
    // Tab状态
    const [tabValue, setTabValue] = useState('login');
    
    // 登录表单状态
    const [loginForm, setLoginForm] = useState({
        loginMethod: 'account',
        username: '',
        password: '',
    });
    
    // 注册表单状态
    const [registerForm, setRegisterForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
        agreePrivacy: false,
    });
    
    // 通用状态
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // OAuth状态
    const [oauthProviders, setOauthProviders] = useState<Array<{ oauth_name: string; oauth_type: string; is_enabled: boolean }>>([]);
    const [oauthLoading, setOauthLoading] = useState<Record<string, boolean>>({});

    // 根据路由设置初始标签页
    useEffect(() => {
        if (location.pathname === '/register') {
            setTabValue('register');
        } else {
            setTabValue('login');
        }
    }, [location.pathname]);

    // 获取OAuth提供商列表
    useEffect(() => {
        const fetchOAuthProviders = async (retryCount = 0) => {
            try {
                const response = await oauthService.getAvailableProviders();
                if (response.flag && response.data) {
                    setOauthProviders(response.data.filter(provider => provider.is_enabled === 1));
                } else if (retryCount < 2) {
                    setTimeout(() => fetchOAuthProviders(retryCount + 1), 1000 * (retryCount + 1));
                }
            } catch (error) {
                console.error('获取OAuth提供商失败:', error);
                if (retryCount < 2) {
                    setTimeout(() => fetchOAuthProviders(retryCount + 1), 1000 * (retryCount + 1));
                }
            }
        };

        fetchOAuthProviders();
    }, []);

    const handleTabChange = (key: string) => {
        setTabValue(key);
        setError('');
    };

    // 登录相关处理函数
    const handleLoginSubmit = async () => {
        if (!loginForm.username) {
            setError('请填写用户名');
            return;
        }

        if (!loginForm.password) {
            setError('请填写密码');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const loginData: UsersConfig = {
                users_name: loginForm.username,
                users_pass: loginForm.password
            };

            const response: UsersResult = await userApi.login(loginData);
            
            if (response.flag && response.token && response.data && response.data.length > 0) {
                const userInfo = response.data[0];
                
                // 更新 Zustand 认证状态（持久化到 localStorage）
                authLogin(response.token, {
                    users_name: userInfo.users_name,
                    users_mail: userInfo.users_mail,
                });
                
                const from = (location.state as any)?.from?.pathname || '/files';
                navigate(from, { replace: true });
            } else {
                setError(response.text || '登录失败');
            }
        } catch (error: any) {
            console.error('🔴 登录catch捕获到异常:', error?.name, error?.message, error);
            if (error.name === 'ApiError') {
                setError(error.message);
            } else if (error.response?.data) {
                const responseData = error.response.data;
                if (responseData.text) {
                    setError(responseData.text);
                } else if (responseData.message) {
                    setError(responseData.message);
                } else {
                    setError('登录失败，请稍后重试');
                }
            } else if (error.message) {
                setError(error.message);
            } else {
                setError('登录失败，请检查网络连接或稍后重试');
            }
        } finally {
            setLoading(false);
        }
    };

    // OAuth登录处理
    const handleOAuthLogin = async (oauthName: string) => {
        try {
            setOauthLoading(prev => ({ ...prev, [oauthName]: true }));
            setError('');
            
            const redirectUri = `${window.location.origin}/oauth/callback`;
            const result = await oauthService.getAuthUrl(oauthName, redirectUri);
            
            if (result.flag && result.data?.auth_url) {
                sessionStorage.setItem('oauth_state', result.data.state);
                sessionStorage.setItem('oauth_name', oauthName);
                
                window.location.href = result.data.auth_url;
            } else {
                let errorMessage = result.text || '获取OAuth授权URL失败';
                if (errorMessage.includes('未登录')) {
                    errorMessage = `${oauthName} OAuth配置需要管理员权限，请联系管理员配置`;
                } else if (errorMessage.includes('不存在')) {
                    errorMessage = `${oauthName} OAuth配置不存在，请联系管理员配置`;
                } else if (errorMessage.includes('禁用')) {
                    errorMessage = `${oauthName} OAuth登录已被禁用，请联系管理员`;
                }
                setError(errorMessage);
            }
        } catch (error: any) {
            console.error('OAuth登录失败:', error);
            let errorMessage = 'OAuth登录失败';
            if (error.name === 'NetworkError' || error.message.includes('fetch')) {
                errorMessage = '网络连接失败，请检查网络连接后重试';
            } else if (error.message) {
                errorMessage = error.message;
            }
            setError(errorMessage);
        } finally {
            setOauthLoading(prev => ({ ...prev, [oauthName]: false }));
        }
    };

    // 获取OAuth提供商图标
    const getOAuthIcon = (oauthType: string) => {
        switch (oauthType.toLowerCase()) {
            case 'google':
                return <GoogleOutlined />;
            case 'github':
                return <GithubOutlined />;
            case 'microsoft':
                return <WindowsOutlined />;
            default:
                return <LoginOutlined />;
        }
    };

    // 获取OAuth提供商颜色
    const getOAuthColor = (oauthType: string) => {
        switch (oauthType.toLowerCase()) {
            case 'google':
                return '#4285f4';
            case 'github':
                return '#333';
            case 'microsoft':
                return '#0078d4';
            default:
                return '#1677ff';
        }
    };

    // 注册相关处理函数
    const handleRegisterSubmit = async () => {
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
            const registerData: UsersConfig = {
                users_name: registerForm.username,
                users_mail: registerForm.email,
                users_pass: registerForm.password
            };

            const response: UsersResult = await userApi.register(registerData);
            
            if (response.flag) {
                showNotification('success', '注册成功！请登录');
                setTabValue('login');
                
                setRegisterForm({
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    agreeTerms: false,
                    agreePrivacy: false,
                });
            } else {
                setError(response.text || '注册失败');
            }
        } catch (error: any) {
            console.error('注册错误:', error);
            
            if (error.name === 'ApiError') {
                setError(error.message);
            } else if (error.response?.data) {
                const responseData = error.response.data;
                if (responseData.text) {
                    setError(responseData.text);
                } else if (responseData.message) {
                    setError(responseData.message);
                } else {
                    setError('注册失败，请稍后重试');
                }
            } else if (error.message) {
                setError(error.message);
            } else {
                setError('注册失败，请检查网络连接或稍后重试');
            }
        } finally {
            setLoading(false);
        }
    };

    // 登录面板
    const loginPanel = (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Text style={{ display: 'block', marginBottom: 4 }}>登录方式</Text>
                <Select
                    value={loginForm.loginMethod}
                    onChange={(value) => setLoginForm(prev => ({ ...prev, loginMethod: value }))}
                    style={{ width: '100%' }}
                    options={[{ value: 'account', label: '账号登录' }]}
                />
            </div>

            <div style={{ marginBottom: 16 }}>
                <Text style={{ display: 'block', marginBottom: 4 }}>用户名 <span style={{ color: '#ff4d4f' }}>*</span></Text>
                <Input
                    placeholder="请输入用户名"
                    value={loginForm.username}
                    onChange={(e) => {
                        setLoginForm(prev => ({ ...prev, username: e.target.value }));
                        if (error) setError('');
                    }}
                    autoComplete="username"
                    size="large"
                />
            </div>

            <div style={{ marginBottom: 8 }}>
                <Text style={{ display: 'block', marginBottom: 4 }}>密码 <span style={{ color: '#ff4d4f' }}>*</span></Text>
                <Password
                    placeholder="请输入密码"
                    value={loginForm.password}
                    onChange={(e) => {
                        setLoginForm(prev => ({ ...prev, password: e.target.value }));
                        if (error) setError('');
                    }}
                    autoComplete="current-password"
                    size="large"
                    onPressEnter={handleLoginSubmit}
                    iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    如果账户未设置密码，默认密码为：admin
                </Text>
            </div>

            <Button
                type="primary"
                block
                size="large"
                loading={loading}
                onClick={handleLoginSubmit}
                style={{ marginTop: 24, marginBottom: 16, height: 48 }}
            >
                登录
            </Button>

            {/* OAuth登录 */}
            {oauthProviders.length > 0 && (
                <>
                    <Divider plain>
                        <Text type="secondary" style={{ fontSize: 12 }}>或使用第三方登录</Text>
                    </Divider>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {oauthProviders.map((provider) => (
                            <Button
                                key={provider.oauth_name}
                                block
                                size="large"
                                loading={oauthLoading[provider.oauth_name]}
                                icon={getOAuthIcon(provider.oauth_type)}
                                onClick={() => handleOAuthLogin(provider.oauth_name)}
                                style={{
                                    height: 48,
                                    borderColor: getOAuthColor(provider.oauth_type),
                                    color: getOAuthColor(provider.oauth_type),
                                }}
                            >
                                使用 {provider.oauth_name} 登录
                            </Button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );

    // 注册面板
    const registerPanel = (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Text style={{ display: 'block', marginBottom: 4 }}>用户名 <span style={{ color: '#ff4d4f' }}>*</span></Text>
                <Input
                    placeholder="请输入用户名"
                    value={registerForm.username}
                    onChange={(e) => {
                        setRegisterForm(prev => ({ ...prev, username: e.target.value }));
                        if (error) setError('');
                    }}
                    autoComplete="username"
                    size="large"
                />
            </div>

            <div style={{ marginBottom: 16 }}>
                <Text style={{ display: 'block', marginBottom: 4 }}>邮箱 <span style={{ color: '#ff4d4f' }}>*</span></Text>
                <Input
                    placeholder="请输入邮箱"
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => {
                        setRegisterForm(prev => ({ ...prev, email: e.target.value }));
                        if (error) setError('');
                    }}
                    autoComplete="email"
                    size="large"
                />
            </div>

            <div style={{ marginBottom: 16 }}>
                <Text style={{ display: 'block', marginBottom: 4 }}>密码 <span style={{ color: '#ff4d4f' }}>*</span></Text>
                <Password
                    placeholder="请输入密码"
                    value={registerForm.password}
                    onChange={(e) => {
                        setRegisterForm(prev => ({ ...prev, password: e.target.value }));
                        if (error) setError('');
                    }}
                    autoComplete="new-password"
                    size="large"
                    iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                />
            </div>

            <div style={{ marginBottom: 16 }}>
                <Text style={{ display: 'block', marginBottom: 4 }}>确认密码 <span style={{ color: '#ff4d4f' }}>*</span></Text>
                <Password
                    placeholder="请再次输入密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) => {
                        setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }));
                        if (error) setError('');
                    }}
                    autoComplete="new-password"
                    size="large"
                    onPressEnter={handleRegisterSubmit}
                    iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                />
            </div>

            <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8 }}>
                    <Checkbox
                        checked={registerForm.agreeTerms}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, agreeTerms: e.target.checked }))}
                    >
                        <Text style={{ fontSize: 13 }}>我同意 <AntdLink href="#">服务条款</AntdLink></Text>
                    </Checkbox>
                </div>
                <div>
                    <Checkbox
                        checked={registerForm.agreePrivacy}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, agreePrivacy: e.target.checked }))}
                    >
                        <Text style={{ fontSize: 13 }}>我同意 <AntdLink href="#">隐私政策</AntdLink></Text>
                    </Checkbox>
                </div>
            </div>

            <Button
                type="primary"
                block
                size="large"
                loading={loading}
                onClick={handleRegisterSubmit}
                style={{ marginTop: 24, marginBottom: 16, height: 48 }}
            >
                注册
            </Button>
        </div>
    );

    const tabItems = [
        {
            key: 'login',
            label: (
                <span>
                    <LoginOutlined style={{ marginRight: 8 }} />
                    登录
                </span>
            ),
            children: loginPanel,
        },
        {
            key: 'register',
            label: (
                <span>
                    <UserAddOutlined style={{ marginRight: 8 }} />
                    注册
                </span>
            ),
            children: registerPanel,
        },
    ];

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: 16,
                margin: 0,
                position: 'fixed',
                top: 0,
                left: 0,
                overflow: 'auto',
            }}
        >
            <Card
                style={{
                    width: '100%',
                    maxWidth: 450,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    borderRadius: 12,
                }}
                styles={{ body: { padding: 32 } }}
            >
                {/* Logo和标题 */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={3} style={{ fontWeight: 'bold', color: '#1677ff', marginBottom: 4 }}>
                        OpenList
                    </Title>
                    <Text type="secondary">
                        欢迎使用文件管理系统
                    </Text>
                </div>

                {/* 错误提示 */}
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError('')}
                        style={{ marginBottom: 16 }}
                    />
                )}

                {/* 标签页 */}
                <Tabs
                    activeKey={tabValue}
                    onChange={handleTabChange}
                    centered
                    items={tabItems}
                />
            </Card>
        </div>
    );
};

export default AuthPage;