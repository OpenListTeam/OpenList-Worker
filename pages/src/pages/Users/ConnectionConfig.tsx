import React, { useState, useEffect } from 'react';
import {
  Tag,
  Spin,
  Alert,
  Typography,
  Modal,
  Button,
  Input,
  Select,
  Switch,
  Row,
  Col,
  message,
  Form,
  DatePicker,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import DataTable from '../../components/DataTable';
import { Token } from '../../types';
import apiService from '../../posts/api';
import { useAuthStore } from '../../store';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ConnectionConfig: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const user = useAuthStore(state => state.user);
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    token_name: '',
    token_data: '',
    token_type: 'api',
    token_ends: '',
    is_enabled: 1
  });

  // 获取当前用户的连接配置
  const loadTokens = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.users_name) {
        setError('用户未登录');
        return;
      }

      const result = await apiService.post('/api/admin/token/user', {
        token_user: user.users_name
      });
      
      if (Array.isArray(result)) {
        const convertedTokens = (result || []).map((token: any) => ({
          token_uuid: token.token_uuid,
          token_path: token.token_name || '',
          token_user: token.token_user,
          token_type: token.token_type || 'api',
          token_info: token.token_data || '',
          is_enabled: token.is_enabled || 0,
        }));
        setTokens(convertedTokens);
      } else if (result && result.flag === false) {
        setError(result.text || '获取连接配置失败');
      } else {
        setTokens([]);
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取连接配置失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [user]);

  const getTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'api': 'API接口',
      'webdav': 'WebDAV',
      'ftp': 'FTP',
      'sftp': 'SFTP',
    };
    return typeMap[type] || type;
  };

  const columns = [
    { id: 'token_uuid', label: '连接UUID', minWidth: 150 },
    { id: 'token_path', label: '连接路径', minWidth: 200 },
    { id: 'token_user', label: '所属用户', minWidth: 120 },
    { 
      id: 'token_type', 
      label: '连接类型', 
      minWidth: 120,
      format: (value: string) => getTypeText(value)
    },
    { 
      id: 'token_info', 
      label: '登录信息', 
      minWidth: 200,
      format: (_value: string) => '已配置'
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

  // 添加连接配置
  const handleAdd = () => {
    setEditingToken(null);
    setFormData({
      token_name: '',
      token_data: '',
      token_type: 'api',
      token_ends: '',
      is_enabled: 1
    });
    setDialogOpen(true);
  };

  const handleEdit = (token: Token) => {
    setEditingToken(token);
    setFormData({
      token_name: token.token_path,
      token_data: token.token_info,
      token_type: token.token_type,
      token_ends: '',
      is_enabled: token.is_enabled
    });
    setDialogOpen(true);
  };

  const handleDelete = async (token: Token) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除连接配置 "${token.token_path}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await apiService.post('/api/admin/token/remove', { 
            token_uuid: token.token_uuid 
          });
          if (response === null || response === undefined || (response && response.flag !== false)) {
            message.success('删除成功');
            loadTokens();
          } else {
            message.error(response.text || '删除失败');
          }
        } catch (err) {
          message.error('删除失败');
        }
      },
    });
  };

  // 保存连接配置
  const handleSave = async () => {
    if (!formData.token_name.trim()) {
      message.error('连接名称不能为空');
      return;
    }

    if (!user?.users_name) {
      message.error('用户未登录');
      return;
    }

    try {
      const tokenData = {
        token_uuid: editingToken?.token_uuid || '',
        token_name: formData.token_name,
        token_data: formData.token_data,
        token_user: user.users_name,
        token_ends: formData.token_ends,
        is_enabled: formData.is_enabled
      };

      const action = editingToken ? 'config' : 'create';
      const response = await apiService.post(`/api/admin/token/${action}`, tokenData);
      
      if (response === null || response === undefined || (response && response.flag !== false)) {
        message.success(editingToken ? '更新成功' : '创建成功');
        setDialogOpen(false);
        loadTokens();
      } else {
        message.error(response.text || '操作失败');
      }
    } catch (err) {
      message.error('操作失败');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={4}>连接配置</Title>
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>连接配置</Title>
          <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
            配置和管理外部存储连接，支持WebDAV、FTP等协议
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加连接
        </Button>
      </div>

      <DataTable
        title="连接配置"
        columns={columns}
        data={tokens}
        onEdit={handleEdit}
        onDelete={handleDelete}
        actions={['edit', 'delete']}
      />

      {/* 添加/编辑对话框 */}
      <Modal
        title={editingToken ? '编辑连接配置' : '添加连接配置'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleSave}
        okText={editingToken ? '更新' : '创建'}
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="连接名称">
                <Input
                  value={formData.token_name}
                  onChange={(e) => setFormData({ ...formData, token_name: e.target.value })}
                  placeholder="例如: my-api-connection"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="连接类型">
                <Select
                  value={formData.token_type}
                  onChange={(value) => setFormData({ ...formData, token_type: value })}
                  options={[
                    { value: 'api', label: 'API接口' },
                    { value: 'webdav', label: 'WebDAV' },
                    { value: 'ftp', label: 'FTP' },
                    { value: 'sftp', label: 'SFTP' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="连接数据">
                <TextArea
                  value={formData.token_data}
                  onChange={(e) => setFormData({ ...formData, token_data: e.target.value })}
                  placeholder='例如: {"host": "example.com", "port": 21, "username": "user", "password": "pass"}'
                  rows={4}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="过期时间">
                <Input
                  value={formData.token_ends}
                  onChange={(e) => setFormData({ ...formData, token_ends: e.target.value })}
                  placeholder="留空表示永不过期"
                  type="datetime-local"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="启用连接">
                <Switch
                  checked={formData.is_enabled === 1}
                  onChange={(checked) => setFormData({ ...formData, is_enabled: checked ? 1 : 0 })}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default ConnectionConfig;