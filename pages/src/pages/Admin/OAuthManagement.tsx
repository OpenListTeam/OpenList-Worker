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
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { OAuth } from '../../types';
import { Chip } from '@mui/material';
import apiService from '../../posts/api';

const OAuthManagement: React.FC = () => {
  const [oauths, setOauths] = useState<OAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editDialog, setEditDialog] = useState({ open: false, oauth: null as OAuth | null });
  const [createDialog, setCreateDialog] = useState({ open: false });
  const [formData, setFormData] = useState<Partial<OAuth>>({
    oauth_name: '',
    oauth_type: '',
    oauth_data: '',
    is_enabled: 1
  });

  // 获取OAuth配置列表
  const fetchOauths = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/@oauth/select/none/', 'POST', {});
      
      if (result.flag) {
        setOauths(result.data || []);
        setError(null);
      } else {
        setError(`获取OAuth配置失败: ${result.text}`);
      }
    } catch (error) {
      console.error('获取OAuth配置错误:', error);
      setError('获取OAuth配置失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOauths();
  }, []);

  // 显示消息
  const showMessage = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'google': 'Google',
      'github': 'GitHub',
      'microsoft': 'Microsoft',
      'facebook': 'Facebook',
      'twitter': 'Twitter',
      'wechat': '微信',
      'qq': 'QQ',
      'weibo': '微博',
      'dingtalk': '钉钉',
      'feishu': '飞书'
    };
    return typeMap[type] || type;
  };

  const columns = [
    { id: 'oauth_name', label: '授权名称', minWidth: 150 },
    { 
      id: 'oauth_type', 
      label: '授权类型', 
      minWidth: 120,
      format: (value: string) => getTypeText(value)
    },
    { 
      id: 'oauth_data', 
      label: '授权数据', 
      minWidth: 200,
      format: (value: string) => {
        try {
          const data = JSON.parse(value);
          return `Client ID: ${data.client_id ? data.client_id.substring(0, 10) + '...' : '未配置'}`;
        } catch {
          return '配置格式错误';
        }
      }
    },
    { 
      id: 'is_enabled', 
      label: '状态', 
      minWidth: 80,
      format: (value: number, row: OAuth) => (
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

  // 切换OAuth状态
  const handleToggleStatus = async (oauth: OAuth) => {
    try {
      const newStatus = oauth.is_enabled === 1 ? 0 : 1;
      const result = await apiService.request('/@oauth/status/name/', 'POST', {
        oauth_name: oauth.oauth_name,
        is_enabled: newStatus
      });

      if (result.flag) {
        showMessage(`OAuth配置已${newStatus === 1 ? '启用' : '禁用'}`);
        await fetchOauths();
      } else {
        showMessage(`状态切换失败: ${result.text}`, 'error');
      }
    } catch (error) {
      console.error('切换状态错误:', error);
      showMessage('状态切换失败', 'error');
    }
  };

  // 添加OAuth配置
  const handleAddOAuth = () => {
    setFormData({
      oauth_name: '',
      oauth_type: '',
      oauth_data: '',
      is_enabled: 1
    });
    setCreateDialog({ open: true });
  };

  // 编辑OAuth配置
  const handleEdit = (oauth: OAuth) => {
    setFormData({
      oauth_name: oauth.oauth_name,
      oauth_type: oauth.oauth_type,
      oauth_data: oauth.oauth_data,
      is_enabled: oauth.is_enabled
    });
    setEditDialog({ open: true, oauth });
  };

  // 删除OAuth配置
  const handleDelete = async (oauth: OAuth) => {
    if (!window.confirm(`确定要删除OAuth配置 "${oauth.oauth_name}" 吗？`)) {
      return;
    }

    try {
      const result = await apiService.request('/@oauth/remove/name/', 'POST', {
        oauth_name: oauth.oauth_name
      });

      if (result.flag) {
        showMessage('OAuth配置删除成功');
        await fetchOauths();
      } else {
        showMessage(`删除失败: ${result.text}`, 'error');
      }
    } catch (error) {
      console.error('删除OAuth配置错误:', error);
      showMessage('删除失败', 'error');
    }
  };

  // 保存创建
  const handleSaveCreate = async () => {
    if (!formData.oauth_name || !formData.oauth_type || !formData.oauth_data) {
      showMessage('请填写所有必填字段', 'error');
      return;
    }

    try {
      // 验证oauth_data是否为有效JSON
      JSON.parse(formData.oauth_data!);
      
      const result = await apiService.request('/@oauth/create/none/', 'POST', formData);

      if (result.flag) {
        showMessage('OAuth配置创建成功');
        setCreateDialog({ open: false });
        await fetchOauths();
      } else {
        showMessage(`创建失败: ${result.text}`, 'error');
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        showMessage('OAuth数据格式错误，请输入有效的JSON', 'error');
      } else {
        console.error('创建OAuth配置错误:', error);
        showMessage('创建失败', 'error');
      }
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!formData.oauth_name || !formData.oauth_type || !formData.oauth_data) {
      showMessage('请填写所有必填字段', 'error');
      return;
    }

    try {
      // 验证oauth_data是否为有效JSON
      JSON.parse(formData.oauth_data!);
      
      const result = await apiService.request('/@oauth/config/name/', 'POST', formData);

      if (result.flag) {
        showMessage('OAuth配置更新成功');
        setEditDialog({ open: false, oauth: null });
        await fetchOauths();
      } else {
        showMessage(`更新失败: ${result.text}`, 'error');
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        showMessage('OAuth数据格式错误，请输入有效的JSON', 'error');
      } else {
        console.error('更新OAuth配置错误:', error);
        showMessage('更新失败', 'error');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
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
        <Typography variant="h4" component="h2">
          三方登录
        </Typography>
      </Box>
      <ResponsiveDataTable
        title="OAuth授权管理"
        columns={columns}
        data={oauths}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={handleAddOAuth}
        actions={['edit', 'delete', 'add']}
      />

      {/* 创建OAuth配置对话框 */}
      <Dialog open={createDialog.open} onClose={() => setCreateDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>创建OAuth配置</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="授权名称"
              value={formData.oauth_name || ''}
              onChange={(e) => setFormData({ ...formData, oauth_name: e.target.value })}
              fullWidth
              required
              helperText="唯一标识符，如：google_oauth"
            />
            
            <FormControl fullWidth required>
              <InputLabel>授权类型</InputLabel>
              <Select
                value={formData.oauth_type || ''}
                onChange={(e) => setFormData({ ...formData, oauth_type: e.target.value })}
                label="授权类型"
              >
                <MenuItem value="google">Google</MenuItem>
                <MenuItem value="github">GitHub</MenuItem>
                <MenuItem value="microsoft">Microsoft</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="twitter">Twitter</MenuItem>
                <MenuItem value="wechat">微信</MenuItem>
                <MenuItem value="qq">QQ</MenuItem>
                <MenuItem value="weibo">微博</MenuItem>
                <MenuItem value="dingtalk">钉钉</MenuItem>
                <MenuItem value="feishu">飞书</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="授权数据"
              value={formData.oauth_data || ''}
              onChange={(e) => setFormData({ ...formData, oauth_data: e.target.value })}
              fullWidth
              multiline
              rows={4}
              required
              helperText='JSON格式，如：{"client_id": "your_client_id", "client_secret": "your_client_secret"}'
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_enabled === 1}
                  onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked ? 1 : 0 })}
                />
              }
              label="启用配置"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog({ open: false })}>取消</Button>
          <Button onClick={handleSaveCreate} variant="contained">创建</Button>
        </DialogActions>
      </Dialog>

      {/* 编辑OAuth配置对话框 */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, oauth: null })} maxWidth="md" fullWidth>
        <DialogTitle>编辑OAuth配置</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="授权名称"
              value={formData.oauth_name || ''}
              onChange={(e) => setFormData({ ...formData, oauth_name: e.target.value })}
              fullWidth
              required
              disabled
              helperText="授权名称不可修改"
            />
            
            <FormControl fullWidth required>
              <InputLabel>授权类型</InputLabel>
              <Select
                value={formData.oauth_type || ''}
                onChange={(e) => setFormData({ ...formData, oauth_type: e.target.value })}
                label="授权类型"
              >
                <MenuItem value="google">Google</MenuItem>
                <MenuItem value="github">GitHub</MenuItem>
                <MenuItem value="microsoft">Microsoft</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="twitter">Twitter</MenuItem>
                <MenuItem value="wechat">微信</MenuItem>
                <MenuItem value="qq">QQ</MenuItem>
                <MenuItem value="weibo">微博</MenuItem>
                <MenuItem value="dingtalk">钉钉</MenuItem>
                <MenuItem value="feishu">飞书</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="授权数据"
              value={formData.oauth_data || ''}
              onChange={(e) => setFormData({ ...formData, oauth_data: e.target.value })}
              fullWidth
              multiline
              rows={4}
              required
              helperText='JSON格式，如：{"client_id": "your_client_id", "client_secret": "your_client_secret"}'
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_enabled === 1}
                  onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked ? 1 : 0 })}
                />
              }
              label="启用配置"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, oauth: null })}>取消</Button>
          <Button onClick={handleSaveEdit} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 消息提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OAuthManagement;