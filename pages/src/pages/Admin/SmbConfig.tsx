/**
 * SMB 连接配置页面
 */
import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Switch, Button, message, Typography, Alert } from 'antd';
import { ApiOutlined, SaveOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title } = Typography;

const SmbConfig: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const fetchConfig = async () => {
    try {
      const res: any = await apiService.get('/api/admin/setting/list?group=smb');
      if (res.code === 200 && res.data && res.data.length > 0) {
        const config = JSON.parse(res.data[0].token_info || '{}');
        form.setFieldsValue(config);
      }
    } catch (error) {
      console.error('获取SMB配置失败:', error);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await apiService.post('/api/admin/setting/save', {
        admin_keys: 'smb',
        admin_data: JSON.stringify(values),
      });
      if (res.code === 200) {
        message.success('SMB配置保存成功');
      } else {
        message.error(res.message || '保存失败');
      }
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <ApiOutlined style={{ marginRight: 12 }} />
        SMB 连接配置
      </Title>

      <Alert
        message="SMB/CIFS 文件共享"
        description="启用SMB服务后，Windows/macOS/Linux设备可以通过网络邻居访问文件。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="启用SMB服务" name="is_enabled" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>

          <Form.Item label="工作组" name="workgroup" initialValue="WORKGROUP">
            <Input placeholder="工作组名称" />
          </Form.Item>

          <Form.Item label="服务器名称" name="server_name" initialValue="OPENLIST">
            <Input placeholder="SMB服务器名称" />
          </Form.Item>

          <Form.Item label="共享路径" name="share_path" initialValue="/">
            <Input placeholder="SMB共享的根路径" />
          </Form.Item>

          <Form.Item label="监听端口" name="port" initialValue={445}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="允许匿名访问" name="allow_anonymous" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>

          <Form.Item label="最大连接数" name="max_connections" initialValue={10}>
            <InputNumber min={1} max={1000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SmbConfig;
