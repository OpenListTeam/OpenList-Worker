/**
 * 登录页面 — 纯Antd现代设计
 * 
 * 设计风格：
 *   - 左侧品牌区域（渐变背景 + Logo + Slogan）
 *   - 右侧表单区域（登录/注册切换）
 *   - 支持暗黑模式和透明模式
 *   - 响应式适配移动端
 */
import React, { useState, useEffect } from 'react';
import {
  Form, Input, Button, Typography, Space, Divider, App, Tabs,
} from 'antd';
import {
  UserOutlined, LockOutlined, MailOutlined, FolderOutlined,
  GithubOutlined, GoogleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useThemeStore } from '../../store';
import api from '../../posts/api';

const { Title, Text, Paragraph } = Typography;

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

  // 已登录跳转
  useEffect(() => {
    if (isAuthenticated) navigate('/files', { replace: true });
  }, [isAuthenticated, navigate]);

  // 登录
  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const res = await api.post('/@users/login/none', {
        config: {
          users_name: values.username,
          users_pass: values.password,
        },
      });
      if (res.flag) {
        login(res.token, res.data);
        msg.success(t('common.success'));
        navigate('/files', { replace: true });
      } else {
        msg.error(res.text || t('common.failed'));
      }
    } catch (err: any) {
      msg.error(err.message || err.response?.data?.text || t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      const res = await api.post('/@users/create/none', {
        config: {
          users_name: values.username,
          users_pass: values.password,
          users_mail: values.email || '',
        },
      });
      if (res.flag) {
        msg.success(t('common.success'));
        setActiveTab('login');
        loginForm.setFieldsValue({ username: values.username });
      } else {
        msg.error(res.text || t('common.failed'));
      }
    } catch (err: any) {
      msg.error(err.message || err.response?.data?.text || t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  const isDark = themeMode === 'dark' || themeMode === 'transparent';

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      overflow: 'hidden',
      background: isDark ? '#111318' : '#F5F7FA',
    }}>
      {/* 左侧品牌区域 — 大屏可见 */}
      <div
        className="hide-on-mobile"
        style={{
          flex: '0 0 45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2027 30%, #203a43 60%, #2c5364 100%)',
        }}
      >
        {/* 装饰性背景元素 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(59, 130, 246, 0.15), transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.12), transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.06), transparent 60%)
          `,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />

        {/* 品牌内容 */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 32px',
            boxShadow: '0 12px 40px rgba(59, 130, 246, 0.4)',
          }}>
            <FolderOutlined style={{ fontSize: 36, color: '#fff' }} />
          </div>

          <Title level={1} style={{
            color: '#fff', margin: '0 0 16px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: 42,
            letterSpacing: '-0.03em',
          }}>
            OpenList
          </Title>

          <Paragraph style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 16, lineHeight: 1.6,
            fontFamily: "'Noto Sans SC', sans-serif",
          }}>
            统一文件管理系统，支持 25+ 网盘驱动
            <br />
            安全加密、灵活配置、极致性能
          </Paragraph>

          {/* 特性标签 */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            justifyContent: 'center', marginTop: 40,
          }}>
            {['AES-256 加密', '25+ 网盘', '多用户', 'WebDAV', '分享管理'].map(tag => (
              <span key={tag} style={{
                padding: '6px 14px', borderRadius: 20,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12, fontWeight: 500,
                backdropFilter: 'blur(10px)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧表单区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 400,
        }}>
          {/* 移动端Logo */}
          <div className="show-on-mobile-only" style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
              marginBottom: 16,
            }}>
              <FolderOutlined style={{ fontSize: 24, color: '#fff' }} />
            </div>
            <Title level={3} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>
              OpenList
            </Title>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'login' | 'register')}
            centered
            size="large"
            items={[
              {
                key: 'login',
                label: t('login.loginButton'),
                children: (
                  <div style={{ paddingTop: 16 }}>
                    <Title level={3} style={{ marginBottom: 4, fontWeight: 600 }}>
                      {t('login.title')}
                    </Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
                      {t('login.subtitle')}
                    </Text>

                    <Form form={loginForm} onFinish={handleLogin} size="large" layout="vertical">
                      <Form.Item
                        name="username"
                        rules={[{ required: true, message: t('login.username') + '不能为空' }]}
                      >
                        <Input
                          prefix={<UserOutlined style={{ opacity: 0.5 }} />}
                          placeholder={t('login.username')}
                          autoComplete="username"
                        />
                      </Form.Item>

                      <Form.Item
                        name="password"
                        rules={[{ required: true, message: t('login.password') + '不能为空' }]}
                      >
                        <Input.Password
                          prefix={<LockOutlined style={{ opacity: 0.5 }} />}
                          placeholder={t('login.password')}
                          autoComplete="current-password"
                        />
                      </Form.Item>

                      <Form.Item style={{ marginBottom: 16 }}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          style={{
                            height: 44,
                            fontWeight: 600,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                            border: 'none',
                            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                          }}
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
                label: t('login.registerButton'),
                children: (
                  <div style={{ paddingTop: 16 }}>
                    <Title level={3} style={{ marginBottom: 4, fontWeight: 600 }}>
                      {t('login.registerTitle')}
                    </Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
                      {t('login.registerSubtitle')}
                    </Text>

                    <Form form={regForm} onFinish={handleRegister} size="large" layout="vertical">
                      <Form.Item
                        name="username"
                        rules={[
                          { required: true, message: t('login.username') + '不能为空' },
                          { min: 3, message: '至少3个字符' },
                        ]}
                      >
                        <Input
                          prefix={<UserOutlined style={{ opacity: 0.5 }} />}
                          placeholder={t('login.username')}
                        />
                      </Form.Item>

                      <Form.Item name="email">
                        <Input
                          prefix={<MailOutlined style={{ opacity: 0.5 }} />}
                          placeholder={t('login.email') + '（可选）'}
                        />
                      </Form.Item>

                      <Form.Item
                        name="password"
                        rules={[
                          { required: true, message: t('login.password') + '不能为空' },
                          { min: 6, message: '至少6个字符' },
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined style={{ opacity: 0.5 }} />}
                          placeholder={t('login.password')}
                        />
                      </Form.Item>

                      <Form.Item
                        name="confirmPassword"
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
                        <Input.Password
                          prefix={<LockOutlined style={{ opacity: 0.5 }} />}
                          placeholder={t('login.confirmPassword')}
                        />
                      </Form.Item>

                      <Form.Item style={{ marginBottom: 16 }}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          style={{
                            height: 44,
                            fontWeight: 600,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                            border: 'none',
                            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                          }}
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

          {/* 底部版权 */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              © 2026 OpenList · Built with ❤️
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
