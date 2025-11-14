import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { Token } from '../../types';
import { 
  Chip, 
  CircularProgress, 
  Alert, 
  Box, 
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Snackbar,
  Grid
} from '@mui/material';
import { Add } from '@mui/icons-material';
import apiService from '../../posts/api';
import { useApp } from '../../components/AppContext';

const ConnectionConfig: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { state } = useApp();
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // 表单数据
  const [formData, setFormData] = useState({
    token_name: '',
    token_data: '',
    token_type: 'api',
    token_ends: '',
    is_enabled: 1
  });

  // 获取当前用户的连接配置
  const loadTokens = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!state.user?.username) {
        setError('用户未登录');
        return;
      }

      const result = await apiService.post('/@token/user/none', {
        token_user: state.user.username
      });
      
      if (result.flag) {
        // 转换后端数据格式到前端格式
        const convertedTokens = (result.data || []).map((token: any) => ({
          token_uuid: token.token_uuid,
          token_path: token.token_name || '', // 使用token_name作为路径显示
          token_user: token.token_user,
          token_type: token.token_type || 'api',
          token_info: token.token_data || '',
          is_enabled: token.is_enabled || 0,
        }));
        setTokens(convertedTokens);
      } else {
        setError(result.text || '获取连接配置失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取连接配置失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    loadTokens();
  }, [state.user]);

  const getTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'api': 'API接口',
      'webdav': 'WebDAV',
      'ftp': 'FTP',
      'sftp': 'SFTP',
    };
    return typeMap[type] || type;
  };

  const columns = [
    { id: 'token_uuid', label: '连接UUID', minWidth: 150 },
    { id: 'token_path', label: '连接路径', minWidth: 200 },
    { id: 'token_user', label: '所属用户', minWidth: 120 },
    { 
      id: 'token_type', 
      label: '连接类型', 
      minWidth: 120,
      format: (value: string) => getTypeText(value)
    },
    { 
      id: 'token_info', 
      label: '登录信息', 
      minWidth: 200,
      format: (value: string) => '已配置'
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

  // 添加连接配置
  const handleAdd = () => {
    setEditingToken(null);
    setFormData({
      token_name: '',
      token_data: '',
      token_type: 'api',
      token_ends: '',
      is_enabled: 1
    });
    setDialogOpen(true);
  };

  const handleEdit = (token: Token) => {
    setEditingToken(token);
    setFormData({
      token_name: token.token_path,
      token_data: token.token_info,
      token_type: token.token_type,
      token_ends: '',
      is_enabled: token.is_enabled
    });
    setDialogOpen(true);
  };

  const handleDelete = async (token: Token) => {
    if (!confirm(`确定要删除连接配置 "${token.token_path}" 吗？`)) {
      return;
    }

    try {
      const response = await apiService.post('/@token/remove/none', { 
        token_uuid: token.token_uuid 
      });
      if (response.flag) {
        showSnackbar('删除成功', 'success');
        loadTokens();
      } else {
        showSnackbar(response.text || '删除失败', 'error');
      }
    } catch (error) {
      showSnackbar('删除失败', 'error');
    }
  };

  // 保存连接配置
  const handleSave = async () => {
    if (!formData.token_name.trim()) {
      showSnackbar('连接名称不能为空', 'error');
      return;
    }

    if (!state.user?.username) {
      showSnackbar('用户未登录', 'error');
      return;
    }

    try {
      const tokenData = {
        token_uuid: editingToken?.token_uuid || '',
        token_name: formData.token_name,
        token_data: formData.token_data,
        token_user: state.user.users_name,
        token_ends: formData.token_ends,
        is_enabled: formData.is_enabled
      };

      const action = editingToken ? 'config' : 'create';
      const response = await apiService.post(`/@token/${action}/none`, tokenData);
      
      if (response.flag) {
        showSnackbar(editingToken ? '更新成功' : '创建成功', 'success');
        setDialogOpen(false);
        loadTokens();
      } else {
        showSnackbar(response.text || '操作失败', 'error');
      }
    } catch (error) {
      showSnackbar('操作失败', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h2" sx={{ mb: 3 }}>
          连接配置
        </Typography>
        <Alert severity="error" style={{ marginBottom: '16px' }}>
          {error}
        </Alert>
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
            连接配置
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            配置和管理外部存储连接，支持WebDAV、FTP等协议
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          添加连接
        </Button>
      </Box>
      <DataTable
        title="连接配置"
        columns={columns}
        data={tokens}
        onEdit={handleEdit}
        onDelete={handleDelete}
        actions={['edit', 'delete']}
      />

      {/* 添加/编辑对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingToken ? '编辑连接配置' : '添加连接配置'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="连接名称"
                value={formData.token_name}
                onChange={(e) => setFormData({ ...formData, token_name: e.target.value })}
                placeholder="例如: my-api-connection"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>连接类型</InputLabel>
                <Select
                  value={formData.token_type}
                  label="连接类型"
                  onChange={(e) => setFormData({ ...formData, token_type: e.target.value })}
                >
                  <MenuItem value="api">API接口</MenuItem>
                  <MenuItem value="webdav">WebDAV</MenuItem>
                  <MenuItem value="ftp">FTP</MenuItem>
                  <MenuItem value="sftp">SFTP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="连接数据"
                value={formData.token_data}
                onChange={(e) => setFormData({ ...formData, token_data: e.target.value })}
                placeholder='例如: {"host": "example.com", "port": 21, "username": "user", "password": "pass"}'
                multiline
                rows={4}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="过期时间"
                value={formData.token_ends}
                onChange={(e) => setFormData({ ...formData, token_ends: e.target.value })}
                placeholder="留空表示永不过期"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
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
                label="启用连接"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            {editingToken ? '更新' : '创建'}
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

export default ConnectionConfig;