import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Typography,
  Divider
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
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
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        {mode === 'create' ? '创建用户' : '编辑用户'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="用户名"
            value={formData.users_name}
            onChange={(e) => handleInputChange('users_name', e.target.value)}
            error={!!errors.users_name}
            helperText={errors.users_name}
            disabled={mode === 'edit'} // 编辑时用户名不可修改
            required
            fullWidth
          />

          <TextField
            label="邮箱"
            type="email"
            value={formData.users_mail}
            onChange={(e) => handleInputChange('users_mail', e.target.value)}
            error={!!errors.users_mail}
            helperText={errors.users_mail}
            fullWidth
          />

          <TextField
            label={mode === 'create' ? '密码' : '新密码（留空表示不修改）'}
            type={showPassword ? 'text' : 'password'}
            value={formData.users_pass}
            onChange={(e) => handleInputChange('users_pass', e.target.value)}
            error={!!errors.users_pass}
            helperText={errors.users_pass}
            required={mode === 'create'}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <TextField
            label="存储空间"
            value={formatStorageSize(formData.total_size || 0)}
            onChange={(e) => {
              const bytes = parseStorageInput(e.target.value);
              handleInputChange('total_size', bytes);
            }}
            error={!!errors.total_size}
            helperText={errors.total_size || '支持格式：1GB, 1024MB, 等'}
            required
            fullWidth
          />

          {mode === 'edit' && (
            <>
              <Divider />
              <Typography variant="subtitle2" color="text.secondary">
                高级设置
              </Typography>
              
              <TextField
                label="用户权限标识"
                value={(formData as UpdateUserRequest).users_mask || ''}
                onChange={(e) => handleInputChange('users_mask', e.target.value)}
                helperText="用于权限控制的标识符"
                fullWidth
              />

              <TextField
                label="已用空间"
                value={formatStorageSize((formData as UpdateUserRequest).total_used || 0)}
                disabled
                fullWidth
                helperText="只读字段，由系统自动计算"
              />
            </>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={formData.is_enabled}
                onChange={(e) => handleInputChange('is_enabled', e.target.checked)}
              />
            }
            label="启用用户"
          />

          {Object.keys(errors).length > 0 && (
            <Alert severity="error">
              请修正表单中的错误后重试
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? '处理中...' : (mode === 'create' ? '创建' : '保存')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDialog;