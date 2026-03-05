import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  List,
  Tag,
  Modal,
  Alert,
  Spin,
  Divider,
  Space,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  GoogleOutlined,
  GithubOutlined,
  WindowsOutlined,
  LinkOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useApp } from './AppContext';
import apiService from '../posts/api';

interface OAuthProvider {
  oauth_name: string;
  oauth_type: string;
  is_enabled: number;
}

interface UserOAuthBinding {
  oauth_name: string;
  oauth_user_id: string;
  email?: string;
  name?: string;
  created_at: number;
}

const OAuthBinding: React.FC = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [bindings, setBindings] = useState<UserOAuthBinding[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [bindDialog, setBindDialog] = useState({ open: false, provider: null as OAuthProvider | null });
  const [unbindDialog, setUnbindDialog] = useState({ open: false, binding: null as UserOAuthBinding | null });
  const [processing, setProcessing] = useState(false);

  // 获取OAuth图标
  const getOAuthIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'google':
        return <GoogleOutlined />;
      case 'github':
        return <GithubOutlined />;
      case 'microsoft':
        return <WindowsOutlined />;
      default:
        return <LinkOutlined />;
    }
  };

  // 获取OAuth颜色
  const getOAuthColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'google':
        return '#4285f4';
      case 'github':
        return '#333';
      case 'microsoft':
        return '#0078d4';
      default:
        return '#666';
    }
  };

  // 加载OAuth提供商和用户绑定
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // 获取启用的OAuth提供商
      const providersResult = await apiService.post('/@oauth/enabled/none', {});
      if (!providersResult.flag) {
        setError('获取OAuth提供商失败');
        return;
      }

      setProviders(providersResult.data || []);

      // 获取用户的OAuth绑定
      if (state.user?.username) {
        const userResult = await apiService.post(`/@users/select/name/${state.user.users_name}`, {});
        if (userResult.flag && userResult.data && userResult.data.length > 0) {
          const userData = userResult.data[0];
          if (userData.oauth_data) {
            try {
              const oauthBindings = JSON.parse(userData.oauth_data);
              setBindings(Array.isArray(oauthBindings) ? oauthBindings : []);
            } catch (e) {
              console.error('解析OAuth绑定数据失败:', e);
              setBindings([]);
            }
          } else {
            setBindings([]);
          }
        }
      }
    } catch (err) {
      setError('加载数据失败，请稍后重试');
      console.error('加载OAuth数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [state.user]);

  // 绑定OAuth账户
  const handleBind = async (provider: OAuthProvider) => {
    try {
      setProcessing(true);
      setError('');

      // 生成授权URL
      const redirectUri = `${window.location.origin}/oauth/callback`;
      const result = await apiService.post(`/@oauth-token/authurl/name/${provider.oauth_name}`, {
        redirect_uri: redirectUri,
        state: `bind_${Date.now()}`
      });

      if (result.flag && result.data && result.data.length > 0) {
        const authData = result.data[0];
        // 保存绑定状态到sessionStorage
        sessionStorage.setItem('oauth_bind_mode', 'true');
        sessionStorage.setItem('oauth_bind_provider', provider.oauth_name);
        
        // 跳转到OAuth授权页面
        window.location.href = authData.access_token; // access_token字段存储的是auth_url
      } else {
        setError(result.text || '获取授权URL失败');
      }
    } catch (err) {
      setError('绑定失败，请稍后重试');
      console.error('OAuth绑定失败:', err);
    } finally {
      setProcessing(false);
      setBindDialog({ open: false, provider: null });
    }
  };

  // 解绑OAuth账户
  const handleUnbind = async (binding: UserOAuthBinding) => {
    try {
      setProcessing(true);
      setError('');

      if (!state.user?.username) {
        setError('用户未登录');
        return;
      }

      const result = await apiService.post('/@users/oauth-unbind/none', {
        users_name: state.user.users_name,
        oauth_name: binding.oauth_name,
        oauth_user_id: binding.oauth_user_id
      });

      if (result.flag) {
        setSuccess('OAuth账户解绑成功');
        await loadData(); // 重新加载数据
      } else {
        setError(result.text || '解绑失败');
      }
    } catch (err) {
      setError('解绑失败，请稍后重试');
      console.error('OAuth解绑失败:', err);
    } finally {
      setProcessing(false);
      setUnbindDialog({ open: false, binding: null });
    }
  };

  // 检查提供商是否已绑定
  const isProviderBound = (providerName: string) => {
    return bindings.some(binding => binding.oauth_name === providerName);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card style={{ borderRadius: 15 }}>
      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        第三方账户绑定
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        绑定第三方账户后，您可以使用这些账户快速登录
      </Typography.Text>
      <Divider style={{ marginBottom: 16 }} />

      {error && (
        <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />
      )}

      {success && (
        <Alert type="success" message={success} style={{ marginBottom: 16 }} showIcon closable onClose={() => setSuccess('')} />
      )}

      {providers.length === 0 ? (
        <Alert type="info" message="暂无可用的OAuth提供商，请联系管理员配置" showIcon />
      ) : (
        <List
          dataSource={providers}
          renderItem={(provider) => {
            const bound = isProviderBound(provider.oauth_name);
            const binding = bindings.find(b => b.oauth_name === provider.oauth_name);

            return (
              <List.Item
                actions={[
                  bound ? (
                    <Button
                      key="unbind"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setUnbindDialog({ open: true, binding: binding! })}
                      disabled={processing}
                    />
                  ) : (
                    <Button
                      key="bind"
                      type="default"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setBindDialog({ open: true, provider })}
                      disabled={processing}
                      style={{
                        borderColor: getOAuthColor(provider.oauth_type),
                        color: getOAuthColor(provider.oauth_type),
                      }}
                    >
                      绑定
                    </Button>
                  )
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <span style={{ fontSize: 20, color: getOAuthColor(provider.oauth_type) }}>
                      {getOAuthIcon(provider.oauth_type)}
                    </span>
                  }
                  title={
                    <Space>
                      <span>{provider.oauth_name}</span>
                      {bound && (
                        <Tag color="success" variant="borderless">已绑定</Tag>
                      )}
                    </Space>
                  }
                  description={
                    bound && binding
                      ? `绑定账户: ${binding.name || binding.email || binding.oauth_user_id}`
                      : `${provider.oauth_type} 第三方登录`
                  }
                />
              </List.Item>
            );
          }}
        />
      )}

      {/* 绑定确认对话框 */}
      <Modal
        open={bindDialog.open}
        title="绑定OAuth账户"
        onCancel={() => !processing && setBindDialog({ open: false, provider: null })}
        onOk={() => bindDialog.provider && handleBind(bindDialog.provider)}
        okText={processing ? '绑定中...' : '确定绑定'}
        cancelText="取消"
        confirmLoading={processing}
        okButtonProps={{ disabled: processing }}
        cancelButtonProps={{ disabled: processing }}
      >
        <Typography.Text>
          确定要绑定 {bindDialog.provider?.oauth_name} 账户吗？
          您将被重定向到 {bindDialog.provider?.oauth_type} 进行授权。
        </Typography.Text>
      </Modal>

      {/* 解绑确认对话框 */}
      <Modal
        open={unbindDialog.open}
        title="解绑OAuth账户"
        onCancel={() => !processing && setUnbindDialog({ open: false, binding: null })}
        onOk={() => unbindDialog.binding && handleUnbind(unbindDialog.binding)}
        okText={processing ? '解绑中...' : '确定解绑'}
        cancelText="取消"
        confirmLoading={processing}
        okButtonProps={{ danger: true, disabled: processing }}
        cancelButtonProps={{ disabled: processing }}
      >
        <Typography.Text>
          确定要解绑 {unbindDialog.binding?.oauth_name} 账户吗？
          解绑后您将无法使用该账户登录。
        </Typography.Text>
      </Modal>
    </Card>
  );
};

export default OAuthBinding;