import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Folder,
  InsertDriveFile,
  Home,
  NavigateNext,
  Refresh,
  Upload,
  CreateNewFolder,
} from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { fileApi } from '../../posts/api';
import { FileInfo, PathInfo } from '../../types';

interface UnifiedFileManagerProps {
  defaultPath?: string;
  title?: string;
}

const UnifiedFileManager: React.FC<UnifiedFileManagerProps> = ({
  defaultPath = '/',
  title = '文件管理'
}) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pathInfo, setPathInfo] = useState<PathInfo | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(defaultPath);

  // 从URL参数获取路径
  useEffect(() => {
    const pathParam = searchParams.get('path');
    if (pathParam) {
      setCurrentPath(pathParam);
    } else {
      setCurrentPath(defaultPath);
    }
  }, [searchParams, defaultPath]);

  // 获取文件列表
  const fetchFileList = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fileApi.getFileList(path);
      
      if (response.data) {
        setPathInfo(response.data as PathInfo);
      } else {
        setError('获取文件列表失败');
      }
    } catch (err) {
      console.error('获取文件列表错误:', err);
      setError('获取文件列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 当路径改变时重新获取文件列表
  useEffect(() => {
    fetchFileList(currentPath);
  }, [currentPath]);

  // 格式化文件大小
  const formatFileSize = (size: number): string => {
    if (size === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && index < units.length - 1) {
      fileSize /= 1024;
      index++;
    }
    
    return `${fileSize.toFixed(1)} ${units[index]}`;
  };

  // 格式化时间
  const formatDate = (date?: Date): string => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  // 生成面包屑导航
  const generateBreadcrumbs = () => {
    const pathParts = currentPath.split('/').filter(part => part);
    const breadcrumbs = [
      {
        label: '根目录',
        path: '/',
        icon: <Home fontSize="small" />
      }
    ];

    let currentBreadcrumbPath = '';
    pathParts.forEach((part, index) => {
      currentBreadcrumbPath += `/${part}`;
      breadcrumbs.push({
        label: part,
        path: currentBreadcrumbPath,
        icon: <Folder fontSize="small" />
      });
    });

    return breadcrumbs;
  };

  // 处理文件夹点击
  const handleFolderClick = (fileInfo: FileInfo) => {
    if (fileInfo.fileType === 0) { // 目录
      const newPath = currentPath === '/' 
        ? `/${fileInfo.fileName}` 
        : `${currentPath}/${fileInfo.fileName}`;
      setCurrentPath(newPath);
    }
  };

  // 处理面包屑点击
  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
  };

  // 刷新文件列表
  const handleRefresh = () => {
    fetchFileList(currentPath);
  };

  // 准备表格数据
  const tableColumns = [
    {
      id: 'fileName',
      label: '文件名',
      minWidth: 200,
      render: (fileInfo: FileInfo) => (
        <Box 
          display="flex" 
          alignItems="center" 
          sx={{ cursor: fileInfo.fileType === 0 ? 'pointer' : 'default' }}
          onClick={() => handleFolderClick(fileInfo)}
        >
          {fileInfo.fileType === 0 ? (
            <Folder sx={{ mr: 1, color: 'primary.main' }} />
          ) : (
            <InsertDriveFile sx={{ mr: 1, color: 'text.secondary' }} />
          )}
          <Typography variant="body2">{fileInfo.fileName}</Typography>
        </Box>
      )
    },
    {
      id: 'fileSize',
      label: '大小',
      minWidth: 100,
      align: 'right' as const,
      render: (fileInfo: FileInfo) => formatFileSize(fileInfo.fileSize)
    },
    {
      id: 'timeModify',
      label: '修改时间',
      minWidth: 150,
      align: 'right' as const,
      render: (fileInfo: FileInfo) => formatDate(fileInfo.timeModify)
    },
    {
      id: 'fileType',
      label: '类型',
      minWidth: 80,
      align: 'center' as const,
      render: (fileInfo: FileInfo) => fileInfo.fileType === 0 ? '文件夹' : '文件'
    }
  ];

  const breadcrumbs = generateBreadcrumbs();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* 路径导航和操作栏 */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {/* 面包屑导航 */}
            <Box flex={1}>
              <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
                {breadcrumbs.map((breadcrumb, index) => (
                  <Link
                    key={index}
                    component="button"
                    variant="body2"
                    onClick={() => handleBreadcrumbClick(breadcrumb.path)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none',
                      color: index === breadcrumbs.length - 1 ? 'text.primary' : 'primary.main',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {breadcrumb.icon}
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {breadcrumb.label}
                    </Typography>
                  </Link>
                ))}
              </Breadcrumbs>
            </Box>
            
            {/* 操作按钮 */}
            <Box display="flex" alignItems="center" ml={2}>
              <Tooltip title="刷新">
                <IconButton onClick={handleRefresh} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="上传文件">
                <IconButton size="small">
                  <Upload />
                </IconButton>
              </Tooltip>
              <Tooltip title="新建文件夹">
                <IconButton size="small">
                  <CreateNewFolder />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 文件列表 */}
      {pathInfo && pathInfo.fileList && (
        <DataTable
          title={`当前路径: ${currentPath}`}
          columns={tableColumns}
          data={pathInfo.fileList}
          showCheckbox={true}
          showPagination={true}
          actions={['download', 'delete', 'share']}
          onEdit={(file) => console.log('编辑文件:', file)}
          onDelete={(file) => console.log('删除文件:', file)}
          onDownload={(file) => console.log('下载文件:', file)}
          onShare={(file) => console.log('分享文件:', file)}
        />
      )}

      {/* 空状态 */}
      {pathInfo && (!pathInfo.fileList || pathInfo.fileList.length === 0) && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            此目录为空
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            您可以上传文件或创建新文件夹
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default UnifiedFileManager;