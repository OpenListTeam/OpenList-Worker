import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { User } from '../../types';
import { Chip } from '@mui/material';

const UserManagement: React.FC = () => {
  const [users] = useState<User[]>([
    {
      users_uuid: 1,
      users_name: 'admin',
      users_pass: 'sha256:xxx',
      users_mask: 'admin',
      is_enabled: 1,
      total_size: 10737418240, // 10GB
      total_used: 5368709120,  // 5GB
      oauth_data: '{}',
      mount_data: '{}',
    },
    {
      users_uuid: 2,
      users_name: 'user1',
      users_pass: 'sha256:yyy',
      users_mask: 'user',
      is_enabled: 1,
      total_size: 5368709120,  // 5GB
      total_used: 1073741824,  // 1GB
      oauth_data: '{}',
      mount_data: '{}',
    },
    {
      users_uuid: 3,
      users_name: 'guest',
      users_pass: 'sha256:zzz',
      users_mask: 'guest',
      is_enabled: 0,
      total_size: 1073741824,  // 1GB
      total_used: 0,
      oauth_data: '{}',
      mount_data: '{}',
    },
  ]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    { id: 'users_name', label: '用户名', minWidth: 120 },
    { 
      id: 'users_mask', 
      label: '用户权限', 
      minWidth: 100,
      format: (value: string) => {
        const maskMap: { [key: string]: string } = {
          'admin': '管理员',
          'user': '普通用户',
          'guest': '访客',
        };
        return maskMap[value] || value;
      }
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
    { 
      id: 'total_size', 
      label: '总空间', 
      minWidth: 100,
      format: (value: number) => formatSize(value)
    },
    { 
      id: 'total_used', 
      label: '已用空间', 
      minWidth: 100,
      format: (value: number) => formatSize(value)
    },
  ];

  const handleEdit = (user: User) => {
    console.log('编辑用户:', user);
  };

  const handleDelete = (user: User) => {
    console.log('删除用户:', user);
  };

  return (
    <DataTable
      title="用户管理"
      columns={columns}
      data={users}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default UserManagement;