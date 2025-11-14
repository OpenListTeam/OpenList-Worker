import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Snackbar,
  Collapse,
} from '@mui/material';
import {
  AccountCircle,
  Security,
  Notifications,
  Storage,
  Language,
  ColorLens,
  ExpandLess,
  ExpandMore,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useApp } from '../../components/AppContext';
import apiService from '../../posts/api';
import OAuthBinding from '../../components/OAuthBinding';

const AccountSettings: React.FC = () => {
  const { state } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState<{ [key: string]: boolean }>({
    profile: true,
    security: true,
    notifications: false,
    storage: false,
    language: false,
    theme: false,
  });
  
  const [userInfo, setUserInfo] = useState({
    username: '',
    email: '',
    storageUsed: '0 B',
    storageTotal: '1 GB',
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
      
      if (!state.user?.username) {
        setError('用户未登录');
        return;
      }



      const result = await apiService.post(`/@users/select/name/${state.user.username}`, {});
      
      if (result.flag && result.data && result.data.length > 0) {
        const userData = result.data[0];
        setUserInfo({
          username: userData.users_name,
          email: userData.users_mail || '',
          storageUsed: formatBytes(userData.total_used || 0),
          storageTotal: formatBytes(userData.total_size || 1024 * 1024 * 1024),
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
  }, [state.user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError('');
      
      if (!state.user?.username) {
        setError('用户未登录');
        return;
      }

      const result = await apiService.post('/@users/config/none', {
        users_name: state.user.username,
        users_mail: formData.users_mail,
      });
      
      if (result.flag) {
        setSuccess('个人信息更新成功');
        // 重新加载用户信息
        await loadUserInfo();
      } else {
        setError(result.text || '更新个人信息失败');
      }
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
      
      if (!state.user?.username) {
        setError('用户未登录');
        return;
      }

      // 验证密码
      if (!formData.newPassword || formData.newPassword.length < 6) {
        setError('新密码至少需要6个字符');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }

      // 确保username存在
      if (!state.user?.username) {
        setError('用户信息不完整，请重新登录');
        return;
      }

      // 更新密码
      const result = await apiService.post('/@users/config/none', {
        users_name: state.user.username,
        users_pass: formData.newPassword,
      });
      
      if (result.flag) {
        setSuccess('密码修改成功');
        setFormData(prev => ({
          ...prev,
          newPassword: '',
          confirmPassword: '',
        }));
      } else {
        setError(result.text || '修改密码失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('修改密码失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleMenuClick = (key: string) => {
    setMenuOpen(prev => ({ ...prev, [key]: !prev[key] }));
    setActiveSection(key);
  };

  const menuItems = [
    { key: 'profile', icon: AccountCircle, text: '个人信息' },
    { key: 'security', icon: Security, text: '安全设置' },
    { key: 'notifications', icon: Notifications, text: '通知设置' },
    { key: 'storage', icon: Storage, text: '存储管理' },
    { key: 'language', icon: Language, text: '语言设置' },
    { key: 'theme', icon: ColorLens, text: '主题设置' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', p: 0, overflow: 'hidden' }}>
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
      
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>

      <Grid container spacing={0} sx={{ width: '100%', height: '100%', m: 0 }}>
        {!sidebarCollapsed && (
          <Grid item xs={0} md={3} sx={{ display: { xs: 'none', md: 'block' }, height: '100%', p: 2, borderRight: '1px solid', borderColor: 'divider' }}>
            <Card sx={{ borderRadius: '15px' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  {userInfo.username.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h6">{userInfo.username}</Typography>
                <Typography color="text.secondary">{userInfo.email}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  存储空间: {userInfo.storageUsed} / {userInfo.storageTotal}
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: '15px', mt: 2 }}>
              <List>
                {menuItems.map((item) => (
                  <ListItem key={item.key} disablePadding>
                    <ListItemButton 
                      onClick={() => handleMenuClick(item.key)}
                      selected={activeSection === item.key}
                    >
                      <item.icon sx={{ mr: 2 }} />
                      <ListItemText primary={item.text} />
                      {menuOpen[item.key] ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={sidebarCollapsed ? 12 : 9} sx={{ height: '100%', overflow: 'auto', p: 2 }}>
          <Box sx={{ position: 'relative', width: '100%' }}>
            <Button
              variant="outlined"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              sx={{
                position: 'fixed',
                top: 80,
                left: sidebarCollapsed ? 10 : 'calc(25% - 20px)',
                minWidth: '40px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                p: 0,
                zIndex: 1000,
                bgcolor: 'background.paper',
                boxShadow: 2,
                transition: 'left 0.3s ease',
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          <Collapse in={menuOpen['profile']} timeout="auto" unmountOnExit>
            <Card sx={{ borderRadius: '15px', mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  个人信息
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ width: '100%' }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} lg={6}>
                      <TextField
                        fullWidth
                        label="用户名"
                        value={userInfo.username}
                        disabled
                        helperText="用户名不可修改"
                      />
                    </Grid>
                    <Grid item xs={12} lg={6}>
                      <TextField
                        fullWidth
                        label="邮箱地址"
                        type="email"
                        value={formData.users_mail}
                        onChange={(e) => handleInputChange('users_mail', e.target.value)}
                        disabled={saving}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button 
                        variant="contained" 
                        onClick={handleSaveProfile}
                        disabled={saving}
                      >
                        {saving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                        保存修改
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Collapse>

          <Collapse in={menuOpen['security']} timeout="auto" unmountOnExit>
            <Card sx={{ borderRadius: '15px', mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  修改密码
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ width: '100%' }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} lg={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="新密码"
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        disabled={saving}
                        helperText="密码至少需要6个字符"
                      />
                    </Grid>
                    <Grid item xs={12} lg={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="确认密码"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        disabled={saving}
                        helperText="请再次输入新密码"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button 
                        variant="contained" 
                        onClick={handleChangePassword}
                        disabled={saving}
                      >
                        {saving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                        修改密码
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Collapse>

          <Collapse in={menuOpen['security']} timeout="auto" unmountOnExit>
            <OAuthBinding />
          </Collapse>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountSettings;