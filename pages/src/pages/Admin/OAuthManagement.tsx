import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { OAuth } from '../../types';
import { Chip } from '@mui/material';

const OAuthManagement: React.FC = () => {
  const [oauths] = useState<OAuth[]>([
    {
      oauth_name: 'google_oauth',
      oauth_type: 'google',
      oauth_data: '{"client_id": "xxx", "client_secret": "yyy"}',
      is_enabled: 1,
    },
    {
      oauth_name: 'github_oauth',
      oauth_type: 'github',
      oauth_data: '{"client_id": "aaa", "client_secret": "bbb"}',
      is_enabled: 1,
    },
    {
      oauth_name: 'microsoft_oauth',
      oauth_type: 'microsoft',
      oauth_data: '{"client_id": "ccc", "client_secret": "ddd"}',
      is_enabled: 0,
    },
  ]);

  const getTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'google': 'Google',
      'github': 'GitHub',
      'microsoft': 'Microsoft',
      'facebook': 'Facebook',
      'twitter': 'Twitter',
    };
    return typeMap[type] || type;
  };

  const columns = [
    { id: 'oauth_name', label: '授权名称', minWidth: 150 },
    { 
      id: 'oauth_type', 
      label: '授权类型', 
      minWidth: 120,
      format: (value: string) => getTypeText(value)
    },
    { 
      id: 'oauth_data', 
      label: '授权数据', 
      minWidth: 200,
      format: (value: string) => '已配置'
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

  const handleEdit = (oauth: OAuth) => {
    console.log('编辑授权:', oauth);
  };

  const handleDelete = (oauth: OAuth) => {
    console.log('删除授权:', oauth);
  };

  return (
    <DataTable
      title="授权管理"
      columns={columns}
      data={oauths}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default OAuthManagement;