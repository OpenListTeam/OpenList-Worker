import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Input,
  Button,
  Avatar,
  Divider,
  Menu,
  Spin,
  Alert,
  message,
  Row,
  Col,
  Form,
  Progress,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  BgColorsOutlined,
  LeftOutlined,
  RightOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import apiService from '../../posts/api';
import { useAuthStore } from '../../store';
import OAuthBinding from '../../components/OAuthBinding';

const { Title, Text } = Typography;

const AccountSettings: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [userInfo, setUserInfo] = useState({
    username: '',
    email: '',
    storageUsed: '0 B',
    storageTotal: '1 GB',
    storageUsedBytes: 0,
    storageTotalBytes: 1,
    language: '简体中文',
    theme: '浅色模式',
  });

  const [formData, setFormData] = useState({
    users_mail: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 获取用户信息
  const loadUserInfo = async () => {
    try {
      setLoading(true);
      setError('');

      if (!user?.users_name) {
        setError('用户未登录');
        return;
      }

      const result = await apiService.get('/api/me');

      // 拦截器已解包：result 直接是用户信息对象
      const userData = result?.users_name ? result : (result?.data || result);
      if (userData?.users_name) {
        const usedBytes = userData.total_used || 0;
        const totalBytes = userData.total_size || 1024 * 1024 * 1024;
        setUserInfo({
          username: userData.users_name,
          email: userData.users_mail || '',
          storageUsed: formatBytes(usedBytes),
          storageTotal: formatBytes(totalBytes),
          storageUsedBytes: usedBytes,
          storageTotalBytes: totalBytes,
          language: '简体中文',
          theme: '浅色模式',
        });
        setFormData({
          users_mail: userData.users_mail || '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setError('获取用户信息失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取用户信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 格式化字节数
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    loadUserInfo();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError('');

      if (!user?.users_name) {
        setError('用户未登录');
        return;
      }

      const result = await apiService.post('/api/me/update', {
        email: formData.users_mail,
      });

      message.success('个人信息更新成功');
      await loadUserInfo();
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('更新个人信息失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setSaving(true);
      setError('');

      if (!user?.users_name) {
        setError('用户未登录');
        return;
      }

      if (!formData.newPassword || formData.newPassword.length < 6) {
        setError('新密码至少需要6个字符');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }

      const result = await apiService.post('/api/me/update', {
        password: formData.newPassword,
      });

      message.success('密码修改成功');
      setFormData((prev) => ({
        ...prev,
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('修改密码失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
    { key: 'security', icon: <LockOutlined />, label: '安全设置' },
    { key: 'notifications', icon: <BellOutlined />, label: '通知设置' },
    { key: 'storage', icon: <DatabaseOutlined />, label: '存储管理' },
    { key: 'language', icon: <GlobalOutlined />, label: '语言设置' },
    { key: 'theme', icon: <BgColorsOutlined />, label: '主题设置' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  const storagePercent =
    userInfo.storageTotalBytes > 0
      ? Math.round((userInfo.storageUsedBytes / userInfo.storageTotalBytes) * 100)
      : 0;

  // 渲染内容区域
  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <Card style={{ borderRadius: 15 }}>
            <Title level={5}>个人信息</Title>
            <Divider />
            <Form layout="vertical">
              <Row gutter={24}>
                <Col xs={24} lg={12}>
                  <Form.Item label="用户名" help="用户名不可修改">
                    <Input value={userInfo.username} disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} lg={12}>
                  <Form.Item label="邮箱地址">
                    <Input
                      type="email"
                      value={formData.users_mail}
                      onChange={(e) => handleInputChange('users_mail', e.target.value)}
                      disabled={saving}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveProfile}
                    loading={saving}
                    style={{ borderRadius: 8 }}
                  >
                    保存修改
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>
        );

      case 'security':
        return (
          <>
            <Card style={{ borderRadius: 15, marginBottom: 16 }}>
              <Title level={5}>修改密码</Title>
              <Divider />
              <Form layout="vertical">
                <Row gutter={24}>
                  <Col xs={24} lg={12}>
                    <Form.Item label="新密码" help="密码至少需要6个字符">
                      <Input.Password
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        disabled={saving}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Form.Item label="确认密码" help="请再次输入新密码">
                      <Input.Password
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        disabled={saving}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Button
                      type="primary"
                      icon={<LockOutlined />}
                      onClick={handleChangePassword}
                      loading={saving}
                      style={{ borderRadius: 8 }}
                    >
                      修改密码
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card>
            <OAuthBinding />
          </>
        );

      case 'storage':
        return (
          <Card style={{ borderRadius: 15 }}>
            <Title level={5}>存储管理</Title>
            <Divider />
            <div style={{ maxWidth: 400 }}>
              <Text>已使用 {userInfo.storageUsed} / {userInfo.storageTotal}</Text>
              <Progress percent={storagePercent} status="active" style={{ marginTop: 8 }} />
            </div>
          </Card>
        );

      case 'notifications':
        return (
          <Card style={{ borderRadius: 15 }}>
            <Title level={5}>通知设置</Title>
            <Divider />
            <Text type="secondary">通知设置功能开发中...</Text>
          </Card>
        );

      case 'language':
        return (
          <Card style={{ borderRadius: 15 }}>
            <Title level={5}>语言设置</Title>
            <Divider />
            <Text>当前语言：{userInfo.language}</Text>
          </Card>
        );

      case 'theme':
        return (
          <Card style={{ borderRadius: 15 }}>
            <Title level={5}>主题设置</Title>
            <Divider />
            <Text>当前主题：{userInfo.theme}</Text>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', padding: 0, overflow: 'hidden' }}>
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          style={{ margin: 16 }}
        />
      )}

      <Row style={{ width: '100%', height: '100%', margin: 0 }} wrap={false}>
        {/* 侧边栏 */}
        {!sidebarCollapsed && (
          <Col
            flex="280px"
            style={{
              height: '100%',
              padding: 16,
              borderRight: '1px solid var(--ant-color-border, #f0f0f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
            }}
          >
            {/* 用户头像卡片 */}
            <Card style={{ borderRadius: 15, textAlign: 'center' }}>
              <Avatar size={80} icon={<UserOutlined />} style={{ marginBottom: 12 }}>
                {userInfo.username.charAt(0).toUpperCase()}
              </Avatar>
              <Title level={5} style={{ margin: '8px 0 4px' }}>
                {userInfo.username}
              </Title>
              <Text type="secondary">{userInfo.email}</Text>
              <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 12 }}>
                  存储空间: {userInfo.storageUsed} / {userInfo.storageTotal}
                </Text>
                <Progress percent={storagePercent} size="small" style={{ marginTop: 4 }} />
              </div>
            </Card>

            {/* 导航菜单 */}
            <Card style={{ borderRadius: 15, padding: 0 }} bodyStyle={{ padding: 8 }}>
              <Menu
                mode="inline"
                selectedKeys={[activeSection]}
                onClick={({ key }) => setActiveSection(key)}
                items={menuItems}
                style={{ border: 'none' }}
              />
            </Card>
          </Col>
        )}

        {/* 内容区域 */}
        <Col
          flex="1"
          style={{
            height: '100%',
            overflow: 'auto',
            padding: 16,
            position: 'relative',
          }}
        >
          {/* 折叠/展开按钮 */}
          <Button
            shape="circle"
            size="small"
            icon={sidebarCollapsed ? <RightOutlined /> : <LeftOutlined />}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              position: 'absolute',
              top: 16,
              left: sidebarCollapsed ? 16 : -4,
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          />

          <div style={{ paddingLeft: sidebarCollapsed ? 48 : 16 }}>
            {renderContent()}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AccountSettings;