import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  Typography,
  Alert
} from '@mui/material';
import { Add } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { PathSelectDialog } from '../../components/FileOperationDialogs';
import { Chip } from '@mui/material';
import { useApp } from '../../components/AppContext';
import apiService from '../../posts/api';
import type { Fetch } from '../../types';

const OfflineDownload: React.FC = () => {
  const { state: appState } = useApp();
  const [data, setData] = useState<Fetch[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pathSelectOpen, setPathSelectOpen] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [selectedPath, setSelectedPath] = useState('/');
  const [error, setError] = useState('');

  // 获取离线下载任务列表
  const fetchDownloadTasks = async () => {
    setLoading(true);
    try {
      const response = await apiService.post('/@fetch/select/none', {});
      if (response.flag) {
        setData(response.data || []);
      }
    } catch (error) {
      console.error('获取离线下载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloadTasks();
  }, []);

  const getStatusText = (flag: number) => {
    const statusMap: { [key: number]: { text: string; color: any } } = {
      0: { text: '等待中', color: 'default' },
      1: { text: '下载中', color: 'primary' },
      2: { text: '已完成', color: 'success' },
      3: { text: '失败', color: 'error' },
      4: { text: '暂停', color: 'warning' },
    };
    return statusMap[flag] || { text: '未知', color: 'default' };
  };

  const columns = [
    { id: 'fetch_uuid', label: '任务UUID', minWidth: 150 },
    { 
      id: 'fetch_from', 
      label: '下载地址', 
      minWidth: 300,
      format: (value: string) => (
        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </div>
      )
    },
    { id: 'fetch_dest', label: '目标路径', minWidth: 150 },
    { id: 'fetch_user', label: '所属用户', minWidth: 120 },
    { 
      id: 'fetch_flag', 
      label: '任务状态', 
      minWidth: 100,
      format: (value: number) => {
        const status = getStatusText(value);
        return (
          <Chip
            label={status.text}
            size="small"
            color={status.color}
          />
        );
      }
    },
  ];

  const handleEdit = (item: Fetch) => {
    console.log('编辑离线下载任务:', item);
  };

  const handleDelete = async (item: Fetch) => {
    try {
      const response = await apiService.post('/@fetch/remove/none', {
        fetch_uuid: item.fetch_uuid
      });
      if (response.flag) {
        await fetchDownloadTasks(); // 刷新列表
      }
    } catch (error) {
      console.error('删除离线下载任务失败:', error);
    }
  };

  const handleAddDownload = () => {
    setDownloadUrl('');
    setSelectedPath('/');
    setError('');
    setAddDialogOpen(true);
  };

  const handleConfirmAdd = async () => {
    if (!downloadUrl.trim()) {
      setError('请输入下载链接');
      return;
    }

    try {
      const response = await apiService.post('/@fetch/create/none', {
        fetch_from: downloadUrl.trim(),
        fetch_dest: selectedPath,
        fetch_user: appState.user?.username || ''
      });

      if (response.flag) {
        setAddDialogOpen(false);
        await fetchDownloadTasks(); // 刷新列表
      } else {
        setError(response.text || '创建下载任务失败');
      }
    } catch (error: any) {
      setError(error.response?.data?.text || '创建下载任务失败');
    }
  };

  const handlePathSelect = (path: string) => {
    setSelectedPath(path);
    setPathSelectOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="MuiBox-root css-1cacf56">
        <Typography variant="h2">
          离线下载
        </Typography>
      </Box>
      <DataTable
        title="离线下载"
        columns={columns}
        data={data}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        actions={['edit', 'delete']}
        toolbar={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddDownload}
          >
            新增下载
          </Button>
        }
      />

      {/* 新增下载对话框 */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增离线下载任务</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="下载链接"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="请输入要下载的文件链接"
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                label="目标路径"
                value={selectedPath}
                InputProps={{
                  readOnly: true,
                }}
              />
              <Button
                variant="outlined"
                onClick={() => setPathSelectOpen(true)}
              >
                选择
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>取消</Button>
          <Button onClick={handleConfirmAdd} variant="contained">
            确定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 路径选择对话框 */}
       <PathSelectDialog
         open={pathSelectOpen}
         onClose={() => setPathSelectOpen(false)}
         onConfirm={handlePathSelect}
         title="选择下载目标路径"
         currentPath={selectedPath}
         isPersonalFile={true}
       />
    </Box>
  );
};

export default OfflineDownload;