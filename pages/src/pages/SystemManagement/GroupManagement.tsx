import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Group } from '../../types';
import { Chip } from '@mui/material';

const GroupManagement: React.FC = () => {
  const [groups] = useState<Group[]>([
    {
      group_name: 'administrators',
      group_mask: 'admin',
      is_enabled: 1,
    },
    {
      group_name: 'users',
      group_mask: 'user',
      is_enabled: 1,
    },
    {
      group_name: 'guests',
      group_mask: 'guest',
      is_enabled: 1,
    },
    {
      group_name: 'developers',
      group_mask: 'dev',
      is_enabled: 1,
    },
  ]);

  const getMaskText = (mask: string) => {
    const maskMap: { [key: string]: string } = {
      'admin': '管理员',
      'user': '普通用户',
      'guest': '访客',
      'dev': '开发者',
    };
    return maskMap[mask] || mask;
  };

  const columns = [
    { id: 'group_name', label: '分组名称', minWidth: 150 },
    { 
      id: 'group_mask', 
      label: '分组掩码', 
      minWidth: 120,
      format: (value: string) => getMaskText(value)
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

  const handleEdit = (group: Group) => {
    console.log('编辑分组:', group);
  };

  const handleDelete = (group: Group) => {
    console.log('删除分组:', group);
  };

  return (
    <DataTable
      title="分组管理"
      columns={columns}
      data={groups}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default GroupManagement;