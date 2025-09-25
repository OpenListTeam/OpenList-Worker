import React, { useState } from 'react';
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
} from '@mui/material';
import {
  AccountCircle,
  Security,
  Notifications,
  Storage,
  Language,
  ColorLens,
} from '@mui/icons-material';

const AccountSettings: React.FC = () => {
  const [userInfo, setUserInfo] = useState({
    username: 'current_user',
    email: 'user@example.com',
    phone: '+86 138****8888',
    storageUsed: '5.2 GB',
    storageTotal: '10 GB',
    language: '简体中文',
    theme: '浅色模式',
  });

  const [formData, setFormData] = useState({
    displayName: '当前用户',
    email: 'user@example.com',
    phone: '+86 138****8888',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    console.log('保存个人信息:', formData);
  };

  const handleChangePassword = () => {
    console.log('修改密码:', formData);
  };

  const menuItems = [
    { icon: AccountCircle, text: '个人信息', action: () => console.log('个人信息') },
    { icon: Security, text: '安全设置', action: () => console.log('安全设置') },
    { icon: Notifications, text: '通知设置', action: () => console.log('通知设置') },
    { icon: Storage, text: '存储管理', action: () => console.log('存储管理') },
    { icon: Language, text: '语言设置', action: () => console.log('语言设置') },
    { icon: ColorLens, text: '主题设置', action: () => console.log('主题设置') },
  ];

  return (
    <Box sx={{ width: '100%', height: '100%', p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: '20px' }}>
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

          <Card sx={{ borderRadius: '20px', mt: 2 }}>
            <List>
              {menuItems.map((item, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton onClick={item.action}>
                    <item.icon sx={{ mr: 2 }} />
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>

        <Grid item xs={12} md={9}>
          <Card sx={{ borderRadius: '20px', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                个人信息
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="显示名称"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="邮箱地址"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="手机号码"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" onClick={handleSaveProfile}>
                    保存修改
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: '20px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                修改密码
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="password"
                    label="当前密码"
                    value={formData.oldPassword}
                    onChange={(e) => handleInputChange('oldPassword', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="password"
                    label="新密码"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="password"
                    label="确认密码"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" onClick={handleChangePassword}>
                    修改密码
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountSettings;