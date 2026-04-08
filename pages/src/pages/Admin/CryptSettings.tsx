/**
 * 加密设置页面（管理员）
 * 管理全局加密策略和加密配置
 */
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Select, Switch, Modal, Space, Typography, message, Tag, Popconfirm, InputNumber } from 'antd';
import { SecurityScanOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';
import type { Crypt } from '../../types';

const { Title, Text } = Typography;

const CryptSettings: React.FC = () => {
  const [crypts, setCrypts] = useState<Crypt[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCrypt, setEditingCrypt] = useState<Crypt | null>(null);
  const [form] = Form.useForm();

  const fetchCrypts = async () => {
    setLoading(true);
    try {
      const res: any = await apiService.get('/api/admin/setting/list?group=crypt');
      if (res.code === 200 && res.data) {
        setCrypts(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error('获取加密配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCrypts(); }, []);

  const handleSave = async (values: any) => {
    try {
      const url = editingCrypt ? '/api/admin/setting/update' : '/api/admin/setting/create';
      const res: any = await apiService.post(url, values);
      if (res.code === 200) {
        message.success(editingCrypt ? '加密配置更新成功' : '加密配置创建成功');
        setModalVisible(false);
        form.resetFields();
        setEditingCrypt(null);
        fetchCrypts();
      } else {
        message.error(res.text || '操作失败');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleDelete = async (cryptName: string) => {
    try {
      const res: any = await apiService.post('/api/admin/setting/delete', { crypt_name: cryptName });
      if (res.code === 200) {
        message.success('加密配置已删除');
        fetchCrypts();
      } else {
        message.error(res.text || '删除失败');
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const columns = [
    { title: '加密名称', dataIndex: 'crypt_name', key: 'crypt_name' },
    {
      title: '加密类型', dataIndex: 'crypt_type', key: 'crypt_type',
      render: (v: number) => {
        const types: Record<number, string> = { 0: 'AES-CTR', 1: 'AES-GCM', 2: 'ChaCha20' };
        return types[v] || `类型${v}`;
      },
    },
    {
      title: '加密模式', dataIndex: 'crypt_mode', key: 'crypt_mode',
      render: (v: number) => {
        const modes: Record<number, string> = { 0: '文件名+内容', 1: '仅内容', 2: '仅文件名' };
        return modes[v] || `模式${v}`;
      },
    },
    {
      title: '状态', dataIndex: 'is_enabled', key: 'is_enabled',
      render: (v: number) => <Tag color={v ? 'green' : 'red'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '自动解密', dataIndex: 'crypt_self', key: 'crypt_self',
      render: (v: number) => v ? '是' : '否',
    },
    {
      title: '后缀名', dataIndex: 'write_name', key: 'write_name',
      render: (v: string) => v || '-',
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: Crypt) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingCrypt(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}>编辑</Button>
          <Popconfirm title="确定删除此加密配置？" onConfirm={() => handleDelete(record.crypt_name)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <SecurityScanOutlined style={{ marginRight: 12 }} />
          加密设置
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditingCrypt(null);
          form.resetFields();
          setModalVisible(true);
        }}>
          添加加密配置
        </Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={crypts} rowKey="crypt_name" loading={loading} pagination={false} />
      </Card>

      <Modal
        title={editingCrypt ? '编辑加密配置' : '添加加密配置'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setEditingCrypt(null); }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="加密名称" name="crypt_name" rules={[{ required: true, message: '请输入加密名称' }]}>
            <Input placeholder="加密配置名称" disabled={!!editingCrypt} />
          </Form.Item>
          <Form.Item label="加密密码" name="crypt_pass" rules={[{ required: !editingCrypt, message: '请输入加密密码' }]}>
            <Input.Password placeholder="加密密码" />
          </Form.Item>
          <Form.Item label="加密类型" name="crypt_type" initialValue={0}>
            <Select options={[
              { label: 'AES-CTR', value: 0 },
              { label: 'AES-GCM', value: 1 },
              { label: 'ChaCha20', value: 2 },
            ]} />
          </Form.Item>
          <Form.Item label="加密模式" name="crypt_mode" initialValue={0}>
            <Select options={[
              { label: '文件名+内容', value: 0 },
              { label: '仅内容', value: 1 },
              { label: '仅文件名', value: 2 },
            ]} />
          </Form.Item>
          <Form.Item label="是否启用" name="is_enabled" initialValue={1}>
            <Select options={[
              { label: '启用', value: 1 },
              { label: '禁用', value: 0 },
            ]} />
          </Form.Item>
          <Form.Item label="自动解密" name="crypt_self" initialValue={0}>
            <Select options={[
              { label: '是', value: 1 },
              { label: '否', value: 0 },
            ]} />
          </Form.Item>
          <Form.Item label="随机密码" name="rands_pass" initialValue={0}>
            <Select options={[
              { label: '是', value: 1 },
              { label: '否', value: 0 },
            ]} />
          </Form.Item>
          <Form.Item label="加密后缀名" name="write_name">
            <Input placeholder="例如: .enc" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CryptSettings;
