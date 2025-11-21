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
  Snackbar,
  Alert,
  Chip,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Add, Edit, Delete, Folder, Security } from '@mui/icons-material';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { Mates } from '../../types';
import apiService from '../../posts/api';

const MatesConfig: React.FC = () => {
  const [mates, setMates] = useState<Mates[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMate, setEditingMate] = useState<Mates | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // 表单状态
  const [formData, setFormData] = useState({
    mates_name: '',
    mates_mask: 755,
    mates_user: 0,
    is_enabled: 1,
    dir_hidden: 0,
    dir_shared: 0,
    set_zipped: '',
    set_parted: '',
    crypt_name: '',
    cache_time: 0
  });



  // 获取路径配置列表
  const fetchMates = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/@mates/select/none');
      if (response.flag) {
        setMates(response.data || []);
      } else {
        showSnackbar(response.text || '获取路径配置列表失败', 'error');
      }
    } catch (error) {
      showSnackbar('获取路径配置列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMates();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 打开添加对话框
  const handleAdd = () => {
    setEditingMate(null);
    setFormData({
      mates_name: '',
      mates_mask: 755,
      mates_user: 0,
      is_enabled: 1,
      dir_hidden: 0,
      dir_shared: 0,
      set_zipped: '',
      set_parted: '',
      crypt_name: '',
      cache_time: 0
    });
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (mate: Mates) => {
    setEditingMate(mate);
    setFormData({
      mates_name: mate.mates_name,
      mates_mask: mate.mates_mask,
      mates_user: mate.mates_user,
      is_enabled: mate.is_enabled,
      dir_hidden: mate.dir_hidden || 0,
      dir_shared: mate.dir_shared || 0,
      set_zipped: mate.set_zipped || '',
      set_parted: mate.set_parted || '',
      crypt_name: mate.crypt_name || '',
      cache_time: mate.cache_time || 0
    });
    setDialogOpen(true);
  };

  // 删除路径配置
  const handleDelete = async (mate: Mates) => {
    if (!confirm(`确定要删除路径配置 "${mate.mates_name}" 吗？`)) {
      return;
    }

    try {
      const response = await apiService.post('/@mates/remove/none', { mates_name: mate.mates_name });
      if (response.flag) {
        showSnackbar('删除成功', 'success');
        fetchMates();
      } else {
        showSnackbar(response.text || '删除失败', 'error');
      }
    } catch (error) {
      showSnackbar('删除失败', 'error');
    }
  };

  // 切换启用状态
  const handleToggleStatus = async (mate: Mates) => {
    try {
      const response = await apiService.post('/@mates/status/none', { 
        mates_name: mate.mates_name,
        is_enabled: mate.is_enabled === 1 ? 0 : 1
      });
      if (response.flag) {
        showSnackbar('状态更新成功', 'success');
        fetchMates();
      } else {
        showSnackbar(response.text || '状态更新失败', 'error');
      }
    } catch (error) {
      showSnackbar('状态更新失败', 'error');
    }
  };

  // 保存路径配置
  const handleSave = async () => {
    if (!formData.mates_name.trim()) {
      showSnackbar('路径名称不能为空', 'error');
      return;
    }

    try {
      const action = editingMate ? 'config' : 'create';
      const response = await apiService.post(`/@mates/${action}/none`, formData);
      
      if (response.flag) {
        showSnackbar(editingMate ? '更新成功' : '创建成功', 'success');
        setDialogOpen(false);
        fetchMates();
      } else {
        showSnackbar(response.text || '操作失败', 'error');
      }
    } catch (error) {
      showSnackbar('操作失败', 'error');
    }
  };

  const columns = [
    { 
      id: 'mates_name', 
      label: '路径名称', 
      minWidth: 150,
      format: (value: string) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Folder fontSize="small" />
          {value}
        </Box>
      )
    },
    { 
      id: 'mates_mask', 
      label: '权限掩码', 
      minWidth: 100,
      format: (value: number) => (
        <Chip
          label={value.toString(8)}
          size="small"
          variant="outlined"
          icon={<Security />}
        />
      )
    },
    { id: 'mates_user', label: '用户ID', minWidth: 80 },
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
      id: 'dir_hidden', 
      label: '隐藏', 
      minWidth: 80,
      format: (value: number) => (
        <Chip
          label={value === 1 ? '是' : '否'}
          size="small"
          color={value === 1 ? 'warning' : 'default'}
        />
      )
    },
    { 
      id: 'dir_shared', 
      label: '共享', 
      minWidth: 80,
      format: (value: number) => (
        <Chip
          label={value === 1 ? '是' : '否'}
          size="small"
          color={value === 1 ? 'primary' : 'default'}
        />
      )
    },
    { id: 'crypt_name', label: '加密配置', minWidth: 120 },
    { 
      id: 'cache_time', 
      label: '缓存时间', 
      minWidth: 100,
      format: (value: number) => value === 0 ? '无缓存' : `${value}秒`
    },
  ];

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
            目录配置
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            配置目录权限、加密和缓存策略，优化文件访问体验
          </Typography>
        </Box>
      </Box>
      <ResponsiveDataTable
        title="路径配置管理"
        columns={columns}
        data={mates}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        actions={['add', 'edit', 'delete', 'toggle']}
        addButtonText="添加路径配置"
      />

      {/* 添加/编辑对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMate ? '编辑路径配置' : '添加路径配置'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="路径名称"
                value={formData.mates_name}
                onChange={(e) => setFormData({ ...formData, mates_name: e.target.value })}
                placeholder="例如: /documents"
                disabled={!!editingMate}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="权限掩码"
                type="number"
                value={formData.mates_mask}
                onChange={(e) => setFormData({ ...formData, mates_mask: parseInt(e.target.value) || 0 })}
                placeholder="例如: 755"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="用户ID"
                type="number"
                value={formData.mates_user}
                onChange={(e) => setFormData({ ...formData, mates_user: parseInt(e.target.value) || 0 })}
                placeholder="0表示所有用户"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="缓存时间(秒)"
                type="number"
                value={formData.cache_time}
                onChange={(e) => setFormData({ ...formData, cache_time: parseInt(e.target.value) || 0 })}
                placeholder="0表示无缓存"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="加密配置名称"
                value={formData.crypt_name}
                onChange={(e) => setFormData({ ...formData, crypt_name: e.target.value })}
                placeholder="留空表示不加密"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_enabled === 1}
                    onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked ? 1 : 0 })}
                  />
                }
                label="启用配置"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.dir_hidden === 1}
                    onChange={(e) => setFormData({ ...formData, dir_hidden: e.target.checked ? 1 : 0 })}
                  />
                }
                label="隐藏目录"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.dir_shared === 1}
                    onChange={(e) => setFormData({ ...formData, dir_shared: e.target.checked ? 1 : 0 })}
                  />
                }
                label="共享目录"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>高级配置</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="压缩配置"
                value={formData.set_zipped}
                onChange={(e) => setFormData({ ...formData, set_zipped: e.target.value })}
                placeholder='例如: {"enabled": true, "level": 6}'
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="分片配置"
                value={formData.set_parted}
                onChange={(e) => setFormData({ ...formData, set_parted: e.target.value })}
                placeholder='例如: {"enabled": true, "size": "100MB"}'
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            {editingMate ? '更新' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 消息提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MatesConfig;