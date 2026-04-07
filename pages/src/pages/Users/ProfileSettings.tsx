/**
 * 个人信息设置页面
 * 允许用户查看和修改个人信息
 */
import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Typography, Avatar, Space, Descriptions } from 'antd';
import { UserOutlined, MailOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store';
import { apiService } from '../../posts/api';

const { Title, Text } = Typography;

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        users_name: user.users_name,
        users_mail: user.users_mail || '',
      });
    }
  }, [user, form]);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await apiService.post('/@users/config/none', {
        users_name: user?.users_name,
        users_mail: values.users_mail,
      });
      if (res.flag) {
        updateUser({ users_mail: values.users_mail });
        message.success('个人信息更新成功');
      } else {
        message.error(res.text || '更新失败');
      }
    } catch (error: any) {
      message.error(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 12 }} />
        个人信息
      </Title>

      {/* 用户头像和基本信息 */}
      <Card style={{ marginBottom: 24 }}>
        <Space size={24} align="start">
          <Avatar
            size={80}
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              fontSize: 32,
            }}
          >
            {user?.users_name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <div>
            <Title level={4} style={{ margin: 0 }}>{user?.users_name}</Title>
            <Text type="secondary">{user?.users_mail || '未设置邮箱'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              存储空间：{((user?.total_used || 0) / 1024 / 1024).toFixed(1)} MB / {((user?.total_size || 0) / 1024 / 1024 / 1024).toFixed(1)} GB
            </Text>
          </div>
        </Space>
      </Card>

      {/* 编辑表单 */}
      <Card title="编辑信息">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ maxWidth: 500 }}
        >
          <Form.Item label="用户名" name="users_name">
            <Input prefix={<UserOutlined />} disabled />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="users_mail"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ProfileSettings;
