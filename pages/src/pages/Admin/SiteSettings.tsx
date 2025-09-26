import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';

const SiteSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    siteName: 'OpenList',
    siteUrl: 'https://oplist.example.com',
    siteDescription: '开源云存储管理系统',
    maxFileSize: '100MB',
    maxStoragePerUser: '10GB',
    allowRegistration: true,
    requireEmailVerification: true,
    enableCaptcha: true,
    maintenanceMode: false,
  });

  const handleSettingChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('保存站点设置:', settings);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '15px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                基本信息
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="站点名称"
                    value={settings.siteName}
                    onChange={(e) => handleSettingChange('siteName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="站点URL"
                    value={settings.siteUrl}
                    onChange={(e) => handleSettingChange('siteUrl', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="站点描述"
                    value={settings.siteDescription}
                    onChange={(e) => handleSettingChange('siteDescription', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '15px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                限制设置
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="最大文件大小"
                    value={settings.maxFileSize}
                    onChange={(e) => handleSettingChange('maxFileSize', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="每用户最大存储"
                    value={settings.maxStoragePerUser}
                    onChange={(e) => handleSettingChange('maxStoragePerUser', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '15px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                功能设置
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.allowRegistration}
                        onChange={(e) => handleSettingChange('allowRegistration', e.target.checked)}
                      />
                    }
                    label="允许用户注册"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.requireEmailVerification}
                        onChange={(e) => handleSettingChange('requireEmailVerification', e.target.checked)}
                      />
                    }
                    label="需要邮箱验证"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableCaptcha}
                        onChange={(e) => handleSettingChange('enableCaptcha', e.target.checked)}
                      />
                    }
                    label="启用验证码"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.maintenanceMode}
                        onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                      />
                    }
                    label="维护模式"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center' }}>
            <Button variant="contained" size="large" onClick={handleSave}>
              保存设置
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SiteSettings;