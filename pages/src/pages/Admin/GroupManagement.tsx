import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Input,
  Switch,
  Tag,
  Typography,
  Card,
  Checkbox,
  Divider,
  Row,
  Col,
  Space,
  message,
  Form,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { Group } from '../../types';
import apiService from '../../posts/api';

// 权限定义
const PERMISSIONS = {
  'file_read': '文件读取',
  'file_write': '文件写入',
  'file_delete': '文件删除',
  'file_share': '文件分享',
  'file_upload': '文件上传',
  'file_download': '文件下载',
  'user_manage': '用户管理',
  'group_manage': '分组管理',
  'system_config': '系统配置',
  'mount_manage': '挂载管理',
  'task_manage': '任务管理',
  'offline_download': '离线下载'
};

const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // 表单状态
  const [formData, setFormData] = useState({
    group_name: '',
    group_mask: '',
    is_enabled: 1
  });

  // 权限状态
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // 获取分组列表
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/admin/group/list');
      if (response.code === 200) {
        setGroups(response.data || []);
      } else {
        messageApi.error(response.message || '获取分组列表失败');
      }
    } catch (error) {
      messageApi.error('获取分组列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // 打开添加对话框
  const handleAdd = () => {
    setEditingGroup(null);
    setFormData({ group_name: '', group_mask: '', is_enabled: 1 });
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      group_name: group.group_name,
      group_mask: group.group_mask,
      is_enabled: group.is_enabled
    });
    setDialogOpen(true);
  };

  // 打开权限管理对话框
  const handlePermissions = (group: Group) => {
    setEditingGroup(group);
    const permissions = group.group_mask.split(',').filter(p => p.trim());
    setSelectedPermissions(permissions);
    setPermissionDialogOpen(true);
  };

  // 删除分组
  const handleDelete = async (group: Group) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除分组 "${group.group_name}" 吗？`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await apiService.post('/api/admin/group/delete', { group_name: group.group_name });
          if (response.code === 200) {
            messageApi.success('删除成功');
            fetchGroups();
          } else {
            messageApi.error(response.message || '删除失败');
          }
        } catch (error) {
          messageApi.error('删除失败');
        }
      }
    });
  };

  // 切换分组状态
  const handleToggleStatus = async (group: Group) => {
    try {
      const response = await apiService.post('/api/admin/group/update', {
        group_name: group.group_name,
        is_enabled: group.is_enabled === 1 ? 0 : 1
      });
      if (response.code === 200) {
        messageApi.success('状态更新成功');
        fetchGroups();
      } else {
        messageApi.error(response.message || '状态更新失败');
      }
    } catch (error) {
      messageApi.error('状态更新失败');
    }
  };

  // 保存分组
  const handleSave = async () => {
    if (!formData.group_name.trim()) {
      messageApi.error('分组名称不能为空');
      return;
    }

    try {
      const url = editingGroup ? '/api/admin/group/update' : '/api/admin/group/create';
      const response = await apiService.post(url, formData);

      if (response.code === 200) {
        messageApi.success(editingGroup ? '更新成功' : '创建成功');
        setDialogOpen(false);
        fetchGroups();
      } else {
        messageApi.error(response.message || '操作失败');
      }
    } catch (error) {
      messageApi.error('操作失败');
    }
  };

  // 保存权限
  const handleSavePermissions = async () => {
    if (!editingGroup) return;

    try {
      const group_mask = selectedPermissions.join(',');
      const response = await apiService.post('/api/admin/group/update', {
        group_name: editingGroup.group_name,
        group_mask
      });

      if (response.code === 200) {
        messageApi.success('权限更新成功');
        setPermissionDialogOpen(false);
        fetchGroups();
      } else {
        messageApi.error(response.message || '权限更新失败');
      }
    } catch (error) {
      messageApi.error('权限更新失败');
    }
  };

  // 权限选择处理
  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions([...selectedPermissions, permission]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    }
  };

  const columns = [
    { id: 'group_name', label: '分组名称', minWidth: 150 },
    {
      id: 'group_mask',
      label: '权限掩码',
      minWidth: 200,
      format: (value: string) => {
        const permissions = value.split(',').filter(p => p.trim());
        return (
          <Space size={[4, 4]} wrap>
            {permissions.slice(0, 3).map((perm, index) => (
              <Tag key={index}>
                {PERMISSIONS[perm as keyof typeof PERMISSIONS] || perm}
              </Tag>
            ))}
            {permissions.length > 3 && (
              <Tag color="blue">+{permissions.length - 3}</Tag>
            )}
          </Space>
        );
      }
    },
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
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          分组管理
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{ borderRadius: 15 }}
        >
          添加分组
        </Button>
      </div>

      <ResponsiveDataTable
        title=""
        columns={columns}
        data={groups}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSettings={handlePermissions}
        actions={['edit', 'settings', 'delete']}
        loading={loading}
      />

      {/* 添加/编辑分组对话框 */}
      <Modal
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleSave}
        title={editingGroup ? '编辑分组' : '添加分组'}
        width={520}
        okText={editingGroup ? '更新' : '创建'}
        cancelText="取消"
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="分组名称">
            <Input
              value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
              disabled={!!editingGroup}
              placeholder="请输入分组名称"
            />
          </Form.Item>
          <Form.Item
            label="权限掩码"
            extra="多个权限用逗号分隔，如：file_read,file_write"
          >
            <Input
              value={formData.group_mask}
              onChange={(e) => setFormData({ ...formData, group_mask: e.target.value })}
              placeholder="请输入权限掩码"
            />
          </Form.Item>
          <Form.Item label="启用分组">
            <Switch
              checked={formData.is_enabled === 1}
              onChange={(checked) => setFormData({ ...formData, is_enabled: checked ? 1 : 0 })}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限管理对话框 */}
      <Modal
        open={permissionDialogOpen}
        onCancel={() => setPermissionDialogOpen(false)}
        onOk={handleSavePermissions}
        title={
          <Space>
            <SafetyCertificateOutlined />
            <span>权限管理 - {editingGroup?.group_name}</span>
          </Space>
        }
        width={720}
        okText="保存权限"
        cancelText="取消"
      >
        <div style={{ marginTop: 16 }}>
          <Typography.Title level={5}>选择权限</Typography.Title>
          <Divider style={{ marginBottom: 16 }} />

          <Row gutter={[16, 16]}>
            {Object.entries(PERMISSIONS).map(([key, label]) => (
              <Col xs={24} sm={12} md={8} key={key}>
                <Card size="small" hoverable>
                  <Checkbox
                    checked={selectedPermissions.includes(key)}
                    onChange={(e) => handlePermissionChange(key, e.target.checked)}
                  >
                    <div>
                      <Typography.Text strong style={{ fontSize: 14 }}>
                        {label}
                      </Typography.Text>
                      <br />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {key}
                      </Typography.Text>
                    </div>
                  </Checkbox>
                </Card>
              </Col>
            ))}
          </Row>

          <div style={{ marginTop: 24 }}>
            <Typography.Text type="secondary">
              已选择权限: {selectedPermissions.length} 个
            </Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Space size={[4, 4]} wrap>
                {selectedPermissions.map((perm) => (
                  <Tag
                    key={perm}
                    closable
                    onClose={() => handlePermissionChange(perm, false)}
                  >
                    {PERMISSIONS[perm as keyof typeof PERMISSIONS] || perm}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupManagement;