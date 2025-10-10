import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { Task } from '../../types';
import { Chip, Alert, CircularProgress, Box } from '@mui/material';
import apiService from '../../posts/api';

const TaskConfig: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <DataTable
      title="任务配置"
      columns={columns}
      data={tasks}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default TaskConfig;