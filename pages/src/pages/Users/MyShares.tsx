import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch
} from '@mui/material';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { ShareConfig } from '../../types';
import { Chip } from '@mui/material';
import apiService from '../../posts/api';

const MyShares: React.FC = () => {
  const [shares, setShares] = useState<ShareConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editDialog, setEditDialog] = useState({ open: false, share: null as ShareConfig | null });
  const [createDialog, setCreateDialog] = useState({ open: false });
  const [formData, setFormData] = useState<Partial<ShareConfig>>({
    share_path: '',
    share_pass: '',
    share_user: '',
    share_ends: '',
    is_enabled: 1
  });

  // 获取分享列表
  const fetchShares = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/@share/select/none/', 'POST', {});
      
      if (result.flag) {
        const data = result.data;
        // 确保数据是数组类型
        if (Array.isArray(data)) {
          setShares(data);
        } else {
          setShares([]);
          console.warn('API返回的数据不是数组类型:', data);
        }
      } else {
        setError(result.text || '获取分享列表失败');
      }
    } catch (error) {
      console.error('获取分享列表错误:', error);
      setError('获取分享列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const formatDate = (dateValue: string | number) => {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : new Date(dateValue * 1000);
    return date.toLocaleDateString('zh-CN');
  };

  const columns = [
    { id: 'share_uuid', label: '分享ID', minWidth: 120 },
    { id: 'share_path', label: '分享路径', minWidth: 200 },
    { id: 'share_pass', label: '分享密码', minWidth: 100, format: (value: string) => value || '无密码' },
    { id: 'share_user', label: '分享用户', minWidth: 100 },
    { 
      id: 'share_date', 
      label: '分享日期', 
      minWidth: 200,
      format: (value: string | number) => formatDate(value)
    },
    { 
      id: 'share_ends', 
      label: '有效期限', 
      minWidth: 200,
      format: (value: string | number) => formatDate(value)
    },
    { 
      id: 'is_enabled', 
      label: '状态', 
      minWidth: 80,
      format: (value: number, row: ShareConfig) => (
        <Chip
          label={value === 1 ? '启用' : '禁用'}
          size="small"
          color={value === 1 ? 'success' : 'default'}
          onClick={() => handleToggleStatus(row)}
          style={{ cursor: 'pointer' }}
        />
      )
    },
  ];

  // 显示消息
  const showMessage = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 处理添加分享
  const handleAddShare = () => {
    setFormData({
      share_path: '',
      share_pass: '',
      share_user: '',
      share_ends: '',
      is_enabled: 1
    });
    setCreateDialog({ open: true });
  };

  // 处理保存新分享
  const handleSaveCreate = async () => {
    if (!formData.share_path || !formData.share_user) {
      showMessage('请填写分享路径和用户', 'error');
      return;
    }

    try {
      const shareData: ShareConfig = {
        share_uuid: '',
        share_path: formData.share_path,
        share_pass: formData.share_pass || '',
        share_user: formData.share_user,
        share_date: new Date().toISOString(),
        share_ends: formData.share_ends || '',
        is_enabled: formData.is_enabled || 1
      };

      const result = await apiService.request('/@share/create/none/', 'POST', shareData);
      
      if (result.flag) {
        showMessage('分享创建成功');
        setCreateDialog({ open: false });
        fetchShares(); // 刷新列表
      } else {
        showMessage(`创建分享失败: ${result.text}`, 'error');
      }
    } catch (error) {
      console.error('创建分享错误:', error);
      showMessage('创建分享失败，请检查网络连接', 'error');
    }
  };

  // 处理编辑分享
  const handleEdit = (share: ShareConfig) => {
    setEditDialog({ open: true, share });
  };

  // 处理删除分享
  const handleDelete = async (share: ShareConfig) => {
    if (!confirm('确定要删除这个分享吗？')) return;
    
    try {
      const result = await apiService.request('/@share/remove/none/', 'POST', {
        share_uuid: share.share_uuid
      });
      
      if (result.flag) {
        showMessage('分享删除成功');
        fetchShares(); // 刷新列表
      } else {
        showMessage(`删除分享失败: ${result.text}`, 'error');
      }
    } catch (error) {
      console.error('删除分享错误:', error);
      showMessage('删除分享失败，请检查网络连接', 'error');
    }
  };

  // 处理复制分享链接
  const handleCopyLink = async (share: ShareConfig) => {
    try {
      const shareUrl = `${window.location.origin}/share/${share.share_uuid}`;
      await navigator.clipboard.writeText(shareUrl);
      showMessage(`分享链接已复制到剪贴板: ${shareUrl}`);
    } catch (error) {
      console.error('复制链接错误:', error);
      showMessage('复制链接失败', 'error');
    }
  };

  // 处理分享状态切换
  const handleToggleStatus = async (share: ShareConfig) => {
    try {
      const newStatus = share.is_enabled === 1 ? 0 : 1;
      const result = await apiService.request('/@share/status/none/', 'POST', {
        share_uuid: share.share_uuid,
        is_enabled: newStatus
      });
      
      if (result.flag) {
        showMessage(`分享已${newStatus === 1 ? '启用' : '禁用'}`);
        fetchShares(); // 刷新列表
      } else {
        showMessage(`更新分享状态失败: ${result.text}`, 'error');
      }
    } catch (error) {
      console.error('更新分享状态错误:', error);
      showMessage('更新分享状态失败，请检查网络连接', 'error');
    }
  };

  // 保存编辑的分享
  const handleSaveEdit = async () => {
    if (!editDialog.share) return;

    try {
      const result = await apiService.request('/@share/config/none/', 'POST', editDialog.share);
      
      if (result.flag) {
        showMessage('分享更新成功');
        setEditDialog({ open: false, share: null });
        fetchShares(); // 刷新列表
      } else {
        showMessage(`更新分享失败: ${result.text}`, 'error');
      }
    } catch (error) {
      console.error('更新分享错误:', error);
      showMessage('更新分享失败，请检查网络连接', 'error');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

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
            我的分享
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理和分享您的文件，设置分享权限和有效期
          </Typography>
        </Box>
      </Box>
      <ResponsiveDataTable
        title="我的分享"
        columns={columns}
        data={shares}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onLink={handleCopyLink}
        onShare={handleToggleStatus}
        onAdd={handleAddShare}
        actions={['add', 'link', 'share', 'edit', 'delete']}
      />

      {/* 编辑分享对话框 */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, share: null })} maxWidth="sm" fullWidth>
        <DialogTitle>编辑分享</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="分享密码"
            value={editDialog.share?.share_pass || ''}
            onChange={(e) => setEditDialog(prev => ({
              ...prev,
              share: prev.share ? { ...prev.share, share_pass: e.target.value } : null
            }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="有效期限"
            type="datetime-local"
            value={editDialog.share && editDialog.share.share_ends ? 
              (typeof editDialog.share.share_ends === 'string' ? 
                new Date(editDialog.share.share_ends).toISOString().slice(0, 16) : 
                new Date(editDialog.share.share_ends * 1000).toISOString().slice(0, 16)
              ) : ''
            }
            onChange={(e) => setEditDialog(prev => ({
              ...prev,
              share: prev.share ? { ...prev.share, share_ends: e.target.value ? new Date(e.target.value).toISOString() : "" } : null
            }))}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editDialog.share?.is_enabled === 1}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  share: prev.share ? { ...prev.share, is_enabled: e.target.checked ? 1 : 0 } : null
                }))}
              />
            }
            label="启用分享"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, share: null })}>取消</Button>
          <Button onClick={handleSaveEdit} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 创建分享对话框 */}
      <Dialog open={createDialog.open} onClose={() => setCreateDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>创建分享</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="分享路径"
            value={formData.share_path || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, share_path: e.target.value }))}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="分享用户"
            value={formData.share_user || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, share_user: e.target.value }))}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="分享密码（可选）"
            value={formData.share_pass || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, share_pass: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="有效期限（可选）"
            type="datetime-local"
            value={formData.share_ends ? new Date(formData.share_ends).toISOString().slice(0, 16) : ''}
            onChange={(e) => setFormData(prev => ({ ...prev, share_ends: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_enabled === 1}
                onChange={(e) => setFormData(prev => ({ ...prev, is_enabled: e.target.checked ? 1 : 0 }))}
              />
            }
            label="启用分享"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog({ open: false })}>取消</Button>
          <Button onClick={handleSaveCreate} variant="contained">创建</Button>
        </DialogActions>
      </Dialog>

      {/* 消息提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MyShares;