import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Share } from '../../types';
import { Chip } from '@mui/material';

const MyShares: React.FC = () => {
  const [shares] = useState<Share[]>([
    {
      share_uuid: 'share-001',
      share_path: '/documents/report.pdf',
      share_pass: '123456',
      share_user: 'current_user',
      share_date: 1695561600,
      share_ends: 1698163200,
      is_enabled: 1,
    },
    {
      share_uuid: 'share-002',
      share_path: '/photos/vacation',
      share_pass: 'abc123',
      share_user: 'current_user',
      share_date: 1695475200,
      share_ends: 1698076800,
      is_enabled: 1,
    },
    {
      share_uuid: 'share-003',
      share_path: '/videos/tutorial.mp4',
      share_pass: 'tutorial2023',
      share_user: 'current_user',
      share_date: 1695388800,
      share_ends: 1697980800,
      is_enabled: 0,
    },
  ]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
  };

  const columns = [
    { id: 'share_uuid', label: '分享ID', minWidth: 120 },
    { id: 'share_path', label: '分享路径', minWidth: 200 },
    { id: 'share_pass', label: '分享密码', minWidth: 100 },
    { id: 'share_user', label: '分享用户', minWidth: 100 },
    { 
      id: 'share_date', 
      label: '分享日期', 
      minWidth: 120,
      format: (value: number) => formatDate(value)
    },
    { 
      id: 'share_ends', 
      label: '有效期限', 
      minWidth: 120,
      format: (value: number) => formatDate(value)
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

  const handleEdit = (share: Share) => {
    console.log('编辑分享:', share);
  };

  const handleDelete = (share: Share) => {
    console.log('删除分享:', share);
  };

  return (
    <DataTable
      title="我的分享"
      columns={columns}
      data={shares}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default MyShares;