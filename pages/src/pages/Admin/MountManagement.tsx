import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  Alert,
  Chip,
  Grid,
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Replay } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { MountConfig } from '../../types';
import apiService from '../../posts/api';

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
      const result = await apiService.get('/@mount/select/none');
      if (result.flag) {
        setMounts(result.data || []);
      } else {
        setError(result.text || '加载挂载点失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 加载可用驱动列表
  const loadDrivers = async () => {
    try {
      console.log('正在请求驱动列表: /@mount/driver/none');
      const result = await apiService.get('/@mount/driver/none');
      console.log('驱动列表响应:', result);
      
      if (result.flag && result.data) {
        setDrivers(result.data);
        console.log('成功加载驱动列表:', result.data);
      } else {
        console.error('加载驱动列表失败:', result.text);
      }
    } catch (err) {
      console.error('加载驱动列表失败:', err);
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
      format: (value: number) => value !== undefined && value !== null ? value : 1
    },
    { id: 'mount_path', label: '挂载路径', minWidth: 150 },
    { id: 'mount_type', label: '驱动类型', minWidth: 120 },
    { 
      id: 'proxy_mode', 
      label: '代理模式', 
      minWidth: 80,
      format: (value: number) => value === 1 ? '代理' : '直连'
    },
    { 
      id: 'is_enabled', 
      label: '状态', 
      minWidth: 80,
      format: (value: number) => (
        <Chip
          label={value === 1 ? '启用' : '禁用'}
          size="small"
          color={value === 1 ? 'success' : 'default'}
        />
      )
    },
    { 
      id: 'cache_time', 
      label: '缓存时间(秒)', 
      minWidth: 100,
      format: (value: number) => value === 0 ? '无缓存' : `${value}秒`
    },
    { 
      id: 'proxy_data', 
      label: '代理地址', 
      minWidth: 150,
      format: (value: string) => value || '-'
    },
    { 
      id: 'drive_logs', 
      label: '日志', 
      minWidth: 150,
      format: (value: string) => value || '-'
    }
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
      const result = await apiService.post('/@mount/remove/none', {
        mount_path: mount.mount_path
      });
      
      if (result.flag) {
        await loadMounts();
      } else {
        setError(result.text || '删除失败');
      }
    } catch (err) {
      setError('网络错误，删除失败');
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
      const action = editingMount ? 'config' : 'create';
      const result = await apiService.post(`/@mount/${action}/none`, mountConfig);
      
      if (result.flag) {
        setDialogOpen(false);
        await loadMounts();
      } else {
        setError(result.text || '保存失败');
      }
    } catch (err) {
      setError('网络错误，保存失败');
    }
  };

  // 单个挂载点重新加载
  const handleReload = async (mount: MountConfig) => {
    try {
      setLoading(true);
      const result = await apiService.post(`/@mount/reload/path${mount.mount_path}`, {});
      
      if (result.flag) {
        setError('');
        // 重新加载挂载点列表以获取最新状态
        await loadMounts();
      } else {
        setError(result.text || `重新加载挂载点 "${mount.mount_path}" 失败`);
      }
    } catch (err) {
      setError(`重新加载挂载点 "${mount.mount_path}" 时发生网络错误`);
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
          const result = await apiService.post(`/@mount/reload/path${mount.mount_path}`, {});
          return { mount: mount.mount_path, success: result.flag, message: result.text };
        } catch (err) {
          return { mount: mount.mount_path, success: false, message: '网络错误' };
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
          <FormControlLabel
            key={field.key}
            control={
              <Switch
                checked={formData[field.key] || false}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.checked }))}
              />
            }
            label={field.label}
            sx={{ width: '100%', display: 'block' }}
          />
        );
      case 'select':
        return (
          <FormControl key={field.key} fullWidth required={field.required} sx={{ width: '100%' }}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={formData[field.key] || field.defaultValue || ''}
              label={field.label}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            >
              {field.options?.map((option: any) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'textarea':
        return (
          <TextField
            key={field.key}
            fullWidth
            multiline
            rows={3}
            label={field.label}
            value={formData[field.key] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
            sx={{ width: '100%' }}
          />
        );
      case 'password':
        return (
          <TextField
            key={field.key}
            fullWidth
            type="password"
            label={field.label}
            value={formData[field.key] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
            sx={{ width: '100%' }}
          />
        );
      default:
        return (
          <TextField
            key={field.key}
            fullWidth
            label={field.label}
            value={formData[field.key] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
            sx={{ width: '100%' }}
          />
        );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 3 
        }}
      >
        <Box>
          <Typography variant="h4" component="h2">
            挂载管理
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理和配置各种存储驱动的挂载点，支持多种云存储服务
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            disabled={loading}
          >
            新增挂载
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadMounts}
            disabled={loading}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<Replay />}
            onClick={handleReloadAll}
            disabled={loading || mounts.length === 0}
            sx={{ 
              backgroundColor: '#ffa726',
              '&:hover': {
                backgroundColor: '#ff9800'
              }
            }}
          >
            全部重新加载
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        title="挂载点列表"
        columns={columns}
        data={mounts}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReload={handleReload}
        actions={['edit', 'delete', 'reload']}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMount ? '编辑挂载点' : '新增挂载点'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {/* 第一行：驱动类型(60%) 和 挂载路径(40%) */}
            <Grid item xs={12}  sx={{ width: '60%' }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>驱动类型</InputLabel>
                <Select
                  value={selectedDriver}
                  label="驱动类型"
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  disabled={!!editingMount}
                >
                  {drivers.map((driver) => (
                    <MenuItem key={driver.key} value={driver.key}>
                      {driver.name} - {driver.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}  sx={{ width: '38%' }}>
              <TextField
                fullWidth
                label="挂载路径"
                value={formData.mount_path || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, mount_path: e.target.value }))}
                placeholder="/example"
                required
                margin="normal"
                disabled={!!editingMount}
              />
            </Grid>

{/* 第二行：缓存时间(20%) 序号(20%) 代理模式(30%) 启用(30%) */}
            <Grid item sx={{ width: '15%' }}>
              <TextField
                fullWidth
                type="number"
                label="缓存时间(秒)"
                value={formData.cache_time || 3600}
                onChange={(e) => setFormData(prev => ({ ...prev, cache_time: parseInt(e.target.value) || 3600 }))}
                margin="normal"
              />
            </Grid>

            <Grid item sx={{ width: '8%' }}>
              <TextField
                fullWidth
                type="number"
                label="序号"
                value={formData.index_list || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, index_list: parseInt(e.target.value) || 1 }))}
                margin="normal"
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item sx={{ width: '15%' }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>代理模式</InputLabel>
                <Select
                  value={formData.proxy_mode || 0}
                  label="代理模式"
                  onChange={(e) => setFormData(prev => ({ ...prev, proxy_mode: e.target.value }))}
                  disabled={drivers.find(d => d.key === selectedDriver)?.proxy_only}
                >
                  <MenuItem value={0}>直连</MenuItem>
                  <MenuItem value={1}>代理</MenuItem>
                </Select>
                {drivers.find(d => d.key === selectedDriver)?.proxy_only && (
                  <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                    该驱动仅支持代理模式
                  </Typography>
                )}
              </FormControl>
            </Grid>



            {/* 第三行：代理URL地址 */}
            <Grid item xs={12} sx={{ width: '44%' }}>
              <TextField
                fullWidth
                label="代理地址"
                value={formData.proxy_data || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, proxy_data: e.target.value }))}
                placeholder="http://proxy.example.com:8080"
                margin="normal"
                disabled={formData.proxy_mode !== 1}
                sx={{ width: '100%' }}
              />
            </Grid>
            
            <Grid item sx={{ width: '10%' }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>状态</InputLabel>
                <Select
                  value={formData.is_enabled ? 'enabled' : 'disabled'}
                  label="状态"
                  onChange={(e) => setFormData(prev => ({ ...prev, is_enabled: e.target.value === 'enabled' }))}
                >
                  <MenuItem value="enabled">启用</MenuItem>
                  <MenuItem value="disabled">停用</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 第四行：备注信息 */}
            <Grid item xs={12} sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="备注信息"
                value={formData.drive_tips || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, drive_tips: e.target.value }))}
                placeholder="请输入备注信息"
                margin="normal"
                multiline
                rows={2}
                sx={{ width: '100%' }}
              />
            </Grid>

            {driverFields.length > 0 && (
              <Grid item xs={12} sx={{ width: '100%' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  驱动配置
                </Typography>
                <Paper sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    {driverFields.map((field) => (
                      <Grid item xs={12} sx={{ width: '100%' }}>
                        {renderFormField(field)}
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MountManagement;