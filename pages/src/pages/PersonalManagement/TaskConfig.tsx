import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Task } from '../../types';
import { Chip } from '@mui/material';

const TaskConfig: React.FC = () => {
  const [tasks] = useState<Task[]>([
    {
      tasks_uuid: 'task-001',
      tasks_type: 'sync',
      tasks_user: 'current_user',
      tasks_info: '{"source": "/local", "target": "/onedrive", "schedule": "daily"}',
      tasks_flag: 1,
    },
    {
      tasks_uuid: 'task-002',
      tasks_type: 'backup',
      tasks_user: 'current_user',
      tasks_info: '{"source": "/documents", "target": "/backup", "schedule": "weekly"}',
      tasks_flag: 2,
    },
    {
      tasks_uuid: 'task-003',
      tasks_type: 'cleanup',
      tasks_user: 'current_user',
      tasks_info: '{"path": "/temp", "older_than": 7}',
      tasks_flag: 0,
    },
  ]);

  const getTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'sync': '同步任务',
      'backup': '备份任务',
      'cleanup': '清理任务',
      'index': '索引任务',
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
  };

  const handleDelete = (task: Task) => {
    console.log('删除任务配置:', task);
  };

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