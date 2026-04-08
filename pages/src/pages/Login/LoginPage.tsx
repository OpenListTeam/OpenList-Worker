/**
 * 登录页面 — 精致极简 + 玻璃态设计
 *
 * 设计风格：
 *   - 左侧：动态光晕背景 + 品牌区域 + 特性统计
 *   - 右侧：玻璃态表单卡片 + 入场动画
 *   - 支持浅色 / 深色 / 透明三种模式
 *   - 响应式适配移动端
 */
import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Typography, App, Tabs } from 'antd';
import {
  UserOutlined, LockOutlined, MailOutlined, FolderOutlined,
  ThunderboltOutlined, SafetyCertificateOutlined, CloudOutlined,
  TeamOutlined, ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useThemeStore } from '../../store';
import api from '../../posts/api';

const { Title, Text, Paragraph } = Typography;

/* ─── 内联关键帧动画样式 ─── */
const animStyles = `
@keyframes ol-float-up {
  0%   { opacity: 0; transform: translateY(32px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes ol-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ol-pulse-glow {
  0%, 100% { box-shadow: 0 0 32px rgba(59,130,246,0.35), 0 0 64px rgba(139,92,246,0.15); }
  50%       { box-shadow: 0 0 48px rgba(59,130,246,0.55), 0 0 96px rgba(139,92,246,0.25); }
}
@keyframes ol-orbit {
  from { transform: rotate(0deg) translateX(110px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(110px) rotate(-360deg); }
}
@keyframes ol-orbit2 {
  from { transform: rotate(120deg) translateX(160px) rotate(-120deg); }
  to   { transform: rotate(480deg) translateX(160px) rotate(-480deg); }
}
@keyframes ol-orbit3 {
  from { transform: rotate(240deg) translateX(200px) rotate(-240deg); }
  to   { transform: rotate(600deg) translateX(200px) rotate(-600deg); }
}
@keyframes ol-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes ol-spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.ol-float-1 { animation: ol-float-up 0.6s 0.05s ease-out both; }
.ol-float-2 { animation: ol-float-up 0.6s 0.15s ease-out both; }
.ol-float-3 { animation: ol-float-up 0.6s 0.25s ease-out both; }
.ol-float-4 { animation: ol-float-up 0.6s 0.35s ease-out both; }
.ol-float-5 { animation: ol-float-up 0.6s 0.45s ease-out both; }
.ol-fade    { animation: ol-fade-in  0.8s 0.1s  ease-out both; }
.ol-login-btn {
  position: relative; overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}
.ol-login-btn:hover  { transform: translateY(-2px) !important; box-shadow: 0 8px 28px rgba(59,130,246,0.45) !important; }
.ol-login-btn:active { transform: translateY(0)    !important; }
.ol-input-wrap .ant-input-affix-wrapper,
.ol-input-wrap .ant-input {
  transition: border-color 0.25s, box-shadow 0.25s !important;
}
.ol-input-wrap .ant-input-affix-wrapper:hover,
.ol-input-wrap .ant-input:hover {
  border-color: rgba(59,130,246,0.6) !important;
}
.ol-input-wrap .ant-input-affix-wrapper-focused,
.ol-input-wrap .ant-input:focus {
  border-color: #3B82F6 !important;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important;
}
.ol-tag-item {
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  cursor: default;
}
.ol-tag-item:hover {
  background: rgba(59,130,246,0.15) !important;
  border-color: rgba(59,130,246,0.35) !important;
  transform: translateY(-2px);
}
`;

