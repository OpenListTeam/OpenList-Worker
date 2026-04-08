/**
 * 索引管理页面
 * 管理文件索引的创建、刷新、配置
 */
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, InputNumber, Switch, Modal, Space, Typography, message, Tag, Popconfirm } from 'antd';
import { FundProjectionScreenOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title, Text } = Typography;

interface IndexConfig {
  index_path: string;
  is_enabled: boolean;
  auto_refresh: boolean;
  refresh_interval: number;
  max_depth: number;
  calc_size: boolean;
  ignore_paths: string;
}

const IndexManage: React.FC = () => {
  const [indexes, setIndexes] = useState<IndexConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<IndexConfig | null>(null);
  const [form] = Form.useForm();

  const fetchIndexes = async () => {
    setLoading(true);
    try {
      const res: any = await apiService.get('/api/admin/setting/list?group=index_configs');
      if (res.code === 200 && res.data) {
        const configs = JSON.parse(res.data.admin_data || '[]');
        setIndexes(configs);
      }
    } catch (error) {
      console.error('获取索引配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIndexes(); }, []);

  const handleSave = async (values: any) => {
    try {
      const newConfig: IndexConfig = {
        index_path: values.index_path,
        is_enabled: values.is_enabled ?? true,
        auto_refresh: values.auto_refresh ?? false,
        refresh_interval: values.refresh_interval ?? 3600,
        max_depth: values.max_depth ?? 10,
        calc_size: values.calc_size ?? false,
        ignore_paths: values.ignore_paths ?? '',
      };

      let updatedIndexes: IndexConfig[];
      if (editingIndex) {
        updatedIndexes = indexes.map(idx =>
          idx.index_path === editingIndex.index_path ? newConfig : idx
        );
      } else {
        if (indexes.find(idx => idx.index_path === newConfig.index_path)) {
          message.error('该路径的索引配置已存在');
          return;
        }
        updatedIndexes = [...indexes, newConfig];
      }

      const res: any = await apiService.post('/api/admin/setting/save', {
        admin_keys: 'index_configs',
        admin_data: JSON.stringify(updatedIndexes),
      });

      if (res.code === 200) {
        message.success(editingIndex ? '索引配置更新成功' : '索引配置创建成功');
        setIndexes(updatedIndexes);
        setModalVisible(false);
        form.resetFields();
        setEditingIndex(null);
      } else {
        message.error(res.message || '操作失败');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleDelete = async (indexPath: string) => {
    const updatedIndexes = indexes.filter(idx => idx.index_path !== indexPath);
    try {
      const res: any = await apiService.post('/api/admin/setting/save', {
        admin_keys: 'index_configs',
        admin_data: JSON.stringify(updatedIndexes),
      });
      if (res.code === 200) {
        message.success('索引配置已删除');
        setIndexes(updatedIndexes);
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleRefresh = async (indexPath: string) => {
    message.info(`正在刷新索引: ${indexPath}`);
    // TODO: 调用后端刷新索引API
  };

  const columns = [
    { title: '索引路径', dataIndex: 'index_path', key: 'index_path' },
    {
      title: '状态', dataIndex: 'is_enabled', key: 'is_enabled',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '自动刷新', dataIndex: 'auto_refresh', key: 'auto_refresh',
      render: (v: boolean) => v ? '是' : '否',
    },
    { title: '最大深度', dataIndex: 'max_depth', key: 'max_depth' },
    {
      title: '计算大小', dataIndex: 'calc_size', key: 'calc_size',
      render: (v: boolean) => v ? '是' : '否',
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: IndexConfig) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingIndex(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}>编辑</Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => handleRefresh(record.index_path)}>
            刷新
          </Button>
          <Popconfirm title="确定删除此索引配置？" onConfirm={() => handleDelete(record.index_path)}>
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
          <FundProjectionScreenOutlined style={{ marginRight: 12 }} />
          索引管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditingIndex(null);
          form.resetFields();
          setModalVisible(true);
        }}>
          添加索引
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={indexes}
          rowKey="index_path"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingIndex ? '编辑索引配置' : '添加索引配置'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setEditingIndex(null); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="索引路径" name="index_path" rules={[{ required: true, message: '请输入索引路径' }]}>
            <Input placeholder="例如: /" disabled={!!editingIndex} />
          </Form.Item>
          <Form.Item label="是否启用" name="is_enabled" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item label="自动刷新" name="auto_refresh" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <Form.Item label="刷新间隔(秒)" name="refresh_interval" initialValue={3600}>
            <InputNumber min={60} max={86400} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="最大深度" name="max_depth" initialValue={10}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="计算文件大小" name="calc_size" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <Form.Item label="忽略路径(每行一个)" name="ignore_paths">
            <Input.TextArea rows={3} placeholder="每行一个路径，支持通配符" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IndexManage;
