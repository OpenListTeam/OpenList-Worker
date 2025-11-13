import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  Microsoft as MicrosoftIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
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
        return <GoogleIcon />;
      case 'github':
        return <GitHubIcon />;
      case 'microsoft':
        return <MicrosoftIcon />;
      default:
        return <LinkIcon />;
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ borderRadius: '15px' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          第三方账户绑定
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          绑定第三方账户后，您可以使用这些账户快速登录
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {providers.length === 0 ? (
          <Alert severity="info">
            暂无可用的OAuth提供商，请联系管理员配置
          </Alert>
        ) : (
          <List>
            {providers.map((provider) => {
              const bound = isProviderBound(provider.oauth_name);
              const binding = bindings.find(b => b.oauth_name === provider.oauth_name);
              
              return (
                <ListItem key={provider.oauth_name} divider>
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    {getOAuthIcon(provider.oauth_type)}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {provider.oauth_name}
                        </Typography>
                        {bound && (
                          <Chip
                            label="已绑定"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      bound && binding
                        ? `绑定账户: ${binding.name || binding.email || binding.oauth_user_id}`
                        : `${provider.oauth_type} 第三方登录`
                    }
                  />
                  <ListItemSecondaryAction>
                    {bound ? (
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => setUnbindDialog({ open: true, binding: binding! })}
                        disabled={processing}
                      >
                        <DeleteIcon />
                      </IconButton>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setBindDialog({ open: true, provider })}
                        disabled={processing}
                        sx={{
                          borderColor: getOAuthColor(provider.oauth_type),
                          color: getOAuthColor(provider.oauth_type),
                          '&:hover': {
                            borderColor: getOAuthColor(provider.oauth_type),
                            backgroundColor: `${getOAuthColor(provider.oauth_type)}10`,
                          }
                        }}
                      >
                        绑定
                      </Button>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}

        {/* 绑定确认对话框 */}
        <Dialog
          open={bindDialog.open}
          onClose={() => !processing && setBindDialog({ open: false, provider: null })}
        >
          <DialogTitle>绑定OAuth账户</DialogTitle>
          <DialogContent>
            <Typography>
              确定要绑定 {bindDialog.provider?.oauth_name} 账户吗？
              您将被重定向到 {bindDialog.provider?.oauth_type} 进行授权。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setBindDialog({ open: false, provider: null })}
              disabled={processing}
            >
              取消
            </Button>
            <Button
              onClick={() => bindDialog.provider && handleBind(bindDialog.provider)}
              variant="contained"
              disabled={processing}
            >
              {processing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              确定绑定
            </Button>
          </DialogActions>
        </Dialog>

        {/* 解绑确认对话框 */}
        <Dialog
          open={unbindDialog.open}
          onClose={() => !processing && setUnbindDialog({ open: false, binding: null })}
        >
          <DialogTitle>解绑OAuth账户</DialogTitle>
          <DialogContent>
            <Typography>
              确定要解绑 {unbindDialog.binding?.oauth_name} 账户吗？
              解绑后您将无法使用该账户登录。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setUnbindDialog({ open: false, binding: null })}
              disabled={processing}
            >
              取消
            </Button>
            <Button
              onClick={() => unbindDialog.binding && handleUnbind(unbindDialog.binding)}
              variant="contained"
              color="error"
              disabled={processing}
            >
              {processing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              确定解绑
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default OAuthBinding;