import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Mount } from '../../types';
import { Chip } from '@mui/material';

const MountManagement: React.FC = () => {
  const [mounts] = useState<Mount[]>([
    {
      mount_path: '/onedrive',
      mount_type: 'OneDrive',
      is_enabled: 1,
      drive_conf: '{"client_id": "xxx", "client_secret": "yyy"}',
      drive_save: '{"refresh_token": "zzz"}',
      cache_time: 3600,
    },
    {
      mount_path: '/googledrive',
      mount_type: 'GoogleDrive',
      is_enabled: 1,
      drive_conf: '{"client_id": "aaa", "client_secret": "bbb"}',
      drive_save: '{"refresh_token": "ccc"}',
      cache_time: 3600,
    },
    {
      mount_path: '/baiduyun',
      mount_type: 'BaiduYun',
      is_enabled: 0,
      drive_conf: '{"access_token": "ddd"}',
      drive_save: '{"refresh_token": "eee"}',
      cache_time: 1800,
    },
    {
      mount_path: '/local',
      mount_type: 'Local',
      is_enabled: 1,
      cache_time: 0,
    },
  ]);

  const columns = [
    { id: 'mount_path', label: '挂载路径', minWidth: 150 },
    { id: 'mount_type', label: '驱动类型', minWidth: 120 },
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
    { 
      id: 'cache_time', 
      label: '缓存时间(秒)', 
      minWidth: 120,
      format: (value: number) => value === 0 ? '无缓存' : `${value}秒`
    },
    { 
      id: 'drive_conf', 
      label: '配置数据', 
      minWidth: 200,
      format: (value: string) => value ? '已配置' : '未配置'
    },
  ];

  const handleEdit = (mount: Mount) => {
    console.log('编辑挂载:', mount);
  };

  const handleDelete = (mount: Mount) => {
    console.log('删除挂载:', mount);
  };

  return (
    <DataTable
      title="挂载管理"
      columns={columns}
      data={mounts}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default MountManagement;