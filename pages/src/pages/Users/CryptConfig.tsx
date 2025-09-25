import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Crypt } from '../../types';
import { Chip } from '@mui/material';

const CryptConfig: React.FC = () => {
  const [crypts] = useState<Crypt[]>([
    {
      crypt_name: 'default',
      crypt_pass: 'master_password_123',
      crypt_type: 1,
      crypt_mode: 1,
      is_enabled: 1,
      crypt_self: 1,
      rands_pass: 0,
      oauth_data: '{}',
      write_name: '.encrypted',
    },
    {
      crypt_name: 'personal',
      crypt_pass: 'personal_key_456',
      crypt_type: 2,
      crypt_mode: 2,
      is_enabled: 1,
      crypt_self: 0,
      rands_pass: 1,
      oauth_data: '{}',
      write_name: '.pencrypted',
    },
    {
      crypt_name: 'backup',
      crypt_pass: 'backup_key_789',
      crypt_type: 1,
      crypt_mode: 1,
      is_enabled: 0,
      crypt_self: 1,
      rands_pass: 0,
      oauth_data: '{}',
      write_name: '.bencrypted',
    },
  ]);

  const getCryptTypeText = (type: number) => {
    const typeMap: { [key: number]: string } = {
      1: 'AES',
      2: 'RSA',
      3: 'ChaCha20',
    };
    return typeMap[type] || `类型${type}`;
  };

  const getCryptModeText = (mode: number) => {
    const modeMap: { [key: number]: string } = {
      1: 'CBC',
      2: 'GCM',
      3: 'CTR',
    };
    return modeMap[mode] || `模式${mode}`;
  };

  const columns = [
    { id: 'crypt_name', label: '加密名称', minWidth: 120 },
    { 
      id: 'crypt_type', 
      label: '加密类型', 
      minWidth: 100,
      format: (value: number) => getCryptTypeText(value)
    },
    { 
      id: 'crypt_mode', 
      label: '加密模式', 
      minWidth: 100,
      format: (value: number) => getCryptModeText(value)
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
      id: 'crypt_self', 
      label: '自动解密', 
      minWidth: 100,
      format: (value: number) => (
        <Chip
          label={value === 1 ? '是' : '否'}
          size="small"
          color={value === 1 ? 'primary' : 'default'}
        />
      )
    },
    { 
      id: 'rands_pass', 
      label: '随机密码', 
      minWidth: 100,
      format: (value: number) => (
        <Chip
          label={value === 1 ? '启用' : '禁用'}
          size="small"
          color={value === 1 ? 'primary' : 'default'}
        />
      )
    },
    { id: 'write_name', label: '后缀名称', minWidth: 120 },
  ];

  const handleEdit = (crypt: Crypt) => {
    console.log('编辑加密配置:', crypt);
  };

  const handleDelete = (crypt: Crypt) => {
    console.log('删除加密配置:', crypt);
  };

  return (
    <DataTable
      title="加密配置"
      columns={columns}
      data={crypts}
      onEdit={handleEdit}
      onDelete={handleDelete}
      actions={['edit', 'delete']}
    />
  );
};

export default CryptConfig;