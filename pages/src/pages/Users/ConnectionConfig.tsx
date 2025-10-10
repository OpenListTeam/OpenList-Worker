import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { Token } from '../../types';
import { Chip, CircularProgress, Alert } from '@mui/material';
import apiService from '../../posts/api';
import { useApp } from '../../components/AppContext';

const ConnectionConfig: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { state } = useApp();

  // 获取当前用户的连接配置
  const loadTokens = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!state.user?.users_name) {
        setError('用户未登录');
        return;
      }

      const result = await apiService.post('/@token/user/none', {
        token_user: state.user.users_name
      });
      
      if (result.flag) {
        // 转换后端数据格式到前端格式
        const convertedTokens = (result.data || []).map((token: any) => ({
          token_uuid: token.token_uuid,
          token_path: token.token_name || '', // 使用token_name作为路径显示
          token_user: token.token_user,
          token_type: token.token_type || 'api',
          token_info: token.token_data || '',
          is_enabled: token.is_enabled || 0,
        }));
        setTokens(convertedTokens);
      } else {
        setError(result.text || '获取连接配置失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取连接配置失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [state.user]);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>连接配置</h2>
        <Alert severity="error" style={{ marginBottom: '16px' }}>
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <h2>连接配置</h2>
      <DataTable
        title="连接配置"
        columns={columns}
        data={tokens}
        onEdit={handleEdit}
        onDelete={handleDelete}
        actions={['edit', 'delete']}
      />
    </div>
  );
};

export default ConnectionConfig;