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
import { Mount } from '../../types';

interface Driver {
  key: string;
  name: string;
  description: string;
}

interface DriverField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'boolean';
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
}

const MountManagement: React.FC = () => {
  const [mounts, setMounts] = useState<Mount[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMount, setEditingMount] = useState<Mount | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [driverFields, setDriverFields] = useState<DriverField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string>('');

  // 加载挂载点列表
  const loadMounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/@mount/select/none');
      const result = await response.json();
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
      const response = await fetch('/@mount/driver/none');
      console.log('响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('HTTP错误:', response.status, response.statusText);
        return;
      }
      
      const result = await response.json();
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
    }
  }, [selectedDriver, drivers, editingMount]);

  const columns = [
    { 
      id: 'order_number', 
      label: '序号', 
      minWidth: 80,
      format: (value: number) => value || 1
    },
    { id: 'mount_path', label: '挂载路径', minWidth: 150 },
    { id: 'mount_type', label: '驱动类型', minWidth: 120 },
    { 
      id: 'proxy_mode', 
      label: '代理模式', 
      minWidth: 100,
      format: (value: string) => {
        const modeMap = {
          'direct': '直链下载',
          'clouds': '云端代理',
          'proxys': '代理地址'
        };
        return modeMap[value as keyof typeof modeMap] || '直链下载';
      }
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
      minWidth: 120,
      format: (value: number) => value === 0 ? '无缓存' : `${value}秒`
    },
    { 
      id: 'remarks', 
      label: '备注', 
      minWidth: 150,
      format: (value: string) => value || '-'
    },
    { 
      id: 'drive_conf', 
      label: '配置状态', 
      minWidth: 120,
      format: (value: string) => value ? '已配置' : '未配置'
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
      order_number: 1,
      proxy_mode: 'direct',
      proxy_url: '',
      remarks: ''
    });
    setError('');
    setDialogOpen(true);
  };

  const handleEdit = async (mount: Mount) => {
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
      order_number: mount.order_number || 1,
      proxy_mode: mount.proxy_mode || 'direct',
      proxy_url: mount.proxy_url || '',
      remarks: mount.remarks || '',
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

  const handleDelete = async (mount: Mount) => {
    if (!confirm(`确定要删除挂载点 "${mount.mount_path}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch('/@mount/remove/none', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mount_path: mount.mount_path
        })
      });
      const result = await response.json();
      
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

    // 验证代理URL
    if (formData.proxy_mode === 'proxys' && !formData.proxy_url) {
      setError('代理模式选择代理地址时，必须填写代理URL地址');
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
      order_number: formData.order_number || 1,
      proxy_mode: formData.proxy_mode || 'direct',
      proxy_url: formData.proxy_url || '',
      remarks: formData.remarks || '',
      drive_conf: JSON.stringify(driveConf)
    };

    try {
      const action = editingMount ? 'config' : 'create';
      const response = await fetch(`/@mount/${action}/none`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mountConfig)
      });
      const result = await response.json();
      
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

  const handleReload = async (mount: Mount) => {
    try {
      const response = await fetch('/@mount/reload/none', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mount_path: mount.mount_path
        })
      });
      const result = await response.json();
      
      if (result.flag) {
        await loadMounts();
      } else {
        setError(result.text || '重载失败');
      }
    } catch (err) {
      setError('网络错误，重载失败');
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          挂载管理
        </Typography>
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
        actions={['edit', 'delete']}
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
                value={formData.order_number || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, order_number: parseInt(e.target.value) || 1 }))}
                margin="normal"
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item sx={{ width: '15%' }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>代理模式</InputLabel>
                <Select
                  value={formData.proxy_mode || 'direct'}
                  label="代理模式"
                  onChange={(e) => setFormData(prev => ({ ...prev, proxy_mode: e.target.value }))}
                >
                  <MenuItem value="direct">直链下载</MenuItem>
                  <MenuItem value="clouds">云端代理</MenuItem>
                  <MenuItem value="proxys">代理地址</MenuItem>
                </Select>
              </FormControl>
            </Grid>



            {/* 第三行：代理URL地址 */}
            <Grid item xs={12} sx={{ width: '44%' }}>
              <TextField
                fullWidth
                label="代理URL地址"
                value={formData.proxy_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, proxy_url: e.target.value }))}
                placeholder="http://proxy.example.com:8080"
                margin="normal"
                disabled={formData.proxy_mode !== 'proxys'}
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

            {/* 第四行：备注 */}
            <Grid item xs={12} sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="备注"
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
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