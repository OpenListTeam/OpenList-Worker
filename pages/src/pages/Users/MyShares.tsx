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
import { Share } from '../../types';
import { Chip } from '@mui/material';
import axios from 'axios';

const MyShares: React.FC = () => {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editDialog, setEditDialog] = useState({ open: false, share: null as Share | null });

  // 获取分享列表
  const fetchShares = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/@shares/list`);
      
      if (response.data.flag) {
        const data = response.data.data;
        // 确保数据是数组类型
        if (Array.isArray(data)) {
          setShares(data);
        } else {
          setShares([]);
          console.warn('API返回的数据不是数组类型:', data);
        }
      } else {
        setError(response.data.text || '获取分享列表失败');
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
  };

  const columns = [
    { id: 'share_uuid', label: '分享ID', minWidth: 120 },
    { id: 'share_path', label: '分享路径', minWidth: 200 },
    { id: 'share_pass', label: '分享密码', minWidth: 100 },
    { id: 'share_user', label: '分享用户', minWidth: 100 },
    { 
      id: 'share_date', 
      label: '分享日期', 
      minWidth: 200,
      format: (value: number) => formatDate(value)
    },
    { 
      id: 'share_ends', 
      label: '有效期限', 
      minWidth: 200,
      format: (value: number) => formatDate(value)
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

  // 显示消息
  const showMessage = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 处理编辑分享
  const handleEdit = (share: Share) => {
    setEditDialog({ open: true, share });
  };

  // 处理删除分享
  const handleDelete = async (share: Share) => {
    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/@shares/delete/${share.share_uuid}`);
      
      if (response.data.flag) {
        showMessage('分享删除成功');
        fetchShares(); // 刷新列表
      } else {
        showMessage(`删除分享失败: ${response.data.text}`, 'error');
      }
    } catch (error) {
      console.error('删除分享错误:', error);
      showMessage('删除分享失败，请检查网络连接', 'error');
    }
  };

  // 处理复制分享链接
  const handleCopyLink = async (share: Share) => {
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
  const handleToggleStatus = async (share: Share) => {
    try {
      const newStatus = share.is_enabled === 1 ? 0 : 1;
      const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/@shares/update/${share.share_uuid}`, {
        ...share,
        is_enabled: newStatus
      });
      
      if (response.data.flag) {
        showMessage(`分享已${newStatus === 1 ? '启用' : '禁用'}`);
        fetchShares(); // 刷新列表
      } else {
        showMessage(`更新分享状态失败: ${response.data.text}`, 'error');
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
      const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/@shares/update/${editDialog.share.share_uuid}`, editDialog.share);
      
      if (response.data.flag) {
        showMessage('分享更新成功');
        setEditDialog({ open: false, share: null });
        fetchShares(); // 刷新列表
      } else {
        showMessage(`更新分享失败: ${response.data.text}`, 'error');
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
    <Box>
      <ResponsiveDataTable
        title="我的分享"
        columns={columns}
        data={shares}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onLink={handleCopyLink}
        onShare={handleToggleStatus}
        actions={['link', 'share', 'edit', 'delete']}
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
            value={editDialog.share ? new Date(editDialog.share.share_ends * 1000).toISOString().slice(0, 16) : ''}
            onChange={(e) => setEditDialog(prev => ({
              ...prev,
              share: prev.share ? { ...prev.share, share_ends: Math.floor(new Date(e.target.value).getTime() / 1000) } : null
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