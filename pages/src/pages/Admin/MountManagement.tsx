import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Input,
  InputNumber,
  Select,
  Switch,
  Typography,
  Alert,
  Tag,
  Row,
  Col,
  Card,
  Divider,
  Form,
  Space,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import DataTable from '../../components/DataTable';
import { MountConfig } from '../../types';
import apiService from '../../posts/api';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface Driver {
  key: string;
  name: string;
  description: string;
  proxy_only?: boolean; // 是否强制使用代理模式
}

interface DriverField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'boolean' | 'select';
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { value: string; label: string }[];
}

const MountManagement: React.FC = () => {
  const [mounts, setMounts] = useState<MountConfig[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMount, setEditingMount] = useState<MountConfig | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [driverFields, setDriverFields] = useState<DriverField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string>('');

  // 加载挂载点列表
  const loadMounts = async () => {
    try {
      setLoading(true);
      // 拦截器已解包：result 为 { content: [...], total: N }
      const result: any = await apiService.get('/api/admin/storage/list');
      const list = result?.content || result?.data?.content || result || [];
      setMounts(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message || '加载挂载点失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载可用驱动列表
  const loadDrivers = async () => {
    try {
      // 拦截器已解包：result 为驱动数组 [...]
      const result: any = await apiService.get('/api/admin/driver/list');
      const list = Array.isArray(result) ? result : (result?.data || []);
      setDrivers(list);
    } catch (err: any) {
      console.error('加载驱动列表失败:', err.message);
    }
  };

  // 加载驱动配置字段
  const loadDriverFields = (driverType: string) => {
    try {
      // 从已加载的驱动列表中查找对应的字段信息
      const driver = drivers.find(d => d.key === driverType);
      if (driver && driver.fields) {
        setDriverFields(driver.fields);
        console.log('成功加载驱动配置字段:', driver.fields);
        
        // 初始化表单数据
        const initialData: Record<string, any> = {};
        driver.fields.forEach((field: DriverField) => {
          if (field.defaultValue !== undefined) {
            initialData[field.key] = field.defaultValue;
          } else if (field.default !== undefined) {
            initialData[field.key] = field.default;
          } else {
            initialData[field.key] = '';
          }
        });
        setFormData(prev => ({ ...prev, ...initialData }));
      } else {
        console.error('未找到驱动类型:', driverType);
        setDriverFields([]);
      }
    } catch (err) {
      console.error('加载驱动配置字段失败:', err);
    }
  };

  useEffect(() => {
    loadMounts();
    loadDrivers();
  }, []);

// 监听驱动选择变化，自动加载配置字段（仅在新增模式下）
  useEffect(() => {
    if (selectedDriver && drivers.length > 0 && !editingMount) {
      loadDriverFields(selectedDriver);
      
      // 如果驱动强制使用代理模式，自动设置proxy_mode为1
      const driver = drivers.find(d => d.key === selectedDriver);
      if (driver?.proxy_only) {
        setFormData(prev => ({ 
          ...prev, 
          proxy_mode: 1,
          proxy_data: prev.proxy_data || 'http://localhost:8080' // 设置默认代理地址
        }));
      }
    }
  }, [selectedDriver, drivers, editingMount]);

  const columns = [
    {
      id: 'index_list',
      label: '序号',
      minWidth: 60,
      format: (value: number) => value !== undefined && value !== null ? value : 1,
    },
    { id: 'mount_path', label: '挂载路径', minWidth: 150 },
    { id: 'mount_type', label: '驱动类型', minWidth: 120 },
    {
      id: 'proxy_mode',
      label: '代理模式',
      minWidth: 80,
      format: (value: number) => value === 1 ? '代理' : '直连',
    },
    {
      id: 'is_enabled',
      label: '状态',
      minWidth: 80,
      format: (value: number) => (
        <Tag color={value === 1 ? 'success' : 'default'}>
          {value === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      id: 'cache_time',
      label: '缓存时间(秒)',
      minWidth: 100,
      format: (value: number) => (value === 0 ? '无缓存' : `${value}秒`),
    },
    {
      id: 'proxy_data',
      label: '代理地址',
      minWidth: 150,
      format: (value: string) => value || '-',
    },
    {
      id: 'drive_logs',
      label: '日志',
      minWidth: 150,
      format: (value: string) => value || '-',
    },
  ];

  const handleAdd = () => {
    setEditingMount(null);
    setSelectedDriver('');
    setDriverFields([]);
    setFormData({
      mount_path: '',
      is_enabled: true,
      cache_time: 3600,
      index_list: 1,
      proxy_mode: 0,
      proxy_data: '',
      drive_tips: ''
    });
    setError('');
    setDialogOpen(true);
  };

  const handleEdit = async (mount: MountConfig) => {
    setEditingMount(mount);
    
    // 解析现有配置
    let driveConf = {};
    try {
      driveConf = mount.drive_conf ? JSON.parse(mount.drive_conf) : {};
    } catch (err) {
      console.error('解析配置失败:', err);
    }

    // 先设置表单数据
    const editFormData = {
      mount_path: mount.mount_path,
      mount_type: mount.mount_type,
      is_enabled: mount.is_enabled === 1,
      cache_time: mount.cache_time || 3600,
      index_list: mount.index_list || 1,
      proxy_mode: mount.proxy_mode || 0,
      proxy_data: mount.proxy_data || '',
      drive_tips: mount.drive_tips || '',
      ...driveConf
    };
    setFormData(editFormData);
    
    // 加载驱动字段
    const driver = drivers.find(d => d.key === mount.mount_type);
    if (driver && driver.fields) {
      setDriverFields(driver.fields);
    }
    
    // 最后设置选中的驱动（避免触发useEffect重置数据）
    setSelectedDriver(mount.mount_type);
    setError('');
    setDialogOpen(true);
  };

  const handleDelete = async (mount: MountConfig) => {
    if (!confirm(`确定要删除挂载点 "${mount.mount_path}" 吗？`)) {
      return;
    }

    try {
      // 拦截器：成功时返回 {}，失败时抛出 ApiError
      await apiService.post('/api/admin/storage/delete', {
        mount_path: mount.mount_path
      });
      await loadMounts();
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  const handleSave = async () => {
    if (!formData.mount_path || !selectedDriver) {
      setError('请填写挂载路径并选择驱动类型');
      return;
    }

    // 验证必填字段
    for (const field of driverFields) {
      if (field.required && !formData[field.key]) {
        setError(`请填写必填字段: ${field.label}`);
        return;
      }
    }

    // 验证代理数据
    if (formData.proxy_mode === 1 && !formData.proxy_data) {
      setError('代理模式选择代理时，必须填写代理数据');
      return;
    }

    // 构建驱动配置
    const driveConf: Record<string, any> = {};
    driverFields.forEach(field => {
      if (formData[field.key] !== undefined) {
        driveConf[field.key] = formData[field.key];
      }
    });

    const mountConfig = {
      mount_path: formData.mount_path,
      mount_type: selectedDriver,
      is_enabled: formData.is_enabled ? 1 : 0,
      cache_time: formData.cache_time || 3600,
      index_list: formData.index_list || 1,
      proxy_mode: formData.proxy_mode || 0,
      proxy_data: formData.proxy_data || '',
      drive_tips: formData.drive_tips || '',
      drive_conf: JSON.stringify(driveConf)
    };

    try {
      const url = editingMount ? '/api/admin/storage/update' : '/api/admin/storage/create';
      // 拦截器：成功时返回 {}，失败时抛出 ApiError
      await apiService.post(url, mountConfig);
      setDialogOpen(false);
      await loadMounts();
    } catch (err: any) {
      setError(err.message || '保存失败');
    }
  };

  // 单个挂载点重新加载
  const handleReload = async (mount: MountConfig) => {
    try {
      setLoading(true);
      await apiService.post('/api/admin/storage/enable', { mount_path: mount.mount_path });
      setError('');
      await loadMounts();
    } catch (err: any) {
      setError(err.message || `重新加载挂载点 "${mount.mount_path}" 失败`);
    } finally {
      setLoading(false);
    }
  };

  // 全部重新加载
  const handleReloadAll = async () => {
    if (!confirm('确定要重新加载所有挂载点吗？这可能需要一些时间。')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 为每个挂载点调用重新加载
      const reloadPromises = mounts.map(async (mount) => {
        try {
          await apiService.post('/api/admin/storage/enable', { mount_path: mount.mount_path });
          return { mount: mount.mount_path, success: true, message: '' };
        } catch (err: any) {
          return { mount: mount.mount_path, success: false, message: err.message || '网络错误' };
        }
      });

      const results = await Promise.all(reloadPromises);
      
      // 检查结果
      const failedMounts = results.filter(r => !r.success);
      if (failedMounts.length > 0) {
        const failedPaths = failedMounts.map(r => `${r.mount}: ${r.message}`).join('\n');
        setError(`以下挂载点重新加载失败：\n${failedPaths}`);
      } else {
        setError('');
      }
      
      // 重新加载挂载点列表
      await loadMounts();
    } catch (err) {
      setError('全部重新加载时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const renderFormField = (field: DriverField) => {
    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch
                checked={formData[field.key] || false}
                onChange={(checked) =>
                  setFormData((prev) => ({ ...prev, [field.key]: checked }))
                }
              />
              <Text>{field.label}</Text>
            </div>
          </div>
        );
      case 'select':
        return (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <Text style={{ display: 'block', marginBottom: 4 }}>
              {field.label}
              {field.required && <span style={{ color: '#ff4d4f' }}> *</span>}
            </Text>
            <Select
              style={{ width: '100%' }}
              value={formData[field.key] || field.defaultValue || undefined}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, [field.key]: value }))
              }
              placeholder={`请选择${field.label}`}
            >
              {field.options?.map((option: any) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </div>
        );
      case 'textarea':
        return (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <Text style={{ display: 'block', marginBottom: 4 }}>
              {field.label}
              {field.required && <span style={{ color: '#ff4d4f' }}> *</span>}
            </Text>
            <TextArea
              rows={3}
              value={formData[field.key] || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
            />
          </div>
        );
      case 'password':
        return (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <Text style={{ display: 'block', marginBottom: 4 }}>
              {field.label}
              {field.required && <span style={{ color: '#ff4d4f' }}> *</span>}
            </Text>
            <Input.Password
              value={formData[field.key] || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
            />
          </div>
        );
      default:
        return (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <Text style={{ display: 'block', marginBottom: 4 }}>
              {field.label}
              {field.required && <span style={{ color: '#ff4d4f' }}> *</span>}
            </Text>
            <Input
              value={formData[field.key] || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
            />
          </div>
        );
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            挂载管理
          </Title>
          <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
            管理和配置各种存储驱动的挂载点，支持多种云存储服务
          </Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={loading}
          >
            新增挂载
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadMounts}
            disabled={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<UndoOutlined />}
            onClick={handleReloadAll}
            disabled={loading || mounts.length === 0}
            style={{ backgroundColor: '#ffa726', borderColor: '#ffa726' }}
          >
            全部重新加载
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading}>
        <DataTable
          title="挂载点列表"
          columns={columns}
          data={mounts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReload={handleReload}
          actions={['edit', 'delete', 'reload']}
        />
      </Spin>

      {/* 新增/编辑对话框 */}
      <Modal
        title={editingMount ? '编辑挂载点' : '新增挂载点'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        width={800}
        destroyOnClose
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px 0' }}>
          {/* 第一行：驱动类型 和 挂载路径 */}
          <Row gutter={16}>
            <Col span={14}>
              <Text style={{ display: 'block', marginBottom: 4 }}>
                驱动类型 <span style={{ color: '#ff4d4f' }}>*</span>
              </Text>
              <Select
                style={{ width: '100%' }}
                value={selectedDriver || undefined}
                onChange={(value) => setSelectedDriver(value)}
                disabled={!!editingMount}
                placeholder="请选择驱动类型"
                showSearch
                optionFilterProp="children"
              >
                {drivers.map((driver) => (
                  <Select.Option key={driver.key} value={driver.key}>
                    {driver.name} - {driver.description}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={10}>
              <Text style={{ display: 'block', marginBottom: 4 }}>
                挂载路径 <span style={{ color: '#ff4d4f' }}>*</span>
              </Text>
              <Input
                value={formData.mount_path || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mount_path: e.target.value }))
                }
                placeholder="/example"
                disabled={!!editingMount}
              />
            </Col>
          </Row>

          {/* 第二行：缓存时间 序号 代理模式 代理地址 状态 */}
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={5}>
              <Text style={{ display: 'block', marginBottom: 4 }}>缓存时间(秒)</Text>
              <InputNumber
                style={{ width: '100%' }}
                value={formData.cache_time || 3600}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, cache_time: value || 3600 }))
                }
                min={0}
              />
            </Col>
            <Col span={3}>
              <Text style={{ display: 'block', marginBottom: 4 }}>序号</Text>
              <InputNumber
                style={{ width: '100%' }}
                value={formData.index_list || 1}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, index_list: value || 1 }))
                }
                min={1}
              />
            </Col>
            <Col span={5}>
              <Text style={{ display: 'block', marginBottom: 4 }}>代理模式</Text>
              <Select
                style={{ width: '100%' }}
                value={formData.proxy_mode || 0}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, proxy_mode: value }))
                }
                disabled={drivers.find((d) => d.key === selectedDriver)?.proxy_only}
              >
                <Select.Option value={0}>直连</Select.Option>
                <Select.Option value={1}>代理</Select.Option>
              </Select>
              {drivers.find((d) => d.key === selectedDriver)?.proxy_only && (
                <Text type="warning" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  该驱动仅支持代理模式
                </Text>
              )}
            </Col>
            <Col span={8}>
              <Text style={{ display: 'block', marginBottom: 4 }}>代理地址</Text>
              <Input
                value={formData.proxy_data || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, proxy_data: e.target.value }))
                }
                placeholder="http://proxy.example.com:8080"
                disabled={formData.proxy_mode !== 1}
              />
            </Col>
            <Col span={3}>
              <Text style={{ display: 'block', marginBottom: 4 }}>状态</Text>
              <Select
                style={{ width: '100%' }}
                value={formData.is_enabled ? 'enabled' : 'disabled'}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_enabled: value === 'enabled',
                  }))
                }
              >
                <Select.Option value="enabled">启用</Select.Option>
                <Select.Option value="disabled">停用</Select.Option>
              </Select>
            </Col>
          </Row>

          {/* 第三行：备注信息 */}
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Text style={{ display: 'block', marginBottom: 4 }}>备注信息</Text>
              <TextArea
                value={formData.drive_tips || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, drive_tips: e.target.value }))
                }
                placeholder="请输入备注信息"
                rows={2}
              />
            </Col>
          </Row>

          {/* 驱动配置字段 */}
          {driverFields.length > 0 && (
            <>
              <Divider />
              <Title level={5} style={{ marginBottom: 16 }}>
                驱动配置
              </Title>
              <Card size="small" style={{ borderRadius: 8 }}>
                {driverFields.map((field) => renderFormField(field))}
              </Card>
            </>
          )}

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MountManagement;