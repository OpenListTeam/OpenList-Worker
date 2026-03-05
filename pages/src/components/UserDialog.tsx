import React, { useState, useEffect } from 'react';
import {
  Modal,
  Input,
  Switch,
  Alert,
  Typography,
  Divider,
  Form,
  Space,
} from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { UsersConfig, CreateUserRequest, UpdateUserRequest } from '../types';

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  user?: UsersConfig | null;
  mode: 'create' | 'edit';
  loading?: boolean;
}

const UserDialog: React.FC<UserDialogProps> = ({
  open,
  onClose,
  onSubmit,
  user,
  mode,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateUserRequest | UpdateUserRequest>({
    users_name: '',
    users_mail: '',
    users_pass: '',
    is_enabled: true,
    total_size: 1024 * 1024 * 1024 // 默认1GB
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化表单数据
  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        users_name: user.users_name,
        users_mail: user.users_mail || '',
        users_pass: '', // 编辑时密码为空，表示不修改
        is_enabled: user.is_enabled ?? true,
        total_size: user.total_size || 1024 * 1024 * 1024,
        total_used: user.total_used || 0,
        users_mask: user.users_mask || '',
        oauth_data: user.oauth_data || '',
        mount_data: user.mount_data || ''
      });
    } else {
      setFormData({
        users_name: '',
        users_mail: '',
        users_pass: '',
        is_enabled: true,
        total_size: 1024 * 1024 * 1024
      });
    }
    setErrors({});
  }, [mode, user, open]);

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.users_name || formData.users_name.length < 5) {
      newErrors.users_name = '用户名至少需要5个字符';
    }

    if (mode === 'create' && (!formData.users_pass || formData.users_pass.length < 6)) {
      newErrors.users_pass = '密码至少需要6个字符';
    }

    if (mode === 'edit' && formData.users_pass && formData.users_pass.length < 6) {
      newErrors.users_pass = '密码至少需要6个字符';
    }

    if (formData.users_mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.users_mail)) {
      newErrors.users_mail = '邮箱格式不正确';
    }

    if (!formData.total_size || formData.total_size <= 0) {
      newErrors.total_size = '存储空间必须大于0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // 格式化存储空间大小
  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 解析存储空间输入
  const parseStorageInput = (input: string): number => {
    const match = input.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    
    const multipliers: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    
    return value * (multipliers[unit] || 1);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      title={mode === 'create' ? '创建用户' : '编辑用户'}
      width={520}
      okText={loading ? '处理中...' : (mode === 'create' ? '创建' : '保存')}
      cancelText="取消"
      confirmLoading={loading}
      okButtonProps={{ disabled: loading }}
      cancelButtonProps={{ disabled: loading }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 8 }}>
        <div>
          <Typography.Text style={{ marginBottom: 4, display: 'block' }}>
            用户名 <span style={{ color: '#ff4d4f' }}>*</span>
          </Typography.Text>
          <Input
            placeholder="请输入用户名"
            value={formData.users_name}
            onChange={(e) => handleInputChange('users_name', e.target.value)}
            status={errors.users_name ? 'error' : undefined}
            disabled={mode === 'edit'}
          />
          {errors.users_name && (
            <Typography.Text type="danger" style={{ fontSize: 12 }}>{errors.users_name}</Typography.Text>
          )}
        </div>

        <div>
          <Typography.Text style={{ marginBottom: 4, display: 'block' }}>邮箱</Typography.Text>
          <Input
            placeholder="请输入邮箱"
            type="email"
            value={formData.users_mail}
            onChange={(e) => handleInputChange('users_mail', e.target.value)}
            status={errors.users_mail ? 'error' : undefined}
          />
          {errors.users_mail && (
            <Typography.Text type="danger" style={{ fontSize: 12 }}>{errors.users_mail}</Typography.Text>
          )}
        </div>

        <div>
          <Typography.Text style={{ marginBottom: 4, display: 'block' }}>
            {mode === 'create' ? '密码' : '新密码（留空表示不修改）'}
            {mode === 'create' && <span style={{ color: '#ff4d4f' }}> *</span>}
          </Typography.Text>
          <Input
            placeholder={mode === 'create' ? '请输入密码' : '留空表示不修改密码'}
            type={showPassword ? 'text' : 'password'}
            value={formData.users_pass}
            onChange={(e) => handleInputChange('users_pass', e.target.value)}
            status={errors.users_pass ? 'error' : undefined}
            suffix={
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }}
              >
                {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </span>
            }
          />
          {errors.users_pass && (
            <Typography.Text type="danger" style={{ fontSize: 12 }}>{errors.users_pass}</Typography.Text>
          )}
        </div>

        <div>
          <Typography.Text style={{ marginBottom: 4, display: 'block' }}>
            存储空间 <span style={{ color: '#ff4d4f' }}>*</span>
          </Typography.Text>
          <Input
            placeholder="支持格式：1GB, 1024MB, 等"
            value={formatStorageSize(formData.total_size || 0)}
            onChange={(e) => {
              const bytes = parseStorageInput(e.target.value);
              handleInputChange('total_size', bytes);
            }}
            status={errors.total_size ? 'error' : undefined}
          />
          {errors.total_size ? (
            <Typography.Text type="danger" style={{ fontSize: 12 }}>{errors.total_size}</Typography.Text>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>支持格式：1GB, 1024MB, 等</Typography.Text>
          )}
        </div>

        {mode === 'edit' && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            <Typography.Text type="secondary" strong>高级设置</Typography.Text>
            
            <div>
              <Typography.Text style={{ marginBottom: 4, display: 'block' }}>用户权限标识</Typography.Text>
              <Input
                placeholder="用于权限控制的标识符"
                value={(formData as UpdateUserRequest).users_mask || ''}
                onChange={(e) => handleInputChange('users_mask', e.target.value)}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>用于权限控制的标识符</Typography.Text>
            </div>

            <div>
              <Typography.Text style={{ marginBottom: 4, display: 'block' }}>已用空间</Typography.Text>
              <Input
                value={formatStorageSize((formData as UpdateUserRequest).total_used || 0)}
                disabled
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>只读字段，由系统自动计算</Typography.Text>
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Switch
            checked={formData.is_enabled}
            onChange={(checked) => handleInputChange('is_enabled', checked)}
          />
          <Typography.Text>启用用户</Typography.Text>
        </div>

        {Object.keys(errors).length > 0 && (
          <Alert
            type="error"
            message="请修正表单中的错误后重试"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};

export default UserDialog;