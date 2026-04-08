/**
 * LDAP连接配置页面
 */
import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Switch, Button, message, Typography, Divider, Alert } from 'antd';
import { LinkOutlined, SaveOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title, Text } = Typography;

const LdapConfig: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const fetchConfig = async () => {
    try {
      const data: any = await apiService.get('/api/admin/setting/list?group=ldap');
      if (Array.isArray(data) && data.length > 0) {
        const config = JSON.parse(data[0].token_info || '{}');
        form.setFieldsValue(config);
      }
    } catch (error) {
      console.error('获取LDAP配置失败:', error);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      await apiService.post('/api/admin/setting/save', {
        admin_keys: 'ldap',
        admin_data: JSON.stringify(values),
      });
      message.success('LDAP配置保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const values = form.getFieldsValue();
      message.info('LDAP连接测试功能开发中...');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <LinkOutlined style={{ marginRight: 12 }} />
        LDAP 连接配置
      </Title>

      <Alert
        message="LDAP/Active Directory 集成"
        description="配置LDAP服务器连接，允许用户通过LDAP账户登录系统。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="启用LDAP" name="is_enabled" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>

          <Divider orientation="left">服务器设置</Divider>

          <Form.Item label="服务器地址" name="server_url" rules={[{ required: true, message: '请输入LDAP服务器地址' }]}>
            <Input placeholder="ldap://ldap.example.com:389" />
          </Form.Item>

          <Form.Item label="Base DN" name="base_dn">
            <Input placeholder="dc=example,dc=com" />
          </Form.Item>

          <Form.Item label="Bind DN" name="bind_dn">
            <Input placeholder="cn=admin,dc=example,dc=com" />
          </Form.Item>

          <Form.Item label="Bind 密码" name="bind_password">
            <Input.Password placeholder="LDAP绑定密码" />
          </Form.Item>

          <Divider orientation="left">搜索设置</Divider>

          <Form.Item label="用户搜索过滤器" name="user_filter" initialValue="(uid=%s)">
            <Input placeholder="(uid=%s)" />
          </Form.Item>

          <Form.Item label="用户名属性" name="username_attr" initialValue="uid">
            <Input placeholder="uid" />
          </Form.Item>

          <Form.Item label="邮箱属性" name="email_attr" initialValue="mail">
            <Input placeholder="mail" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} style={{ marginRight: 8 }}>
              保存配置
            </Button>
            <Button onClick={handleTest} loading={testLoading}>
              测试连接
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LdapConfig;
