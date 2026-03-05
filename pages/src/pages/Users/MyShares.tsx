import React, { useState, useEffect } from 'react';
import {
  Spin,
  Alert,
  Modal,
  Button,
  Input,
  Switch,
  Tag,
  Typography,
  message,
  Space,
  Form,
  DatePicker,
} from 'antd';
import dayjs from 'dayjs';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { ShareConfig } from '../../types';
import apiService from '../../posts/api';

const { Title, Text } = Typography;

const MyShares: React.FC = () => {
  const [shares, setShares] = useState<ShareConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState({ open: false, share: null as ShareConfig | null });
  const [createDialog, setCreateDialog] = useState({ open: false });
  const [formData, setFormData] = useState<Partial<ShareConfig>>({
    share_path: '',
    share_pass: '',
    share_user: '',
    share_ends: '',
    is_enabled: 1
  });
  const [messageApi, contextHolder] = message.useMessage();

  // 获取分享列表
  const fetchShares = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/@share/select/none', 'POST', {});
      if (result.flag) {
        const data = result.data;
        if (Array.isArray(data)) {
          setShares(data);
        } else {
          setShares([]);
          console.warn('API返回的数据不是数组类型:', data);
        }
      } else {
        setError(result.text || '获取分享列表失败');
      }
    } catch (err) {
      console.error('获取分享列表错误:', err);
      setError('获取分享列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const formatDate = (dateValue: string | number) => {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : new Date(dateValue * 1000);
    return date.toLocaleDateString('zh-CN');
  };

  const columns = [
    { id: 'share_uuid', label: '分享ID', minWidth: 120 },
    { id: 'share_path', label: '分享路径', minWidth: 200 },
    { id: 'share_pass', label: '分享密码', minWidth: 100, format: (value: string) => value || '无密码' },
    { id: 'share_user', label: '分享用户', minWidth: 100 },
    {
      id: 'share_date',
      label: '分享日期',
      minWidth: 200,
      format: (value: string | number) => formatDate(value)
    },
    {
      id: 'share_ends',
      label: '有效期限',
      minWidth: 200,
      format: (value: string | number) => formatDate(value)
    },
    {
      id: 'is_enabled',
      label: '状态',
      minWidth: 80,
      format: (value: number, row: ShareConfig) => (
        <Tag
          color={value === 1 ? 'success' : 'default'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleToggleStatus(row)}
        >
          {value === 1 ? '启用' : '禁用'}
        </Tag>
      )
    },
  ];

  // 显示消息
  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    messageApi[type](msg);
  };

  // 处理添加分享
  const handleAddShare = () => {
    setFormData({
      share_path: '',
      share_pass: '',
      share_user: '',
      share_ends: '',
      is_enabled: 1
    });
    setCreateDialog({ open: true });
  };

  // 处理保存新分享
  const handleSaveCreate = async () => {
    if (!formData.share_path || !formData.share_user) {
      showMessage('请填写分享路径和用户', 'error');
      return;
    }
    try {
      const shareData: ShareConfig = {
        share_uuid: '',
        share_path: formData.share_path,
        share_pass: formData.share_pass || '',
        share_user: formData.share_user,
        share_date: new Date().toISOString(),
        share_ends: formData.share_ends || '',
        is_enabled: formData.is_enabled || 1
      };
      const result = await apiService.request('/@share/create/none', 'POST', shareData);
      if (result.flag) {
        showMessage('分享创建成功');
        setCreateDialog({ open: false });
        fetchShares();
      } else {
        showMessage(`创建分享失败: ${result.text}`, 'error');
      }
    } catch (err) {
      console.error('创建分享错误:', err);
      showMessage('创建分享失败，请检查网络连接', 'error');
    }
  };

  // 处理编辑分享
  const handleEdit = (share: ShareConfig) => {
    setEditDialog({ open: true, share });
  };

  // 处理删除分享
  const handleDelete = async (share: ShareConfig) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个分享吗？',
      onOk: async () => {
        try {
          const result = await apiService.request('/@share/remove/none', 'POST', {
            share_uuid: share.share_uuid
          });
          if (result.flag) {
            showMessage('分享删除成功');
            fetchShares();
          } else {
            showMessage(`删除分享失败: ${result.text}`, 'error');
          }
        } catch (err) {
          console.error('删除分享错误:', err);
          showMessage('删除分享失败，请检查网络连接', 'error');
        }
      }
    });
  };

  // 处理复制分享链接
  const handleCopyLink = async (share: ShareConfig) => {
    try {
      const shareUrl = `${window.location.origin}/share/${share.share_uuid}`;
      await navigator.clipboard.writeText(shareUrl);
      showMessage(`分享链接已复制到剪贴板: ${shareUrl}`);
    } catch (err) {
      console.error('复制链接错误:', err);
      showMessage('复制链接失败', 'error');
    }
  };

  // 处理分享状态切换
  const handleToggleStatus = async (share: ShareConfig) => {
    try {
      const newStatus = share.is_enabled === 1 ? 0 : 1;
      const result = await apiService.request('/@share/status/none', 'POST', {
        share_uuid: share.share_uuid,
        is_enabled: newStatus
      });
      if (result.flag) {
        showMessage(`分享已${newStatus === 1 ? '启用' : '禁用'}`);
        fetchShares();
      } else {
        showMessage(`更新分享状态失败: ${result.text}`, 'error');
      }
    } catch (err) {
      console.error('更新分享状态错误:', err);
      showMessage('更新分享状态失败，请检查网络连接', 'error');
    }
  };

  // 保存编辑的分享
  const handleSaveEdit = async () => {
    if (!editDialog.share) return;
    try {
      const result = await apiService.request('/@share/config/none', 'POST', editDialog.share);
      if (result.flag) {
        showMessage('分享更新成功');
        setEditDialog({ open: false, share: null });
        fetchShares();
      } else {
        showMessage(`更新分享失败: ${result.text}`, 'error');
      }
    } catch (err) {
      console.error('更新分享错误:', err);
      showMessage('更新分享失败，请检查网络连接', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Alert message={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>我的分享</Title>
          <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
            管理和分享您的文件，设置分享权限和有效期
          </Text>
        </div>
      </div>

      <ResponsiveDataTable
        title="我的分享"
        columns={columns}
        data={shares}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onLink={handleCopyLink}
        onShare={handleToggleStatus}
        onAdd={handleAddShare}
        actions={['add', 'link', 'share', 'edit', 'delete']}
      />

      {/* 编辑分享对话框 */}
      <Modal
        title="编辑分享"
        open={editDialog.open}
        onCancel={() => setEditDialog({ open: false, share: null })}
        onOk={handleSaveEdit}
        okText="保存"
        cancelText="取消"
        width={520}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="分享密码">
            <Input
              value={editDialog.share?.share_pass || ''}
              onChange={(e) => setEditDialog(prev => ({
                ...prev,
                share: prev.share ? { ...prev.share, share_pass: e.target.value } : null
              }))}
            />
          </Form.Item>
          <Form.Item label="有效期限">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              value={editDialog.share?.share_ends
                ? dayjs(typeof editDialog.share.share_ends === 'string'
                  ? editDialog.share.share_ends
                  : editDialog.share.share_ends * 1000)
                : null}
              onChange={(val) => setEditDialog(prev => ({
                ...prev,
                share: prev.share ? { ...prev.share, share_ends: val ? val.toISOString() : '' } : null
              }))}
            />
          </Form.Item>
          <Form.Item label="启用分享">
            <Switch
              checked={editDialog.share?.is_enabled === 1}
              onChange={(checked) => setEditDialog(prev => ({
                ...prev,
                share: prev.share ? { ...prev.share, is_enabled: checked ? 1 : 0 } : null
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建分享对话框 */}
      <Modal
        title="创建分享"
        open={createDialog.open}
        onCancel={() => setCreateDialog({ open: false })}
        onOk={handleSaveCreate}
        okText="创建"
        cancelText="取消"
        width={520}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="分享路径" required>
            <Input
              value={formData.share_path || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, share_path: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label="分享用户" required>
            <Input
              value={formData.share_user || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, share_user: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label="分享密码（可选）">
            <Input
              value={formData.share_pass || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, share_pass: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label="有效期限（可选）">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              value={formData.share_ends ? dayjs(formData.share_ends) : null}
              onChange={(val) => setFormData(prev => ({ ...prev, share_ends: val ? val.toISOString() : '' }))}
            />
          </Form.Item>
          <Form.Item label="启用分享">
            <Switch
              checked={formData.is_enabled === 1}
              onChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked ? 1 : 0 }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyShares;