import React, { useState, useEffect } from 'react';
import {
  Typography,
  Spin,
  Alert,
  Modal,
  Button,
  Input,
  Switch,
  Select,
  Tag,
  Form,
  message,
} from 'antd';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { OAuth } from '../../types';
import apiService from '../../posts/api';

const OAuthManagement: React.FC = () => {
  const [oauths, setOauths] = useState<OAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState({ open: false, oauth: null as OAuth | null });
  const [createDialog, setCreateDialog] = useState({ open: false });
  const [formData, setFormData] = useState<Partial<OAuth>>({
    oauth_name: '',
    oauth_type: '',
    oauth_data: '',
    is_enabled: 1
  });

  // 获取OAuth配置列表
  const fetchOauths = async () => {
    try {
      setLoading(true);
      const result = await apiService.get('/api/admin/user/list?oauth=1');
      // 拦截器已解包：result 直接是数组或含 content 的对象
      const list = Array.isArray(result) ? result : (result?.content || result?.data || []);
      setOauths(list);
      setError(null);
    } catch (error) {
      console.error('获取OAuth配置错误:', error);
      setError('获取OAuth配置失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOauths();
  }, []);

  // 显示消息
  const showMessage = (msg: string, severity: 'success' | 'error' = 'success') => {
    if (severity === 'success') {
      message.success(msg);
    } else {
      message.error(msg);
    }
  };

  const getTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'google': 'Google',
      'github': 'GitHub',
      'microsoft': 'Microsoft',
      'facebook': 'Facebook',
      'twitter': 'Twitter',
      'wechat': '微信',
      'qq': 'QQ',
      'weibo': '微博',
      'dingtalk': '钉钉',
      'feishu': '飞书'
    };
    return typeMap[type] || type;
  };

  const columns = [
    { id: 'oauth_name', label: '授权名称', minWidth: 150 },
    { 
      id: 'oauth_type', 
      label: '授权类型', 
      minWidth: 120,
      format: (value: string) => getTypeText(value)
    },
    { 
      id: 'oauth_data', 
      label: '授权数据', 
      minWidth: 200,
      format: (value: string) => {
        try {
          const data = JSON.parse(value);
          return `Client ID: ${data.client_id ? data.client_id.substring(0, 10) + '...' : '未配置'}`;
        } catch {
          return '配置格式错误';
        }
      }
    },
    { 
      id: 'is_enabled', 
      label: '状态', 
      minWidth: 80,
      format: (value: number, row: OAuth) => (
        <Tag
          color={value === 1 ? 'success' : 'default'}
          onClick={() => handleToggleStatus(row)}
          style={{ cursor: 'pointer' }}
        >
          {value === 1 ? '启用' : '禁用'}
        </Tag>
      )
    },
  ];

  // 切换OAuth状态
  const handleToggleStatus = async (oauth: OAuth) => {
    try {
      const newStatus = oauth.is_enabled === 1 ? 0 : 1;
      const result = await apiService.post('/api/admin/user/update', {
        oauth_name: oauth.oauth_name,
        is_enabled: newStatus
      });

      showMessage(`OAuth配置已${newStatus === 1 ? '启用' : '禁用'}`);
      await fetchOauths();
    } catch (error) {
      console.error('切换状态错误:', error);
      showMessage('状态切换失败', 'error');
    }
  };

  // 添加OAuth配置
  const handleAddOAuth = () => {
    setFormData({
      oauth_name: '',
      oauth_type: '',
      oauth_data: '',
      is_enabled: 1
    });
    setCreateDialog({ open: true });
  };

  // 编辑OAuth配置
  const handleEdit = (oauth: OAuth) => {
    setFormData({
      oauth_name: oauth.oauth_name,
      oauth_type: oauth.oauth_type,
      oauth_data: oauth.oauth_data,
      is_enabled: oauth.is_enabled
    });
    setEditDialog({ open: true, oauth });
  };

  // 删除OAuth配置
  const handleDelete = async (oauth: OAuth) => {
    if (!window.confirm(`确定要删除OAuth配置 "${oauth.oauth_name}" 吗？`)) {
      return;
    }

    try {
      const result = await apiService.post('/api/admin/user/delete', {
        oauth_name: oauth.oauth_name
      });

      showMessage('OAuth配置删除成功');
      await fetchOauths();
    } catch (error) {
      console.error('删除OAuth配置错误:', error);
      showMessage('删除失败', 'error');
    }
  };

  // 保存创建
  const handleSaveCreate = async () => {
    if (!formData.oauth_name || !formData.oauth_type || !formData.oauth_data) {
      showMessage('请填写所有必填字段', 'error');
      return;
    }

    try {
      // 验证oauth_data是否为有效JSON
      JSON.parse(formData.oauth_data!);
      
      const result = await apiService.post('/api/admin/user/create', formData);

      showMessage('OAuth配置创建成功');
      setCreateDialog({ open: false });
      await fetchOauths();
    } catch (error) {
      if (error instanceof SyntaxError) {
        showMessage('OAuth数据格式错误，请输入有效的JSON', 'error');
      } else {
        console.error('创建OAuth配置错误:', error);
        showMessage('创建失败', 'error');
      }
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!formData.oauth_name || !formData.oauth_type || !formData.oauth_data) {
      showMessage('请填写所有必填字段', 'error');
      return;
    }

    try {
      // 验证oauth_data是否为有效JSON
      JSON.parse(formData.oauth_data!);
      
      const result = await apiService.post('/api/admin/user/update', formData);

      showMessage('OAuth配置更新成功');
      setEditDialog({ open: false, oauth: null });
      await fetchOauths();
    } catch (error) {
      if (error instanceof SyntaxError) {
        showMessage('OAuth数据格式错误，请输入有效的JSON', 'error');
      } else {
        console.error('更新OAuth配置错误:', error);
        showMessage('更新失败', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error} showIcon />
      </div>
    );
  }

  // OAuth类型选项
  const oauthTypeOptions = [
    { value: 'google', label: 'Google' },
    { value: 'github', label: 'GitHub' },
    { value: 'microsoft', label: 'Microsoft' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'wechat', label: '微信' },
    { value: 'qq', label: 'QQ' },
    { value: 'weibo', label: '微博' },
    { value: 'dingtalk', label: '钉钉' },
    { value: 'feishu', label: '飞书' },
  ];

  // 渲染表单内容（创建和编辑共用）
  const renderFormContent = (isEdit: boolean) => (
    <Form layout="vertical" style={{ marginTop: 8 }}>
      <Form.Item label="授权名称" required help={isEdit ? '授权名称不可修改' : '唯一标识符，如：google_oauth'}>
        <Input
          value={formData.oauth_name || ''}
          onChange={(e) => setFormData({ ...formData, oauth_name: e.target.value })}
          disabled={isEdit}
          placeholder="请输入授权名称"
        />
      </Form.Item>

      <Form.Item label="授权类型" required>
        <Select
          value={formData.oauth_type || undefined}
          onChange={(value) => setFormData({ ...formData, oauth_type: value })}
          placeholder="请选择授权类型"
          options={oauthTypeOptions}
        />
      </Form.Item>

      <Form.Item
        label="授权数据"
        required
        help='JSON格式，如：{"client_id": "your_client_id", "client_secret": "your_client_secret"}'
      >
        <Input.TextArea
          value={formData.oauth_data || ''}
          onChange={(e) => setFormData({ ...formData, oauth_data: e.target.value })}
          rows={4}
          placeholder="请输入JSON格式的授权数据"
        />
      </Form.Item>

      <Form.Item label="启用配置">
        <Switch
          checked={formData.is_enabled === 1}
          onChange={(checked) => setFormData({ ...formData, is_enabled: checked ? 1 : 0 })}
        />
      </Form.Item>
    </Form>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          三方登录
        </Typography.Title>
      </div>

      <ResponsiveDataTable
        title="OAuth授权管理"
        columns={columns}
        data={oauths}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={handleAddOAuth}
        actions={['edit', 'delete', 'add']}
      />

      {/* 创建OAuth配置对话框 */}
      <Modal
        title="创建OAuth配置"
        open={createDialog.open}
        onCancel={() => setCreateDialog({ open: false })}
        onOk={handleSaveCreate}
        okText="创建"
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        {renderFormContent(false)}
      </Modal>

      {/* 编辑OAuth配置对话框 */}
      <Modal
        title="编辑OAuth配置"
        open={editDialog.open}
        onCancel={() => setEditDialog({ open: false, oauth: null })}
        onOk={handleSaveEdit}
        okText="保存"
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        {renderFormContent(true)}
      </Modal>
    </div>
  );
};

export default OAuthManagement;