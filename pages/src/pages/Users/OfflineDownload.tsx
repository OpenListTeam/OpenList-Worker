import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Fetch } from '../../types';
import { Chip } from '@mui/material';

const OfflineDownload: React.FC = () => {
  const [downloads] = useState<Fetch[]>([
    {
      fetch_uuid: 'fetch-001',
      fetch_from: 'https://example.com/file1.zip',
      fetch_dest: '/downloads/',
      fetch_user: 'current_user',
      fetch_flag: 2,
    },
    {
      fetch_uuid: 'fetch-002',
      fetch_from: 'https://example.com/file2.tar.gz',
      fetch_dest: '/downloads/',
      fetch_user: 'current_user',
      fetch_flag: 1,
    },
    {
      fetch_uuid: 'fetch-003',
      fetch_from: 'https://example.com/file3.mp4',
      fetch_dest: '/downloads/videos/',
      fetch_user: 'current_user',
      fetch_flag: 0,
    },
  ]);

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

  const handleEdit = (download: Fetch) => {
    console.log('编辑下载任务:', download);
  };

  const handleDelete = (download: Fetch) => {
    console.log('删除下载任务:', download);
  };

  return (
    <DataTable
      title="离线下载"
      columns={columns}
      data={downloads}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default OfflineDownload;