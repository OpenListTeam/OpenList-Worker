/**
 * FTP/SFTP 连接配置页面
 */
import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Switch, Button, message, Typography, Divider, Alert, Select } from 'antd';
import { ApiOutlined, SaveOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title } = Typography;

const FtpConfig: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const fetchConfig = async () => {
    try {
      const res: any = await apiService.get('/api/admin/setting/list?group=ftp');
      if (res.code === 200 && res.data && res.data.length > 0) {
        const config = JSON.parse(res.data[0].token_info || '{}');
        form.setFieldsValue(config);
      }
    } catch (error) {
      console.error('获取FTP配置失败:', error);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await apiService.post('/api/admin/setting/save', {
        admin_keys: 'ftp',
        admin_data: JSON.stringify(values),
      });
      if (res.code === 200) {
        message.success('FTP/SFTP配置保存成功');
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
        FTP / SFTP 连接配置
      </Title>

      <Alert
        message="FTP/SFTP 服务"
        description="启用FTP/SFTP服务后，用户可以通过FTP客户端访问文件。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="启用FTP服务" name="is_enabled" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>

          <Form.Item label="协议类型" name="protocol" initialValue="ftp">
            <Select options={[
              { label: 'FTP', value: 'ftp' },
              { label: 'SFTP', value: 'sftp' },
            ]} />
          </Form.Item>

          <Form.Item label="监听端口" name="port" initialValue={21}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="根目录路径" name="root_path" initialValue="/">
            <Input placeholder="FTP根目录对应的系统路径" />
          </Form.Item>

          <Form.Item label="被动模式端口范围" name="passive_ports" initialValue="50000-50100">
            <Input placeholder="50000-50100" />
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

export default FtpConfig;
