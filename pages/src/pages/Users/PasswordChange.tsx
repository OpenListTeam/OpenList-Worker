/**
 * 修改密码页面
 */
import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store';
import { apiService } from '../../posts/api';

const { Title } = Typography;

const PasswordChange: React.FC = () => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    if (values.new_password !== values.confirm_password) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res: any = await apiService.post('/api/me/update', {
        old_password: values.old_password,
        password: values.new_password,
      });
      if (res.code === 200) {
        message.success('密码修改成功');
        form.resetFields();
      } else {
        message.error(res.message || '密码修改失败');
      }
    } catch (error: any) {
      message.error(error.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <KeyOutlined style={{ marginRight: 12 }} />
        修改密码
      </Title>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 400 }}
        >
          <Form.Item
            label="当前密码"
            name="old_password"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="new_password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirm_password"
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PasswordChange;
