import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  Button,
  ButtonGroup,
  Snackbar,
  Chip
} from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  Stop, 
  Delete,
  SelectAll
} from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { Task } from '../../types';
import apiService from '../../posts/api';

const TaskConfig: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  // 获取任务列表
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.request('/@tasks/select/none/', 'POST', {});
      if (response.flag) {
        setTasks(response.data || []);
      } else {
        setError(response.text || '获取任务列表失败');
      }
    } catch (err) {
      console.error('获取任务列表错误:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 显示消息提示
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 批量开始所有任务
  const handleStartAllTasks = async () => {
    try {
      const pendingTasks = tasks.filter(task => task.tasks_flag === 0);
      if (pendingTasks.length === 0) {
        showSnackbar('没有可开始的任务', 'error');
        return;
      }

      let successCount = 0;
      for (const task of pendingTasks) {
        try {
          const response = await apiService.request('/@tasks/status/none/', 'POST', {
            tasks_uuid: task.tasks_uuid,
            tasks_flag: 1 // 设置为运行状态
          });
          if (response.flag) {
            successCount++;
          }
        } catch (error) {
          console.error(`开始任务 ${task.tasks_uuid} 失败:`, error);
        }
      }
      
      showSnackbar(`成功开始 ${successCount} 个任务`, 'success');
      await fetchTasks();
    } catch (error) {
      console.error('批量开始任务失败:', error);
      showSnackbar('批量开始任务失败', 'error');
    }
  };

  // 批量暂停所有任务
  const handlePauseAllTasks = async () => {
    try {
      const runningTasks = tasks.filter(task => task.tasks_flag === 1);
      if (runningTasks.length === 0) {
        showSnackbar('没有正在运行的任务', 'error');
        return;
      }

      let successCount = 0;
      for (const task of runningTasks) {
        try {
          const response = await apiService.request('/@tasks/status/none/', 'POST', {
            tasks_uuid: task.tasks_uuid,
            tasks_flag: 2 // 设置为暂停状态
          });
          if (response.flag) {
            successCount++;
          }
        } catch (error) {
          console.error(`暂停任务 ${task.tasks_uuid} 失败:`, error);
        }
      }
      
      showSnackbar(`成功暂停 ${successCount} 个任务`, 'success');
      await fetchTasks();
    } catch (error) {
      console.error('批量暂停任务失败:', error);
      showSnackbar('批量暂停任务失败', 'error');
    }
  };

  // 批量停止所有任务
  const handleStopAllTasks = async () => {
    try {
      const activeTasks = tasks.filter(task => task.tasks_flag === 1 || task.tasks_flag === 2);
      if (activeTasks.length === 0) {
        showSnackbar('没有可停止的任务', 'error');
        return;
      }

      let successCount = 0;
      for (const task of activeTasks) {
        try {
          const response = await apiService.request('/@tasks/status/none/', 'POST', {
            tasks_uuid: task.tasks_uuid,
            tasks_flag: 0 // 设置为停止状态
          });
          if (response.flag) {
            successCount++;
          }
        } catch (error) {
          console.error(`停止任务 ${task.tasks_uuid} 失败:`, error);
        }
      }
      
      showSnackbar(`成功停止 ${successCount} 个任务`, 'success');
      await fetchTasks();
    } catch (error) {
      console.error('批量停止任务失败:', error);
      showSnackbar('批量停止任务失败', 'error');
    }
  };

  // 批量删除所有已完成的任务
  const handleDeleteCompletedTasks = async () => {
    if (!confirm('确定要删除所有已完成的任务吗？此操作不可撤销。')) {
      return;
    }

    try {
      const completedTasks = tasks.filter(task => task.tasks_flag === 3 || task.tasks_flag === 4);
      if (completedTasks.length === 0) {
        showSnackbar('没有已完成的任务可删除', 'error');
        return;
      }

      let successCount = 0;
      for (const task of completedTasks) {
        try {
          const response = await apiService.request('/@tasks/remove/none/', 'POST', {
            tasks_uuid: task.tasks_uuid
          });
          if (response.flag) {
            successCount++;
          }
        } catch (error) {
          console.error(`删除任务 ${task.tasks_uuid} 失败:`, error);
        }
      }
      
      showSnackbar(`成功删除 ${successCount} 个已完成任务`, 'success');
      await fetchTasks();
    } catch (error) {
      console.error('批量删除任务失败:', error);
      showSnackbar('批量删除任务失败', 'error');
    }
  };

  const getTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'upload': '上传任务',
      'download': '下载任务',
      'sync': '同步任务',
      'backup': '备份任务',
      'compress': '压缩任务',
      'extract': '解压任务',
      'convert': '转换任务',
      'scan': '扫描任务',
      'cleanup': '清理任务',
      'other': '其他任务',
    };
    return typeMap[type] || type;
  };

  const getStatusText = (flag: number) => {
    const statusMap: { [key: number]: { text: string; color: any } } = {
      0: { text: '待执行', color: 'default' },
      1: { text: '执行中', color: 'primary' },
      2: { text: '已完成', color: 'success' },
      3: { text: '失败', color: 'error' },
    };
    return statusMap[flag] || { text: '未知', color: 'default' };
  };

  const columns = [
    { id: 'tasks_uuid', label: '任务UUID', minWidth: 150 },
    { 
      id: 'tasks_type', 
      label: '任务类型', 
      minWidth: 120,
      format: (value: string) => getTypeText(value)
    },
    { id: 'tasks_user', label: '所属用户', minWidth: 120 },
    { 
      id: 'tasks_info', 
      label: '任务信息', 
      minWidth: 200,
      format: (value: string) => '已配置'
    },
    { 
      id: 'tasks_flag', 
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

  const handleEdit = (task: Task) => {
    console.log('编辑任务配置:', task);
    // TODO: 实现编辑任务功能
  };

  const handleDelete = async (task: Task) => {
    try {
      const response = await apiService.request('/@tasks/remove/none/', 'POST', {
        tasks_uuid: task.tasks_uuid
      });
      if (response.flag) {
        // 删除成功，重新获取任务列表
        await fetchTasks();
      } else {
        setError(response.text || '删除任务失败');
      }
    } catch (err) {
      console.error('删除任务错误:', err);
      setError('删除任务失败，请稍后重试');
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
      <Box p={2}>
        <Alert severity="error" onClose={() => setError(null)}>
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
            任务管理
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理和监控系统中的各类任务执行状态
          </Typography>
        </Box>
        <ButtonGroup variant="contained" size="small">
          <Button
            startIcon={<PlayArrow />}
            onClick={handleStartAllTasks}
            color="success"
          >
            开始所有
          </Button>
          <Button
            startIcon={<Pause />}
            onClick={handlePauseAllTasks}
            color="warning"
          >
            暂停所有
          </Button>
          <Button
            startIcon={<Stop />}
            onClick={handleStopAllTasks}
            color="error"
          >
            停止所有
          </Button>
          <Button
            startIcon={<Delete />}
            onClick={handleDeleteCompletedTasks}
            color="error"
            variant="outlined"
          >
            清理已完成
          </Button>
        </ButtonGroup>
      </Box>
      <DataTable
        title="任务配置"
        columns={columns}
        data={tasks}
        onEdit={handleEdit}
        onDelete={handleDelete}
        actions={['edit', 'delete']}
      />

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

export default TaskConfig;