/* ─── 特性统计数据 ─── */
const stats = [
  { icon: <CloudOutlined />,               value: '25+',  label: '网盘驱动' },
  { icon: <SafetyCertificateOutlined />,   value: 'AES',  label: '军级加密' },
  { icon: <TeamOutlined />,                value: '∞',    label: '多用户' },
  { icon: <ThunderboltOutlined />,         value: 'Fast', label: '极致性能' },
];

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const { themeMode } = useThemeStore();
  const { message: msg } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginForm] = Form.useForm();
  const [regForm] = Form.useForm();
  const styleInjected = useRef(false);

  /* 注入关键帧 */
  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const el = document.createElement('style');
    el.textContent = animStyles;
    document.head.appendChild(el);
  }, []);

  /* 已登录跳转 */
  useEffect(() => {
    if (isAuthenticated) navigate('/files', { replace: true });
  }, [isAuthenticated, navigate]);

  /* 登录 */
  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res: Record<string, unknown> = await api.post('/api/auth/login', {
        username: values.username,
        password: values.password,
      });
      // 拦截器已解包：res 为 { token: "..." }，或原始 { code, message, data }
      const token = res?.token || res?.data?.token;
      if (token) {
        // 获取完整用户信息
        try {
          const meRes: any = await api.get('/api/me');
          const userInfo = meRes?.users_name ? meRes : (meRes?.data || {});
          login(token, {
            users_name: userInfo.users_name || values.username,
            users_mail: userInfo.users_mail || '',
            users_mask: userInfo.users_mask || '',
          });
        } catch {
          login(token, { users_name: values.username, users_mail: '', users_mask: '' });
        }
        msg.success(t('common.success'));
        navigate('/files', { replace: true });
      } else {
        msg.error(res?.message || t('common.failed'));
      }
    } catch (err: any) {
      msg.error(err.message || err.response?.data?.message || t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  /* 注册 */
  const handleRegister = async (values: { username: string; password: string; email?: string }) => {
    setLoading(true);
    try {
      // 拦截器已解包：成功时返回 {} 或 data 内容，失败时抛出 ApiError
      await api.post('/api/admin/user/create', {
        username: values.username,
        password: values.password,
        email: values.email || '',
        role: 'general',
        permission: 0,
        disabled: false,
      });
      msg.success(t('common.success'));
      setActiveTab('login');
      loginForm.setFieldsValue({ username: values.username });
    } catch (err: any) {
      msg.error(err.message || err.response?.data?.message || t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  const isDark = themeMode === 'dark' || themeMode === 'transparent';

  /* ─── 通用按钮样式 ─── */
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

  /* ─── 表单输入框包裹样式 ─── */
  const inputItemStyle: React.CSSProperties = { marginBottom: 16 };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      overflow: 'hidden',
      background: isDark ? '#0D1117' : '#F0F4FF',
    }}>

      {/* ══════════ 左侧品牌区域 ══════════ */}
      <div
        className="hide-on-mobile ol-fade"
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
        <div style={{
          position: 'absolute',
          width: 480, height: 480,
          borderRadius: '50%',
          border: '1px solid rgba(59,130,246,0.08)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          width: 360, height: 360,
          borderRadius: '50%',
          border: '1px solid rgba(139,92,246,0.07)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />

        {/* 轨道小点 */}
        {[
          { anim: 'ol-orbit',  size: 8,  color: '#3B82F6', dur: '12s' },
          { anim: 'ol-orbit2', size: 6,  color: '#8B5CF6', dur: '18s' },
          { anim: 'ol-orbit3', size: 5,  color: '#10B981', dur: '24s' },
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
          <div className="ol-float-1" style={{
            width: 88, height: 88, borderRadius: 24,
            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            animation: 'ol-float-up 0.6s 0.05s ease-out both, ol-pulse-glow 3s 1s ease-in-out infinite',
            boxShadow: '0 12px 40px rgba(59,130,246,0.4)',
          }}>
            <FolderOutlined style={{ fontSize: 40, color: '#fff' }} />
          </div>

          {/* 标题 */}
          <div className="ol-float-2">
            <Title level={1} style={{
              color: '#fff', margin: '0 0 4px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800, fontSize: 48,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
            }}>
              OpenList
            </Title>
            <div style={{
              display: 'inline-block',
              padding: '3px 12px',
              borderRadius: 20,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.25)',
              marginBottom: 20,
            }}>
              <Text style={{ color: '#93C5FD', fontSize: 12, fontWeight: 500, letterSpacing: '0.08em' }}>
                统一文件管理系统，支持 25+ 网盘驱动
              </Text>
            </div>
          </div>

          {/* 副标题 */}
          <div className="ol-float-3">
            <Paragraph style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 15, lineHeight: 1.7,
              fontFamily: "'Noto Sans SC', sans-serif",
              margin: '0 0 40px',
            }}>

              <br />
              安全加密 · 灵活配置 · 极致性能
            </Paragraph>
          </div>

          {/* 统计卡片 */}
          <div className="ol-float-4" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
            marginBottom: 36,
          }}>
            {stats.map((s) => (
              <div key={s.label} style={{
                padding: '14px 8px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
                textAlign: 'center',
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
          <div className="ol-float-5" style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
          }}>
            {['25+网盘支持', '多用户管理', 'WebDAV', '在线预览', '媒体库', '压缩加密'].map(tag => (
              <span key={tag} className="ol-tag-item" style={{
                padding: '5px 13px', borderRadius: 20,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12, fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 底部装饰线 */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 6, alignItems: 'center',
        }}>
          {[1, 0.4, 0.2].map((op, i) => (
            <div key={i} style={{
              width: i === 0 ? 24 : 8, height: 3, borderRadius: 2,
              background: `rgba(59,130,246,${op})`,
            }} />
          ))}
        </div>
      </div>

      {/* ══════════ 右侧表单区域 ══════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 24px',
        position: 'relative',
      }}>
        {/* 右侧背景光晕 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: isDark
            ? `radial-gradient(ellipse 60% 50% at 70% 30%, rgba(59,130,246,0.06) 0%, transparent 60%),
               radial-gradient(ellipse 50% 40% at 30% 80%, rgba(139,92,246,0.05) 0%, transparent 55%)`
            : `radial-gradient(ellipse 60% 50% at 70% 30%, rgba(59,130,246,0.08) 0%, transparent 60%),
               radial-gradient(ellipse 50% 40% at 30% 80%, rgba(139,92,246,0.06) 0%, transparent 55%)`,
        }} />

        <div className="ol-float-2" style={{ width: '100%', maxWidth: 420, position: 'relative' }}>

          {/* 移动端 Logo */}
          <div className="show-on-mobile-only" style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 28px rgba(59,130,246,0.35)',
              marginBottom: 14,
            }}>
              <FolderOutlined style={{ fontSize: 26, color: '#fff' }} />
            </div>
            <Title level={3} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800, letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>
              OpenList
            </Title>
          </div>

          {/* 玻璃态表单卡片 */}
          <div style={{
            borderRadius: 24,
            padding: '36px 40px 32px',
            background: isDark
              ? 'rgba(22, 27, 40, 0.75)'
              : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px) saturate(160%)',
            border: isDark
              ? '1px solid rgba(255,255,255,0.07)'
              : '1px solid rgba(59,130,246,0.12)',
            boxShadow: isDark
              ? '0 24px 64px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset'
              : '0 24px 64px rgba(59,130,246,0.1), 0 1px 0 rgba(255,255,255,0.8) inset',
          }}>

            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'login' | 'register')}
              centered
              size="large"
              style={{ marginBottom: 0 }}
              items={[
                {
                  key: 'login',
                  label: (
                    <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '0.01em' }}>
                      {t('login.loginButton')}
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 20 }}>
                      <div style={{ marginBottom: 28 }}>
                        <Title level={3} style={{
                          marginBottom: 6, fontWeight: 700,
                          fontFamily: "'Space Grotesk', sans-serif",
                          letterSpacing: '-0.02em',
                        }}>
                          {t('login.title')}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          {t('login.subtitle')}
                        </Text>
                      </div>

                      <Form form={loginForm} onFinish={handleLogin} size="large" layout="vertical">
                        <Form.Item
                          name="username"
                          style={inputItemStyle}
                          rules={[{ required: true, message: t('login.username') + '不能为空' }]}
                        >
                          <div className="ol-input-wrap">
                            <Input
                              prefix={<UserOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                              placeholder={t('login.username')}
                              autoComplete="username"
                              style={{ borderRadius: 10, height: 46 }}
                            />
                          </div>
                        </Form.Item>

                        <Form.Item
                          name="password"
                          style={{ marginBottom: 24 }}
                          rules={[{ required: true, message: t('login.password') + '不能为空' }]}
                        >
                          <div className="ol-input-wrap">
                            <Input.Password
                              prefix={<LockOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                              placeholder={t('login.password')}
                              autoComplete="current-password"
                              style={{ borderRadius: 10, height: 46 }}
                            />
                          </div>
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            className="ol-login-btn"
                            style={primaryBtnStyle}
                            icon={!loading && <ArrowRightOutlined />}
                            iconPosition="end"
                          >
                            {t('login.loginButton')}
                          </Button>
                        </Form.Item>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: 'register',
                  label: (
                    <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '0.01em' }}>
                      {t('login.registerButton')}
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 20 }}>
                      <div style={{ marginBottom: 24 }}>
                        <Title level={3} style={{
                          marginBottom: 6, fontWeight: 700,
                          fontFamily: "'Space Grotesk', sans-serif",
                          letterSpacing: '-0.02em',
                        }}>
                          {t('login.registerTitle')}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          {t('login.registerSubtitle')}
                        </Text>
                      </div>

                      <Form form={regForm} onFinish={handleRegister} size="large" layout="vertical">
                        <Form.Item
                          name="username"
                          style={inputItemStyle}
                          rules={[
                            { required: true, message: t('login.username') + '不能为空' },
                            { min: 3, message: '至少3个字符' },
                          ]}
                        >
                          <div className="ol-input-wrap">
                            <Input
                              prefix={<UserOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                              placeholder={t('login.username')}
                              style={{ borderRadius: 10, height: 46 }}
                            />
                          </div>
                        </Form.Item>

                        <Form.Item name="email" style={inputItemStyle}>
                          <div className="ol-input-wrap">
                            <Input
                              prefix={<MailOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                              placeholder={t('login.email') + '（可选）'}
                              style={{ borderRadius: 10, height: 46 }}
                            />
                          </div>
                        </Form.Item>

                        <Form.Item
                          name="password"
                          style={inputItemStyle}
                          rules={[
                            { required: true, message: t('login.password') + '不能为空' },
                            { min: 6, message: '至少6个字符' },
                          ]}
                        >
                          <div className="ol-input-wrap">
                            <Input.Password
                              prefix={<LockOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                              placeholder={t('login.password')}
                              style={{ borderRadius: 10, height: 46 }}
                            />
                          </div>
                        </Form.Item>

                        <Form.Item
                          name="confirmPassword"
                          style={{ marginBottom: 24 }}
                          dependencies={['password']}
                          rules={[
                            { required: true, message: t('login.confirmPassword') + '不能为空' },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                  return Promise.resolve();
                                }
                                return Promise.reject(new Error('两次密码不一致'));
                              },
                            }),
                          ]}
                        >
                          <div className="ol-input-wrap">
                            <Input.Password
                              prefix={<LockOutlined style={{ color: '#3B82F6', opacity: 0.8 }} />}
                              placeholder={t('login.confirmPassword')}
                              style={{ borderRadius: 10, height: 46 }}
                            />
                          </div>
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            className="ol-login-btn"
                            style={primaryBtnStyle}
                            icon={!loading && <ArrowRightOutlined />}
                            iconPosition="end"
                          >
                            {t('login.registerButton')}
                          </Button>
                        </Form.Item>
                      </Form>
                    </div>
                  ),
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

export default LoginPage;
