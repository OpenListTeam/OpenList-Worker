import React, { useState, useEffect } from 'react';
import { Card, Typography, Input, Button, Row, Col, Switch, Divider, Space, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import apiService from '../../posts/api';

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

  // 加载站点设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await apiService.get('/api/admin/setting/list');
        if (result.flag && result.data) {
          const data: Record<string, any> = {};
          (result.data as any[]).forEach((item: any) => {
            data[item.admin_keys] = item.admin_data;
          });
          setSettings(prev => ({
            ...prev,
            siteName: data['site_name'] ?? prev.siteName,
            siteUrl: data['site_url'] ?? prev.siteUrl,
            siteDescription: data['site_description'] ?? prev.siteDescription,
            maxFileSize: data['max_file_size'] ?? prev.maxFileSize,
            maxStoragePerUser: data['max_storage_per_user'] ?? prev.maxStoragePerUser,
            allowRegistration: data['allow_registration'] === '1' || data['allow_registration'] === true,
            requireEmailVerification: data['require_email_verification'] === '1' || data['require_email_verification'] === true,
            enableCaptcha: data['enable_captcha'] === '1' || data['enable_captcha'] === true,
            maintenanceMode: data['maintenance_mode'] === '1' || data['maintenance_mode'] === true,
          }));
        }
      } catch (err) {
        console.error('加载站点设置失败:', err);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      const items = [
        { admin_keys: 'site_name', admin_data: settings.siteName },
        { admin_keys: 'site_url', admin_data: settings.siteUrl },
        { admin_keys: 'site_description', admin_data: settings.siteDescription },
        { admin_keys: 'max_file_size', admin_data: settings.maxFileSize },
        { admin_keys: 'max_storage_per_user', admin_data: settings.maxStoragePerUser },
        { admin_keys: 'allow_registration', admin_data: settings.allowRegistration ? '1' : '0' },
        { admin_keys: 'require_email_verification', admin_data: settings.requireEmailVerification ? '1' : '0' },
        { admin_keys: 'enable_captcha', admin_data: settings.enableCaptcha ? '1' : '0' },
        { admin_keys: 'maintenance_mode', admin_data: settings.maintenanceMode ? '1' : '0' },
      ];
      const result = await apiService.post('/api/admin/setting/save', { items });
      if (result.flag) {
        message.success('站点设置保存成功');
      } else {
        message.error(result.text || '保存失败');
      }
    } catch (err) {
      message.error('保存失败，请检查网络连接');
    }
  };

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 6, fontWeight: 500 };

  return (
    <div style={{ width: '100%', height: '100%', padding: 24 }}>
      <Row gutter={[24, 24]}>
        {/* 基本信息 */}
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 15 }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>基本信息</Typography.Title>
            <Divider style={{ marginTop: 12, marginBottom: 20 }} />

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <span style={labelStyle}>站点名称</span>
                <Input
                  value={settings.siteName}
                  onChange={(e) => handleSettingChange('siteName', e.target.value)}
                />
              </div>
              <div>
                <span style={labelStyle}>站点URL</span>
                <Input
                  value={settings.siteUrl}
                  onChange={(e) => handleSettingChange('siteUrl', e.target.value)}
                />
              </div>
              <div>
                <span style={labelStyle}>站点描述</span>
                <Input.TextArea
                  rows={3}
                  value={settings.siteDescription}
                  onChange={(e) => handleSettingChange('siteDescription', e.target.value)}
                />
              </div>
            </Space>
          </Card>
        </Col>

        {/* 限制设置 */}
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 15 }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>限制设置</Typography.Title>
            <Divider style={{ marginTop: 12, marginBottom: 20 }} />

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <span style={labelStyle}>最大文件大小</span>
                <Input
                  value={settings.maxFileSize}
                  onChange={(e) => handleSettingChange('maxFileSize', e.target.value)}
                />
              </div>
              <div>
                <span style={labelStyle}>每用户最大存储</span>
                <Input
                  value={settings.maxStoragePerUser}
                  onChange={(e) => handleSettingChange('maxStoragePerUser', e.target.value)}
                />
              </div>
            </Space>
          </Card>
        </Col>

        {/* 功能设置 */}
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 15 }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>功能设置</Typography.Title>
            <Divider style={{ marginTop: 12, marginBottom: 20 }} />

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>允许用户注册</span>
                <Switch
                  checked={settings.allowRegistration}
                  onChange={(checked) => handleSettingChange('allowRegistration', checked)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>需要邮箱验证</span>
                <Switch
                  checked={settings.requireEmailVerification}
                  onChange={(checked) => handleSettingChange('requireEmailVerification', checked)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>启用验证码</span>
                <Switch
                  checked={settings.enableCaptcha}
                  onChange={(checked) => handleSettingChange('enableCaptcha', checked)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>维护模式</span>
                <Switch
                  checked={settings.maintenanceMode}
                  onChange={(checked) => handleSettingChange('maintenanceMode', checked)}
                />
              </div>
            </Space>
          </Card>
        </Col>

        {/* 保存按钮 */}
        <Col xs={24}>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Button type="primary" size="large" icon={<SaveOutlined />} onClick={handleSave}>
              保存设置
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default SiteSettings;