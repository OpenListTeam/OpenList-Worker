import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
} from '@mui/material';
import {
  ArrowBack,
  InsertDriveFile,
  Image,
  VideoFile,
  AudioFile,
  PictureAsPdf,
  Description,
  Archive,
  Code,
  Home,
  NavigateNext,
  Download,
  Share,
  Edit,
} from '@mui/icons-material';
import axios from 'axios';

interface FilePreviewInfo {
  name: string;
  path: string;
  size: number;
  created_at: string;
  modified_at: string;
  hash?: string;
  mime_type?: string;
  is_dir: boolean;
}

const FilePreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FilePreviewInfo | null>(null);

  // 从URL路径解析文件路径
  const parseFilePathFromUrl = (pathname: string): string => {
    // 个人文件路径: /@pages/myfile/sub/file.txt -> /sub/file.txt
    if (pathname.startsWith('/@pages/myfile/')) {
      const filePath = pathname.substring(15); // 去掉 '/@pages/myfile/' 前缀
      return filePath || '/';
    }
    // 个人文件根路径: /@pages/myfile -> /
    if (pathname === '/@pages/myfile') {
      return '/';
    }
    // 公共文件路径: 直接使用路径
    return pathname === '/' ? '/' : pathname;
  };

  // 检查是否为个人文件路径
  const isPersonalFile = (pathname: string): boolean => {
    return pathname.startsWith('/@pages/myfile');
  };

  // 构建后端API路径
  const buildBackendPath = (filePath: string, pathname: string): string => {
    const username = 'testuser'; // TODO: 从用户上下文获取实际用户名
    
    if (isPersonalFile(pathname)) {
      // 个人文件需要添加 /@home/<username>/ 前缀
      return `/@home/${username}${filePath}`;
    } else {
      // 公共文件直接使用路径
      return filePath;
    }
  };

  // 获取文件信息
  const fetchFileInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filePath = parseFilePathFromUrl(location.pathname);
      const backendPath = buildBackendPath(filePath, location.pathname);
      
      // 构建API URL
      const cleanBackendPath = backendPath === '/' ? '' : backendPath.replace(/\/$/, '');
      const apiUrl = cleanBackendPath === '' || cleanBackendPath === '/' 
        ? 'http://127.0.0.1:8787/@files/info/path/'
        : `http://127.0.0.1:8787/@files/info/path${cleanBackendPath}`;

      const response = await axios.get(apiUrl);
      
      if (response.data && response.data.flag && response.data.data) {
        setFileInfo(response.data.data);
      } else {
        setError('文件信息获取失败');
      }
    } catch (error) {
      console.error('获取文件信息失败:', error);
      setError('文件信息获取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFileInfo();
  }, [location.pathname]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 获取文件图标
  const getFileIcon = (fileName: string, mimeType?: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const type = mimeType?.toLowerCase();

    if (type?.startsWith('image/')) {
      return <Image sx={{ fontSize: 48, color: '#4CAF50' }} />;
    } else if (type?.startsWith('video/')) {
      return <VideoFile sx={{ fontSize: 48, color: '#FF9800' }} />;
    } else if (type?.startsWith('audio/')) {
      return <AudioFile sx={{ fontSize: 48, color: '#9C27B0' }} />;
    } else if (extension === 'pdf') {
      return <PictureAsPdf sx={{ fontSize: 48, color: '#F44336' }} />;
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
      return <Description sx={{ fontSize: 48, color: '#2196F3' }} />;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return <Archive sx={{ fontSize: 48, color: '#795548' }} />;
    } else if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml'].includes(extension || '')) {
      return <Code sx={{ fontSize: 48, color: '#607D8B' }} />;
    } else {
      return <InsertDriveFile sx={{ fontSize: 48, color: '#757575' }} />;
    }
  };

  // 生成面包屑导航
  const generateBreadcrumbs = () => {
    const filePath = parseFilePathFromUrl(location.pathname);
    const pathParts = filePath.split('/').filter(part => part !== '');
    const breadcrumbs = [];
    
    // 根目录
    const rootPath = isPersonalFile(location.pathname) ? '/@pages/myfile' : '/';
    const rootLabel = isPersonalFile(location.pathname) ? '我的文件' : '公共目录';
    breadcrumbs.push({ label: rootLabel, path: rootPath });
    
    // 子目录
    let currentPath = rootPath;
    pathParts.forEach((part, index) => {
      if (index < pathParts.length - 1) { // 不包括文件名本身
        currentPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`;
        breadcrumbs.push({ label: part, path: currentPath });
      }
    });
    
    return breadcrumbs;
  };

  // 返回上级目录
  const handleGoBack = () => {
    const breadcrumbs = generateBreadcrumbs();
    if (breadcrumbs.length > 1) {
      navigate(breadcrumbs[breadcrumbs.length - 1].path);
    } else {
      navigate(breadcrumbs[0].path);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!fileInfo) {
    return (
      <Box p={3}>
        <Alert severity="warning">文件信息不存在</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* 导航栏 */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={handleGoBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          {generateBreadcrumbs().map((breadcrumb, index) => (
            <Link
              key={index}
              component="button"
              variant="body2"
              onClick={() => navigate(breadcrumb.path)}
              sx={{ textDecoration: 'none' }}
            >
              {index === 0 ? <Home fontSize="small" sx={{ mr: 0.5 }} /> : null}
              {breadcrumb.label}
            </Link>
          ))}
          <Typography variant="body2" color="text.primary">
            {fileInfo.name}
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* 文件信息区域 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            {/* 左侧：文件图标和预览 */}
            <Grid item xs={12} md={4}>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: 'transparent',
                    mb: 2,
                  }}
                >
                  {getFileIcon(fileInfo.name, fileInfo.mime_type)}
                </Avatar>
                
                {/* 操作按钮 */}
                <Box display="flex" gap={1}>
                  <IconButton color="primary" title="下载">
                    <Download />
                  </IconButton>
                  <IconButton color="primary" title="分享">
                    <Share />
                  </IconButton>
                  <IconButton color="primary" title="编辑">
                    <Edit />
                  </IconButton>
                </Box>
              </Box>
            </Grid>

            {/* 右侧：文件详细信息 */}
            <Grid item xs={12} md={8}>
              <Typography variant="h5" gutterBottom>
                {fileInfo.name}
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    文件路径
                  </Typography>
                  <Typography variant="body1">
                    {fileInfo.path}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    文件大小
                  </Typography>
                  <Typography variant="body1">
                    {formatFileSize(fileInfo.size)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    创建时间
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(fileInfo.created_at)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    修改时间
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(fileInfo.modified_at)}
                  </Typography>
                </Box>

                {fileInfo.mime_type && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      文件类型
                    </Typography>
                    <Chip label={fileInfo.mime_type} size="small" />
                  </Box>
                )}

                {fileInfo.hash && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      文件哈希
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {fileInfo.hash}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {/* 文件预览区域 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            文件预览
          </Typography>
          <Box
            sx={{
              minHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.50',
              borderRadius: 1,
              border: '1px dashed',
              borderColor: 'grey.300',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              预览功能即将推出...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FilePreview;