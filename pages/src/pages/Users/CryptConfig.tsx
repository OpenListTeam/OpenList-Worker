import React, { useState, useEffect } from 'react';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { CryptInfo } from '../../types';
import {
  Modal,
  Input,
  Select,
  Switch,
  Tag,
  Typography,
  Form,
  message,
} from 'antd';
import apiService from '../../posts/api';

const { Option } = Select;
const { TextArea } = Input;

const CryptConfig: React.FC = () => {
  const [crypts, setCrypts] = useState<CryptInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCrypt, setEditingCrypt] = useState<CryptInfo | null>(null);
  
  const [formData, setFormData] = useState<CryptInfo>({
    crypt_name: '',
    crypt_user: '',
    crypt_pass: '',
    crypt_type: 1,
    crypt_mode: 0x03,
    is_enabled: true,
    crypt_self: false,
    rands_pass: false,
    write_name: '',
    write_info: '',
    oauth_data: {}
  });



  useEffect(() => {
    fetchCrypts();
  }, []);

  const showMessage = (msg: string, severity: 'success' | 'error') => {
    if (severity === 'success') {
      message.success(msg);
    } else {
      message.error(msg);
    }
  };

  const fetchCrypts = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/@crypt/select/none');
      if (response.flag && response.data) {
        setCrypts(response.data);
      }
    } catch (error) {
      console.error('获取加密配置失败:', error);
      showMessage('获取加密配置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getCryptTypeText = (type: number) => {
    const typeMap: { [key: number]: string } = {
      1: 'AES',
      2: 'RSA',
      3: 'ChaCha20',
    };
    return typeMap[type] || `类型${type}`;
  };

  const getCryptModeText = (mode: number) => {
    const modeMap: { [key: number]: string } = {
      0x00: '仅加密名称B64',
      0x01: '仅加密文件AES（安全性高，兼容Crypt）',
      0x02: '仅加密名称AES（安全性高，兼容Crypt）',
      0x03: '文件和名称AES（安全性高，兼容Crypt）',
      0x04: '仅加密文件XOR（安全性低，但不占CPU）',
      0x05: '仅加密名称XOR（安全性低，但不占CPU）',
      0x06: '文件和名称XOR（安全性低，但不占CPU）',
      0x07: '仅加密文件XOR（自动解密，且不占CPU）',
      0x08: '仅加密名称XOR（自动解密，且不占CPU）',
      0x09: '文件和名称XOR（自动解密，且不占CPU）',
      0x0a: '仅加密文件SM4（安全性高，非常吃CPU）',
      0x0b: '仅加密名称SM4（安全性高，非常吃CPU）',
      0x0c: '文件和名称SM4（安全性高，非常吃CPU）',
      0x0d: '仅加密文件SM4（自动解密，非常吃CPU）',
      0x0e: '仅加密名称SM4（自动解密，非常吃CPU）',
      0x0f: '文件和名称SM4（自动解密，非常吃CPU）',
    };
    return modeMap[mode] || `模式0x${mode.toString(16)}`;
  };

  const handleAdd = () => {
    setEditingCrypt(null);
    setFormData({
      crypt_name: '',
      crypt_user: '',
      crypt_pass: '',
      crypt_type: 1,
      crypt_mode: 0x03,
      is_enabled: true,
      crypt_self: false,
      rands_pass: false,
      write_name: '',
      write_info: '',
      oauth_data: {}
    });
    setOpenDialog(true);
  };

  const handleEdit = (crypt: CryptInfo) => {
    setEditingCrypt(crypt);
    setFormData({ ...crypt });
    setOpenDialog(true);
  };

  const handleDelete = async (crypt: CryptInfo) => {
    if (!confirm(`确定要删除加密配置 "${crypt.crypt_name}" 吗？`)) {
      return;
    }

    try {
      const response = await apiService.post('/@crypt/remove/none', {
        crypt_name: crypt.crypt_name
      });
      
      if (response.flag) {
        showMessage('删除成功', 'success');
        fetchCrypts();
      } else {
        showMessage(response.text || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除加密配置失败:', error);
      showMessage('删除失败', 'error');
    }
  };

  const handleToggleStatus = async (crypt: CryptInfo) => {
    try {
      const response = await apiService.post('/@crypt/status/none', {
        crypt_name: crypt.crypt_name,
        is_enabled: !crypt.is_enabled
      });
      
      if (response.flag) {
        showMessage('状态更新成功', 'success');
        fetchCrypts();
      } else {
        showMessage(response.text || '状态更新失败', 'error');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      showMessage('状态更新失败', 'error');
    }
  };

  const handleSave = async () => {
    try {
      const endpoint = editingCrypt ? '/@crypt/config/none' : '/@crypt/create/none';
      const response = await apiService.post(endpoint, formData);
      
      if (response.flag) {
        showMessage(editingCrypt ? '更新成功' : '创建成功', 'success');
        setOpenDialog(false);
        fetchCrypts();
      } else {
        showMessage(response.text || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存加密配置失败:', error);
      showMessage('保存失败', 'error');
    }
  };

  const columns = [
    { id: 'crypt_name', label: '加密名称', minWidth: 120 },
    { id: 'crypt_user', label: '用户', minWidth: 100 },
    { 
      id: 'crypt_type', 
      label: '加密类型', 
      minWidth: 100,
      format: (value: number) => getCryptTypeText(value)
    },
    { 
      id: 'crypt_mode', 
      label: '加密模式', 
      minWidth: 150,
      format: (value: number) => getCryptModeText(value)
    },
    { 
      id: 'is_enabled', 
      label: '状态', 
      minWidth: 80,
      format: (value: boolean, row: CryptInfo) => (
        <Tag
          color={value ? 'success' : 'default'}
          onClick={() => handleToggleStatus(row)}
          style={{ cursor: 'pointer' }}
        >
          {value ? '启用' : '禁用'}
        </Tag>
      )
    },
    { 
      id: 'crypt_self', 
      label: '存储密码', 
      minWidth: 100,
      format: (value: boolean) => (
        <Tag color={value ? 'blue' : 'default'}>
          {value ? '是' : '否'}
        </Tag>
      )
    },
    { 
      id: 'rands_pass', 
      label: '随机密码', 
      minWidth: 100,
      format: (value: boolean) => (
        <Tag color={value ? 'blue' : 'default'}>
          {value ? '启用' : '禁用'}
        </Tag>
      )
    },
    { id: 'write_name', label: '后缀名称', minWidth: 120 },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          加密配置
        </Typography.Title>
      </div>
      <ResponsiveDataTable
        title="加密配置"
        columns={columns}
        data={crypts}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        actions={['add', 'edit', 'delete']}
      />

      <Modal
        title={editingCrypt ? '编辑加密配置' : '添加加密配置'}
        open={openDialog}
        onCancel={() => setOpenDialog(false)}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="加密名称" required>
            <Input
              value={formData.crypt_name}
              onChange={(e) => setFormData({ ...formData, crypt_name: e.target.value })}
              placeholder="请输入加密名称"
            />
          </Form.Item>
          <Form.Item label="用户标识" required>
            <Input
              value={formData.crypt_user}
              onChange={(e) => setFormData({ ...formData, crypt_user: e.target.value })}
              placeholder="请输入用户标识"
            />
          </Form.Item>
          <Form.Item label="加密密码" required>
            <Input.Password
              value={formData.crypt_pass}
              onChange={(e) => setFormData({ ...formData, crypt_pass: e.target.value })}
              placeholder="请输入加密密码"
            />
          </Form.Item>
          <Form.Item label="加密类型">
            <Select
              value={formData.crypt_type}
              onChange={(value) => setFormData({ ...formData, crypt_type: value })}
              style={{ width: '100%' }}
            >
              <Option value={1}>AES</Option>
              <Option value={2}>RSA</Option>
              <Option value={3}>ChaCha20</Option>
            </Select>
          </Form.Item>
          <Form.Item label="加密模式">
            <Select
              value={formData.crypt_mode}
              onChange={(value) => setFormData({ ...formData, crypt_mode: value })}
              style={{ width: '100%' }}
            >
              <Option value={0x00}>仅文件名不加密</Option>
              <Option value={0x01}>仅文件AES验证</Option>
              <Option value={0x02}>仅文件名AES验证</Option>
              <Option value={0x03}>文件和文件名AES验证</Option>
              <Option value={0x04}>仅文件XOR验证</Option>
              <Option value={0x05}>仅文件名XOR验证</Option>
              <Option value={0x06}>文件和文件名XOR验证</Option>
              <Option value={0x07}>仅文件XOR保存</Option>
              <Option value={0x08}>仅文件名XOR保存</Option>
              <Option value={0x09}>文件和文件名XOR保存</Option>
              <Option value={0x0a}>仅文件C20验证</Option>
              <Option value={0x0b}>仅文件名C20验证</Option>
              <Option value={0x0c}>文件和文件名C20验证</Option>
              <Option value={0x0d}>仅文件C20保存</Option>
              <Option value={0x0e}>仅文件名C20保存</Option>
              <Option value={0x0f}>文件和文件名C20保存</Option>
            </Select>
          </Form.Item>
          <Form.Item label="写入后缀名称">
            <Input
              value={formData.write_name}
              onChange={(e) => setFormData({ ...formData, write_name: e.target.value })}
              placeholder="请输入写入后缀名称"
            />
          </Form.Item>
          <Form.Item label="写入信息">
            <TextArea
              value={formData.write_info}
              onChange={(e) => setFormData({ ...formData, write_info: e.target.value })}
              rows={2}
              placeholder="请输入写入信息"
            />
          </Form.Item>
          <Form.Item label="启用配置">
            <Switch
              checked={formData.is_enabled}
              onChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
            />
          </Form.Item>
          <Form.Item label="存储密码">
            <Switch
              checked={formData.crypt_self}
              onChange={(checked) => setFormData({ ...formData, crypt_self: checked })}
            />
          </Form.Item>
          <Form.Item label="随机密码">
            <Switch
              checked={formData.rands_pass}
              onChange={(checked) => setFormData({ ...formData, rands_pass: checked })}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CryptConfig;