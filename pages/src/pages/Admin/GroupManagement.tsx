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
  Checkbox,
  FormGroup,
  Divider
} from '@mui/material';
import { Add, Edit, Delete, Security } from '@mui/icons-material';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { Group } from '../../types';
import apiService from '../../posts/api';

// 权限定义
const PERMISSIONS = {
  'file_read': '文件读取',
  'file_write': '文件写入',
  'file_delete': '文件删除',
  'file_share': '文件分享',
  'file_upload': '文件上传',
  'file_download': '文件下载',
  'user_manage': '用户管理',
  'group_manage': '分组管理',
  'system_config': '系统配置',
  'mount_manage': '挂载管理',
  'task_manage': '任务管理',
  'offline_download': '离线下载'
};

const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // 表单状态
  const [formData, setFormData] = useState({
    group_name: '',
    group_mask: '',
    is_enabled: 1
  });

  // 权限状态
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);



  // 获取分组列表
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/@group/select/none');
      if (response.flag) {
        setGroups(response.data || []);
      } else {
        showSnackbar(response.text || '获取分组列表失败', 'error');
      }
    } catch (error) {
      showSnackbar('获取分组列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 打开添加对话框
  const handleAdd = () => {
    setEditingGroup(null);
    setFormData({ group_name: '', group_mask: '', is_enabled: 1 });
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      group_name: group.group_name,
      group_mask: group.group_mask,
      is_enabled: group.is_enabled
    });
    setDialogOpen(true);
  };

  // 打开权限管理对话框
  const handlePermissions = (group: Group) => {
    setEditingGroup(group);
    // 解析当前权限
    const permissions = group.group_mask.split(',').filter(p => p.trim());
    setSelectedPermissions(permissions);
    setPermissionDialogOpen(true);
  };

  // 删除分组
  const handleDelete = async (group: Group) => {
    if (!confirm(`确定要删除分组 "${group.group_name}" 吗？`)) {
      return;
    }

    try {
      const response = await apiService.post('/@group/remove/none', { group_name: group.group_name });
      if (response.flag) {
        showSnackbar('删除成功', 'success');
        fetchGroups();
      } else {
        showSnackbar(response.text || '删除失败', 'error');
      }
    } catch (error) {
      showSnackbar('删除失败', 'error');
    }
  };

  // 切换分组状态
  const handleToggleStatus = async (group: Group) => {
    try {
      const response = await apiService.post('/@group/toggle/none', { 
        group_name: group.group_name,
        is_enabled: group.is_enabled === 1 ? 0 : 1
      });
      if (response.flag) {
        showSnackbar('状态更新成功', 'success');
        fetchGroups();
      } else {
        showSnackbar(response.text || '状态更新失败', 'error');
      }
    } catch (error) {
      showSnackbar('状态更新失败', 'error');
    }
  };

  // 保存分组
  const handleSave = async () => {
    if (!formData.group_name.trim()) {
      showSnackbar('分组名称不能为空', 'error');
      return;
    }

    try {
      const action = editingGroup ? 'config' : 'create';
      const response = await apiService.post(`/@group/${action}/none`, formData);
      
      if (response.flag) {
        showSnackbar(editingGroup ? '更新成功' : '创建成功', 'success');
        setDialogOpen(false);
        fetchGroups();
      } else {
        showSnackbar(response.text || '操作失败', 'error');
      }
    } catch (error) {
      showSnackbar('操作失败', 'error');
    }
  };

  // 保存权限
  const handleSavePermissions = async () => {
    if (!editingGroup) return;

    try {
      const group_mask = selectedPermissions.join(',');
      const response = await apiService.post('/@group/mask/none', {
        group_name: editingGroup.group_name,
        group_mask
      });

      if (response.flag) {
        showSnackbar('权限更新成功', 'success');
        setPermissionDialogOpen(false);
        fetchGroups();
      } else {
        showSnackbar(response.text || '权限更新失败', 'error');
      }
    } catch (error) {
      showSnackbar('权限更新失败', 'error');
    }
  };

  // 权限选择处理
  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions([...selectedPermissions, permission]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    }
  };

  const columns = [
    { id: 'group_name', label: '分组名称', minWidth: 150 },
    { 
      id: 'group_mask', 
      label: '权限掩码', 
      minWidth: 200,
      format: (value: string) => {
        const permissions = value.split(',').filter(p => p.trim());
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {permissions.slice(0, 3).map((perm, index) => (
              <Chip
                key={index}
                label={PERMISSIONS[perm as keyof typeof PERMISSIONS] || perm}
                size="small"
                variant="outlined"
              />
            ))}
            {permissions.length > 3 && (
              <Chip
                label={`+${permissions.length - 3}`}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Box>
        );
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
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          分组管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
          sx={{ borderRadius: '15px' }}
        >
          添加分组
        </Button>
      </Box>

      <ResponsiveDataTable
        title=""
        columns={columns}
        data={groups}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSettings={handlePermissions}
        actions={['edit', 'settings', 'delete']}
        loading={loading}
      />

      {/* 添加/编辑分组对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingGroup ? '编辑分组' : '添加分组'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="分组名称"
              value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
              margin="normal"
              disabled={!!editingGroup}
            />
            <TextField
              fullWidth
              label="权限掩码"
              value={formData.group_mask}
              onChange={(e) => setFormData({ ...formData, group_mask: e.target.value })}
              margin="normal"
              helperText="多个权限用逗号分隔，如：file_read,file_write"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_enabled === 1}
                  onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked ? 1 : 0 })}
                />
              }
              label="启用分组"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            {editingGroup ? '更新' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 权限管理对话框 */}
      <Dialog open={permissionDialogOpen} onClose={() => setPermissionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security />
            权限管理 - {editingGroup?.group_name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              选择权限
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              {Object.entries(PERMISSIONS).map(([key, label]) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedPermissions.includes(key)}
                            onChange={(e) => handlePermissionChange(key, e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {key}
                            </Typography>
                          </Box>
                        }
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                已选择权限: {selectedPermissions.length} 个
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {selectedPermissions.map((perm) => (
                  <Chip
                    key={perm}
                    label={PERMISSIONS[perm as keyof typeof PERMISSIONS] || perm}
                    size="small"
                    onDelete={() => handlePermissionChange(perm, false)}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialogOpen(false)}>取消</Button>
          <Button onClick={handleSavePermissions} variant="contained">
            保存权限
          </Button>
        </DialogActions>
      </Dialog>

      {/* 消息提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GroupManagement;