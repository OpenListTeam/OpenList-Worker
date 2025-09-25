import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Mates } from '../../types';
import { Chip } from '@mui/material';

const MatesConfig: React.FC = () => {
  const [mates] = useState<Mates[]>([
    {
      mates_name: '/documents',
      mates_mask: 755,
      mates_user: 1,
      is_enabled: 1,
      dir_hidden: 0,
      dir_shared: 1,
      set_zipped: '{"enabled": true, "level": 6}',
      set_parted: '{"enabled": false, "size": "100MB"}',
      crypt_name: 'default',
      cache_time: 3600,
    },
    {
      mates_name: '/photos',
      mates_mask: 750,
      mates_user: 1,
      is_enabled: 1,
      dir_hidden: 0,
      dir_shared: 1,
      set_zipped: '{"enabled": true, "level": 4}',
      set_parted: '{"enabled": true, "size": "50MB"}',
      crypt_name: 'personal',
      cache_time: 1800,
    },
    {
      mates_name: '/private',
      mates_mask: 700,
      mates_user: 1,
      is_enabled: 1,
      dir_hidden: 1,
      dir_shared: 0,
      set_zipped: '{"enabled": false}',
      set_parted: '{"enabled": false}',
      crypt_name: 'default',
      cache_time: 0,
    },
  ]);

  const columns = [
    { id: 'mates_name', label: '元组路径', minWidth: 150 },
    { id: 'mates_mask', label: '权限掩码', minWidth: 100 },
    { id: 'mates_user', label: '所有用户', minWidth: 100 },
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
      id: 'dir_hidden', 
      label: '隐藏', 
      minWidth: 80,
      format: (value: number) => (
        <Chip
          label={value === 1 ? '是' : '否'}
          size="small"
          color={value === 1 ? 'primary' : 'default'}
        />
      )
    },
    { 
      id: 'dir_shared', 
      label: '共享', 
      minWidth: 80,
      format: (value: number) => (
        <Chip
          label={value === 1 ? '是' : '否'}
          size="small"
          color={value === 1 ? 'primary' : 'default'}
        />
      )
    },
    { id: 'crypt_name', label: '加密配置', minWidth: 120 },
    { 
      id: 'cache_time', 
      label: '缓存时间', 
      minWidth: 100,
      format: (value: number) => value === 0 ? '无缓存' : `${value}秒`
    },
  ];

  const handleEdit = (mate: Mates) => {
    console.log('编辑元组配置:', mate);
  };

  const handleDelete = (mate: Mates) => {
    console.log('删除元组配置:', mate);
  };

  return (
    <DataTable
      title="元组配置"
      columns={columns}
      data={mates}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default MatesConfig;