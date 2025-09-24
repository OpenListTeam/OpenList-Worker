import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Token } from '../../types';
import { Chip } from '@mui/material';

const ConnectionConfig: React.FC = () => {
  const [tokens] = useState<Token[]>([
    {
      token_uuid: 'token-001',
      token_path: '/api/v1/files',
      token_user: 'current_user',
      token_type: 'api',
      token_info: '{"key": "api_key_123", "permissions": ["read", "write"]}',
      is_enabled: 1,
    },
    {
      token_uuid: 'token-002',
      token_path: '/webdav',
      token_user: 'current_user',
      token_type: 'webdav',
      token_info: '{"username": "user", "password": "pass123"}',
      is_enabled: 1,
    },
    {
      token_uuid: 'token-003',
      token_path: '/ftp',
      token_user: 'current_user',
      token_type: 'ftp',
      token_info: '{"host": "ftp.example.com", "port": 21}',
      is_enabled: 0,
    },
  ]);

  const getTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'api': 'API接口',
      'webdav': 'WebDAV',
      'ftp': 'FTP',
      'sftp': 'SFTP',
    };
    return typeMap[type] || type;
  };

  const columns = [
    { id: 'token_uuid', label: '连接UUID', minWidth: 150 },
    { id: 'token_path', label: '连接路径', minWidth: 200 },
    { id: 'token_user', label: '所属用户', minWidth: 120 },
    { 
      id: 'token_type', 
      label: '连接类型', 
      minWidth: 120,
      format: (value: string) => getTypeText(value)
    },
    { 
      id: 'token_info', 
      label: '登录信息', 
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

  const handleEdit = (token: Token) => {
    console.log('编辑连接配置:', token);
  };

  const handleDelete = (token: Token) => {
    console.log('删除连接配置:', token);
  };

  return (
    <DataTable
      title="连接配置"
      columns={columns}
      data={tokens}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default ConnectionConfig;