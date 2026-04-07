/**
 * 分享设置页面（管理员）
 * 管理全局分享策略和配置
 */
import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Switch, Button, message, Typography, Divider, Select } from 'antd';
import { ShareAltOutlined, SaveOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title, Text } = Typography;

const ShareSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const res: any = await apiService.get('/@admin/select/none?admin_keys=share_settings');
      if (res.flag && res.data) {
        const settings = JSON.parse(res.data.admin_data || '{}');
        form.setFieldsValue(settings);
      }
    } catch (error) {
      console.error('获取分享设置失败:', error);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await apiService.post('/@admin/config/none', {
        admin_keys: 'share_settings',
        admin_data: JSON.stringify(values),
      });
      if (res.flag) {
        message.success('分享设置保存成功');
      } else {
        message.error(res.text || '保存失败');
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
        <ShareAltOutlined style={{ marginRight: 12 }} />
        分享设置
      </Title>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Divider orientation="left">基本设置</Divider>

          <Form.Item label="允许分享" name="share_enabled" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item label="默认有效期(天)" name="default_expire_days" initialValue={7}>
            <InputNumber min={0} max={365} style={{ width: '100%' }} placeholder="0表示永不过期" />
          </Form.Item>

          <Form.Item label="最大有效期(天)" name="max_expire_days" initialValue={30}>
            <InputNumber min={0} max={365} style={{ width: '100%' }} placeholder="0表示不限制" />
          </Form.Item>

          <Form.Item label="强制设置密码" name="require_password" valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Divider orientation="left">访问限制</Divider>

          <Form.Item label="最大访问次数(0=不限)" name="max_access_count" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="允许匿名访问分享" name="allow_anonymous" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Form.Item label="允许分享的文件类型" name="allowed_types" initialValue="all">
            <Select options={[
              { label: '所有文件', value: 'all' },
              { label: '仅文件夹', value: 'folder' },
              { label: '仅文件', value: 'file' },
            ]} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ShareSettings;
