import React, { useState, useEffect, useRef } from 'react';
import {
    Input,
    Button,
    Typography,
    Alert,
    Checkbox,
    Tabs,
    Divider,
    Form,
    App,
} from 'antd';
import {
    LoginOutlined,
    UserAddOutlined,
    GoogleOutlined,
    GithubOutlined,
    WindowsOutlined,
    UserOutlined,
    LockOutlined,
    MailOutlined,
    FolderOutlined,
    ThunderboltOutlined,
    SafetyCertificateOutlined,
    CloudOutlined,
    TeamOutlined,
    ArrowRightOutlined,
    LinkOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { userApi } from '../../posts/api';
import oauthService from '../../services/OAuthService';
import { useAuthStore } from '../../store';
import type { UsersResult, UsersConfig } from '../../types';

const { Title, Text, Link: AntdLink } = Typography;

/* ─── 内联关键帧动画样式（与 LoginPage 共享同名前缀 ap-） ─── */
const animStyles = `
@keyframes ap-float-up {
  0%   { opacity: 0; transform: translateY(32px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes ap-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ap-pulse-glow {
  0%, 100% { box-shadow: 0 0 32px rgba(59,130,246,0.35), 0 0 64px rgba(139,92,246,0.15); }
  50%       { box-shadow: 0 0 48px rgba(59,130,246,0.55), 0 0 96px rgba(139,92,246,0.25); }
}
@keyframes ap-orbit {
  from { transform: rotate(0deg) translateX(110px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(110px) rotate(-360deg); }
}
@keyframes ap-orbit2 {
  from { transform: rotate(120deg) translateX(160px) rotate(-120deg); }
  to   { transform: rotate(480deg) translateX(160px) rotate(-480deg); }
}
@keyframes ap-orbit3 {
  from { transform: rotate(240deg) translateX(200px) rotate(-240deg); }
  to   { transform: rotate(600deg) translateX(200px) rotate(-600deg); }
}
.ap-float-1 { animation: ap-float-up 0.6s 0.05s ease-out both; }
.ap-float-2 { animation: ap-float-up 0.6s 0.15s ease-out both; }
.ap-float-3 { animation: ap-float-up 0.6s 0.25s ease-out both; }
.ap-float-4 { animation: ap-float-up 0.6s 0.35s ease-out both; }
.ap-float-5 { animation: ap-float-up 0.6s 0.45s ease-out both; }
.ap-fade    { animation: ap-fade-in  0.8s 0.1s  ease-out both; }
.ap-login-btn {
  position: relative; overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}
.ap-login-btn:hover  { transform: translateY(-2px) !important; box-shadow: 0 8px 28px rgba(59,130,246,0.45) !important; }
.ap-login-btn:active { transform: translateY(0) !important; }
.ap-input-wrap .ant-input-affix-wrapper,
.ap-input-wrap .ant-input {
  transition: border-color 0.25s, box-shadow 0.25s !important;
}
.ap-input-wrap .ant-input-affix-wrapper:hover,
.ap-input-wrap .ant-input:hover {
  border-color: rgba(59,130,246,0.6) !important;
}
.ap-input-wrap .ant-input-affix-wrapper-focused,
.ap-input-wrap .ant-input:focus {
  border-color: #3B82F6 !important;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important;
}
.ap-oauth-btn {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease !important;
}
.ap-oauth-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15) !important;
}
`;

/* ─── 特性统计数据 ─── */
const stats = [
    { icon: <CloudOutlined />,             value: '25+',  label: '网盘驱动' },
    { icon: <SafetyCertificateOutlined />, value: 'AES',  label: '军级加密' },
    { icon: <TeamOutlined />,              value: '∞',    label: '多用户' },
    { icon: <ThunderboltOutlined />,       value: 'Fast', label: '极致性能' },
];

/* ─── OAuth 图标 & 颜色 ─── */
const getOAuthIcon = (oauthType: string) => {
    switch (oauthType.toLowerCase()) {
        case 'google':    return <GoogleOutlined />;
        case 'github':    return <GithubOutlined />;
        case 'microsoft': return <WindowsOutlined />;
        default:          return <LinkOutlined />;
    }
};

const getOAuthColor = (oauthType: string) => {
    switch (oauthType.toLowerCase()) {
        case 'google':    return '#4285f4';
        case 'github':    return '#6e40c9';
        case 'microsoft': return '#0078d4';
        default:          return '#3B82F6';
    }
};

const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login: authLogin } = useAuthStore();
    const { message: msg } = App.useApp();
    const styleInjected = useRef(false);

    const [tabValue, setTabValue] = useState('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [oauthProviders, setOauthProviders] = useState<Array<{ oauth_name: string; oauth_type: string; is_enabled: boolean }>>([]);
    const [oauthLoading, setOauthLoading] = useState<Record<string, boolean>>({});

    const [loginForm] = Form.useForm();
    const [registerForm] = Form.useForm();

    /* 注入关键帧 */
    useEffect(() => {
        if (styleInjected.current) return;
        styleInjected.current = true;
        const el = document.createElement('style');
        el.textContent = animStyles;
        document.head.appendChild(el);
    }, []);

    /* 根据路由设置初始标签页 */
    useEffect(() => {
        setTabValue(location.pathname === '/register' ? 'register' : 'login');
    }, [location.pathname]);

    /* 获取 OAuth 提供商列表 */
    useEffect(() => {
        const fetchOAuthProviders = async (retryCount = 0) => {
            try {
                const response = await oauthService.getAvailableProviders();
                if (response.flag && response.data) {
                    setOauthProviders(response.data.filter((p: any) => p.is_enabled === 1));
                } else if (retryCount < 2) {
                    setTimeout(() => fetchOAuthProviders(retryCount + 1), 1000 * (retryCount + 1));
                }
            } catch {
                if (retryCount < 2) setTimeout(() => fetchOAuthProviders(retryCount + 1), 1000 * (retryCount + 1));
            }
        };
        fetchOAuthProviders();
    }, []);

    const handleTabChange = (key: string) => { setTabValue(key); setError(''); };

    /* ─── 登录 ─── */
    const handleLoginSubmit = async (values: any) => {
        setLoading(true);
        setError('');
        try {
            const response: any = await userApi.login({ username: values.username, password: values.password });
            const token = response?.token || response?.data?.token;
            if (token) {
                // 先用 token 临时登录，再获取完整用户信息
                authLogin(token, { users_name: values.username, users_mail: '' });
                try {
                    const meResp: any = await userApi.getMe();
                    const userInfo = meResp?.users_name ? meResp : meResp?.data || meResp;
                    if (userInfo?.users_name) {
                        authLogin(token, {
                            users_name: userInfo.users_name,
                            users_mail: userInfo.users_mail || '',
                            users_mask: userInfo.users_mask || '',
                        });
                    }
                } catch {
                    // 获取用户信息失败不影响登录
                }
                msg.success('登录成功');
                const from = (location.state as any)?.from?.pathname || '/files';
                navigate(from, { replace: true });
            } else {
                setError(response?.message || '登录失败');
            }
        } catch (err: any) {
            setError(err.name === 'ApiError' ? err.message : err.response?.data?.message || err.message || '登录失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    /* ─── OAuth 登录 ─── */
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
                setError(result.text || '获取OAuth授权URL失败');
            }
        } catch (err: any) {
            setError(err.message || 'OAuth登录失败');
        } finally {
            setOauthLoading(prev => ({ ...prev, [oauthName]: false }));
        }
    };

    /* ─── 注册 ─── */
    const handleRegisterSubmit = async (values: any) => {
        setLoading(true);
        setError('');
        try {
            const response: any = await userApi.register({
                username: values.username,
                email: values.email,
                password: values.password,
            });
            if (response && !response.message) {
                msg.success('注册成功！请登录');
                setTabValue('login');
                registerForm.resetFields();
            } else {
                setError(response?.message || '注册失败');
            }
        } catch (err: any) {
            setError(err.name === 'ApiError' ? err.message : err.response?.data?.text || err.message || '注册失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    /* ─── 通用样式 ─── */
    const primaryBtnStyle: React.CSSProperties = {
        height: 46,
        fontWeight: 600,
        fontSize: 15,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
        border: 'none',
        boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
        letterSpacing: '0.02em',
    };

    const inputItemStyle: React.CSSProperties = { marginBottom: 16 };

    /* ─── 登录面板 ─── */
    const loginPanel = (
        <div style={{ paddingTop: 20 }}>
            <div style={{ marginBottom: 28 }}>
                <Title level={3} style={{ marginBottom: 6, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                    欢迎回来
                </Title>
                <Text type="secondary" style={{ fontSize: 14 }}>登录您的 OpenList 账号</Text>
            </div>

            <Form form={loginForm} onFinish={handleLoginSubmit} size="large" layout="vertical">
                <Form.Item name="username" style={inputItemStyle} rules={[{ required: true, message: '请输入用户名' }]}>
                    <div className="ap-input-wrap">
                        <Input
                            prefix={<UserOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                            placeholder="用户名"
                            autoComplete="username"
                            style={{ borderRadius: 10, height: 46 }}
                        />
                    </div>
                </Form.Item>

                <Form.Item name="password" style={{ marginBottom: 24 }} rules={[{ required: true, message: '请输入密码' }]}>
                    <div className="ap-input-wrap">
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                            placeholder="密码"
                            autoComplete="current-password"
                            style={{ borderRadius: 10, height: 46 }}
                        />
                    </div>
                </Form.Item>

                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 20, marginTop: -16 }}>
                    未设置密码时，默认密码为：admin
                </Text>

                <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        className="ap-login-btn"
                        style={primaryBtnStyle}
                        icon={!loading && <ArrowRightOutlined />}
                        iconPosition="end"
                    >
                        登录
                    </Button>
                </Form.Item>
            </Form>

            {/* OAuth 登录 */}
            {oauthProviders.length > 0 && (
                <>
                    <Divider plain style={{ margin: '20px 0' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>或使用第三方登录</Text>
                    </Divider>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {oauthProviders.map((provider) => (
                            <Button
                                key={provider.oauth_name}
                                block
                                size="large"
                                loading={oauthLoading[provider.oauth_name]}
                                icon={getOAuthIcon(provider.oauth_type)}
                                onClick={() => handleOAuthLogin(provider.oauth_name)}
                                className="ap-oauth-btn"
                                style={{
                                    height: 46,
                                    borderRadius: 10,
                                    borderColor: getOAuthColor(provider.oauth_type),
                                    color: getOAuthColor(provider.oauth_type),
                                    fontWeight: 500,
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

    /* ─── 注册面板 ─── */
    const registerPanel = (
        <div style={{ paddingTop: 20 }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 6, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                    创建账号
                </Title>
                <Text type="secondary" style={{ fontSize: 14 }}>加入 OpenList，开始管理您的文件</Text>
            </div>

            <Form form={registerForm} onFinish={handleRegisterSubmit} size="large" layout="vertical">
                <Form.Item name="username" style={inputItemStyle} rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '至少3个字符' }]}>
                    <div className="ap-input-wrap">
                        <Input
                            prefix={<UserOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                            placeholder="用户名"
                            autoComplete="username"
                            style={{ borderRadius: 10, height: 46 }}
                        />
                    </div>
                </Form.Item>

                <Form.Item name="email" style={inputItemStyle} rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
                    <div className="ap-input-wrap">
                        <Input
                            prefix={<MailOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                            placeholder="邮箱"
                            autoComplete="email"
                            style={{ borderRadius: 10, height: 46 }}
                        />
                    </div>
                </Form.Item>

                <Form.Item name="password" style={inputItemStyle} rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '至少6个字符' }]}>
                    <div className="ap-input-wrap">
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                            placeholder="密码"
                            autoComplete="new-password"
                            style={{ borderRadius: 10, height: 46 }}
                        />
                    </div>
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    style={{ marginBottom: 16 }}
                    dependencies={['password']}
                    rules={[
                        { required: true, message: '请确认密码' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) return Promise.resolve();
                                return Promise.reject(new Error('两次密码不一致'));
                            },
                        }),
                    ]}
                >
                    <div className="ap-input-wrap">
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                            placeholder="确认密码"
                            autoComplete="new-password"
                            style={{ borderRadius: 10, height: 46 }}
                        />
                    </div>
                </Form.Item>

                <Form.Item name="agreeTerms" valuePropName="checked" style={{ marginBottom: 8 }} rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject('请同意服务条款') }]}>
                    <Checkbox><Text style={{ fontSize: 13 }}>我同意 <AntdLink href="#">服务条款</AntdLink></Text></Checkbox>
                </Form.Item>

                <Form.Item name="agreePrivacy" valuePropName="checked" style={{ marginBottom: 24 }} rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject('请同意隐私政策') }]}>
                    <Checkbox><Text style={{ fontSize: 13 }}>我同意 <AntdLink href="#">隐私政策</AntdLink></Text></Checkbox>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        className="ap-login-btn"
                        style={primaryBtnStyle}
                        icon={!loading && <ArrowRightOutlined />}
                        iconPosition="end"
                    >
                        注册
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', background: '#0D1117' }}>

            {/* ══════════ 左侧品牌区域 ══════════ */}
            <div
                className="hide-on-mobile ap-fade"
                style={{
                    flex: '0 0 46%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '60px 56px',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(145deg, #0a1628 0%, #0f1f3d 40%, #162040 70%, #1a2a50 100%)',
                }}
            >
                {/* 多层光晕背景 */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: `
                        radial-gradient(ellipse 70% 60% at 15% 85%, rgba(59,130,246,0.18) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 50% at 85% 15%, rgba(139,92,246,0.14) 0%, transparent 55%),
                        radial-gradient(ellipse 50% 40% at 50% 50%, rgba(16,185,129,0.07) 0%, transparent 60%)
                    `,
                }} />

                {/* 网格纹理 */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: `
                        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
                        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)
                    `,
                    backgroundSize: '56px 56px',
                }} />

                {/* 装饰圆环 */}
                <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', border: '1px solid rgba(59,130,246,0.08)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', border: '1px solid rgba(139,92,246,0.07)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />

                {/* 轨道小点 */}
                {[
                    { anim: 'ap-orbit',  size: 8, color: '#3B82F6', dur: '12s' },
                    { anim: 'ap-orbit2', size: 6, color: '#8B5CF6', dur: '18s' },
                    { anim: 'ap-orbit3', size: 5, color: '#10B981', dur: '24s' },
                ].map((dot, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        width: dot.size, height: dot.size,
                        marginTop: -dot.size / 2, marginLeft: -dot.size / 2,
                        borderRadius: '50%',
                        background: dot.color,
                        boxShadow: `0 0 8px ${dot.color}`,
                        animation: `${dot.anim} ${dot.dur} linear infinite`,
                        pointerEvents: 'none',
                    }} />
                ))}

                {/* 品牌内容 */}
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 420 }}>
                    {/* Logo */}
                    <div className="ap-float-1" style={{
                        width: 88, height: 88, borderRadius: 24,
                        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 28px',
                        animation: 'ap-float-up 0.6s 0.05s ease-out both, ap-pulse-glow 3s 1s ease-in-out infinite',
                        boxShadow: '0 12px 40px rgba(59,130,246,0.4)',
                    }}>
                        <FolderOutlined style={{ fontSize: 40, color: '#fff' }} />
                    </div>

                    {/* 标题 */}
                    <div className="ap-float-2">
                        <Title level={1} style={{
                            color: '#fff', margin: '0 0 4px',
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontWeight: 800, fontSize: 48,
                            letterSpacing: '-0.04em', lineHeight: 1.1,
                        }}>
                            OpenList
                        </Title>
                        <div style={{
                            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', marginBottom: 20,
                        }}>
                            <Text style={{ color: '#93C5FD', fontSize: 12, fontWeight: 500, letterSpacing: '0.08em' }}>
                                UNIFIED FILE MANAGEMENT
                            </Text>
                        </div>
                    </div>

                    {/* 副标题 */}
                    <div className="ap-float-3">
                        <p style={{
                            color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.7,
                            fontFamily: "'Noto Sans SC', sans-serif", margin: '0 0 40px',
                        }}>
                            统一文件管理系统，支持 25+ 网盘驱动
                            <br />
                            安全加密 · 灵活配置 · 极致性能
                        </p>
                    </div>

                    {/* 统计卡片 */}
                    <div className="ap-float-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 36 }}>
                        {stats.map((s) => (
                            <div key={s.label} style={{
                                padding: '14px 8px', borderRadius: 14,
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(8px)', textAlign: 'center',
                                transition: 'background 0.2s, transform 0.2s',
                            }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(59,130,246,0.12)';
                                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
                                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                                }}
                            >
                                <div style={{ color: '#60A5FA', fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
                                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* 特性标签 */}
                    <div className="ap-float-5" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                        {['WebDAV', 'S3 协议', 'FTP/SFTP', 'NFS', 'SMB', '离线下载'].map(tag => (
                            <span key={tag} style={{
                                padding: '5px 13px', borderRadius: 20,
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500,
                                transition: 'background 0.2s, transform 0.2s', cursor: 'default',
                            }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLSpanElement).style.background = 'rgba(59,130,246,0.15)';
                                    (e.currentTarget as HTMLSpanElement).style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLSpanElement).style.background = 'rgba(255,255,255,0.06)';
                                    (e.currentTarget as HTMLSpanElement).style.transform = 'translateY(0)';
                                }}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 底部装饰线 */}
                <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    {[1, 0.4, 0.2].map((op, i) => (
                        <div key={i} style={{ width: i === 0 ? 24 : 8, height: 3, borderRadius: 2, background: `rgba(59,130,246,${op})` }} />
                    ))}
                </div>
            </div>

            {/* ══════════ 右侧表单区域 ══════════ */}
            <div style={{
                flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
                padding: '40px 24px', position: 'relative',
            }}>
                {/* 右侧背景光晕 */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: `
                        radial-gradient(ellipse 60% 50% at 70% 30%, rgba(59,130,246,0.06) 0%, transparent 60%),
                        radial-gradient(ellipse 50% 40% at 30% 80%, rgba(139,92,246,0.05) 0%, transparent 55%)
                    `,
                }} />

                <div className="ap-float-2" style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

                    {/* 移动端 Logo */}
                    <div className="show-on-mobile-only" style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{
                            width: 60, height: 60, borderRadius: 16,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 28px rgba(59,130,246,0.35)', marginBottom: 14,
                        }}>
                            <FolderOutlined style={{ fontSize: 26, color: '#fff' }} />
                        </div>
                        <Title level={3} style={{
                            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, letterSpacing: '-0.03em',
                            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0,
                        }}>
                            OpenList
                        </Title>
                    </div>

                    {/* 玻璃态表单卡片 */}
                    <div style={{
                        borderRadius: 24, padding: '36px 40px 32px',
                        background: 'rgba(22, 27, 40, 0.75)',
                        backdropFilter: 'blur(24px) saturate(160%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset',
                    }}>
                        {/* 错误提示 */}
                        {error && (
                            <Alert
                                message={error}
                                type="error"
                                showIcon
                                closable
                                onClose={() => setError('')}
                                style={{ marginBottom: 16, borderRadius: 10 }}
                            />
                        )}

                        <Tabs
                            activeKey={tabValue}
                            onChange={handleTabChange}
                            centered
                            size="large"
                            style={{ marginBottom: 0 }}
                            items={[
                                {
                                    key: 'login',
                                    label: (
                                        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '0.01em' }}>
                                            <LoginOutlined style={{ marginRight: 6 }} />登录
                                        </span>
                                    ),
                                    children: loginPanel,
                                },
                                {
                                    key: 'register',
                                    label: (
                                        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '0.01em' }}>
                                            <UserAddOutlined style={{ marginRight: 6 }} />注册
                                        </span>
                                    ),
                                    children: registerPanel,
                                },
                            ]}
                        />
                    </div>

                    {/* 底部版权 */}
                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                        <Text type="secondary" style={{ fontSize: 12, letterSpacing: '0.02em' }}>
                            © 2026 OpenList · Built with ❤️ by OpenListTeam
                        </Text>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;