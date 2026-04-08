import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Input,
  InputNumber,
  Switch,
  Tag,
  Typography,
  Row,
  Col,
  Divider,
  Form,
  Space,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { Mates } from '../../types';
import apiService from '../../posts/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const MatesConfig: React.FC = () => {
  const [mates, setMates] = useState<Mates[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMate, setEditingMate] = useState<Mates | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // 表单状态
  const [formData, setFormData] = useState({
    mates_name: '',
    mates_mask: 755,
    mates_user: 0,
    is_enabled: 1,
    dir_hidden: 0,
    dir_shared: 0,
    set_zipped: '',
    set_parted: '',
    crypt_name: '',
    cache_time: 0
  });

  // 获取路径配置列表
  const fetchMates = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/admin/meta/list');
      setMates(Array.isArray(response) ? response : []);
    } catch (error) {
      messageApi.error('获取路径配置列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMates();
  }, []);

  // 打开添加对话框
  const handleAdd = () => {
    setEditingMate(null);
    setFormData({
      mates_name: '',
      mates_mask: 755,
      mates_user: 0,
      is_enabled: 1,
      dir_hidden: 0,
      dir_shared: 0,
      set_zipped: '',
      set_parted: '',
      crypt_name: '',
      cache_time: 0
    });
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (mate: Mates) => {
    setEditingMate(mate);
    setFormData({
      mates_name: mate.mates_name,
      mates_mask: mate.mates_mask,
      mates_user: mate.mates_user,
      is_enabled: mate.is_enabled,
      dir_hidden: mate.dir_hidden || 0,
      dir_shared: mate.dir_shared || 0,
      set_zipped: mate.set_zipped || '',
      set_parted: mate.set_parted || '',
      crypt_name: mate.crypt_name || '',
      cache_time: mate.cache_time || 0
    });
    setDialogOpen(true);
  };

  // 删除路径配置
  const handleDelete = async (mate: Mates) => {
    if (!confirm(`确定要删除路径配置 "${mate.mates_name}" 吗？`)) {
      return;
    }

    try {
      await apiService.post('/api/admin/meta/delete', { id: mate.mates_name });
      messageApi.success('删除成功');
      fetchMates();
    } catch (error) {
      messageApi.error('删除失败');
    }
  };

  // 切换启用状态
  const handleToggleStatus = async (mate: Mates) => {
    try {
      await apiService.post('/api/admin/meta/update', {
        ...mate,
        is_enabled: mate.is_enabled === 1 ? 0 : 1
      });
      messageApi.success('状态更新成功');
      fetchMates();
    } catch (error) {
      messageApi.error('状态更新失败');
    }
  };

  // 保存路径配置
  const handleSave = async () => {
    if (!formData.mates_name.trim()) {
      messageApi.error('路径名称不能为空');
      return;
    }

    try {
      const endpoint = editingMate ? '/api/admin/meta/update' : '/api/admin/meta/create';
      await apiService.post(endpoint, formData);
      messageApi.success(editingMate ? '更新成功' : '创建成功');
      setDialogOpen(false);
      fetchMates();
    } catch (error) {
      messageApi.error('操作失败');
    }
  };

  const columns = [
    {
      id: 'mates_name',
      label: '路径名称',
      minWidth: 150,
      format: (value: string) => (
        <Space>
          <FolderOutlined />
          {value}
        </Space>
      )
    },
    {
      id: 'mates_mask',
      label: '权限掩码',
      minWidth: 100,
      format: (value: number) => (
        <Tag icon={<SafetyCertificateOutlined />} variant="borderless">
          {value.toString(8)}
        </Tag>
      )
    },
    { id: 'mates_user', label: '用户ID', minWidth: 80 },
    {
      id: 'is_enabled',
      label: '状态',
      minWidth: 80,
      format: (value: number) => (
        <Tag color={value === 1 ? 'success' : 'default'}>
          {value === 1 ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      id: 'dir_hidden',
      label: '隐藏',
      minWidth: 80,
      format: (value: number) => (
        <Tag color={value === 1 ? 'warning' : 'default'}>
          {value === 1 ? '是' : '否'}
        </Tag>
      )
    },
    {
      id: 'dir_shared',
      label: '共享',
      minWidth: 80,
      format: (value: number) => (
        <Tag color={value === 1 ? 'blue' : 'default'}>
          {value === 1 ? '是' : '否'}
        </Tag>
      )
    },
    { id: 'crypt_name', label: '加密配置', minWidth: 120 },
    {
      id: 'cache_time',
      label: '缓存时间',
      minWidth: 100,
      format: (value: number) => value === 0 ? '无缓存' : `${value}秒`
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>目录配置</Title>
          <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
            配置目录权限、加密和缓存策略，优化文件访问体验
          </Text>
        </div>
      </div>

      <ResponsiveDataTable
        title="路径配置管理"
        columns={columns}
        data={mates}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        actions={['add', 'edit', 'delete', 'toggle']}
        addButtonText="添加路径配置"
      />

      {/* 添加/编辑对话框 */}
      <Modal
        title={editingMate ? '编辑路径配置' : '添加路径配置'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleSave}
        okText={editingMate ? '更新' : '创建'}
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="路径名称">
                <Input
                  value={formData.mates_name}
                  onChange={(e) => setFormData({ ...formData, mates_name: e.target.value })}
                  placeholder="例如: /documents"
                  disabled={!!editingMate}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="权限掩码">
                <InputNumber
                  style={{ width: '100%' }}
                  value={formData.mates_mask}
                  onChange={(val) => setFormData({ ...formData, mates_mask: val || 0 })}
                  placeholder="例如: 755"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="用户ID">
                <InputNumber
                  style={{ width: '100%' }}
                  value={formData.mates_user}
                  onChange={(val) => setFormData({ ...formData, mates_user: val || 0 })}
                  placeholder="0表示所有用户"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="缓存时间(秒)">
                <InputNumber
                  style={{ width: '100%' }}
                  value={formData.cache_time}
                  onChange={(val) => setFormData({ ...formData, cache_time: val || 0 })}
                  placeholder="0表示无缓存"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="加密配置名称">
                <Input
                  value={formData.crypt_name}
                  onChange={(e) => setFormData({ ...formData, crypt_name: e.target.value })}
                  placeholder="留空表示不加密"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="启用配置">
                <Switch
                  checked={formData.is_enabled === 1}
                  onChange={(checked) => setFormData({ ...formData, is_enabled: checked ? 1 : 0 })}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="隐藏目录">
                <Switch
                  checked={formData.dir_hidden === 1}
                  onChange={(checked) => setFormData({ ...formData, dir_hidden: checked ? 1 : 0 })}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="共享目录">
                <Switch
                  checked={formData.dir_shared === 1}
                  onChange={(checked) => setFormData({ ...formData, dir_shared: checked ? 1 : 0 })}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Divider />
              <Title level={5}>高级配置</Title>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="压缩配置">
                <TextArea
                  value={formData.set_zipped}
                  onChange={(e) => setFormData({ ...formData, set_zipped: e.target.value })}
                  placeholder='例如: {"enabled": true, "level": 6}'
                  rows={2}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="分片配置">
                <TextArea
                  value={formData.set_parted}
                  onChange={(e) => setFormData({ ...formData, set_parted: e.target.value })}
                  placeholder='例如: {"enabled": true, "size": "100MB"}'
                  rows={2}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default MatesConfig;