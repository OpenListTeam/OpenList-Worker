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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
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
  ContentCopy,
} from '@mui/icons-material';
import axios from 'axios';
import { fileApi } from '../../posts/api';
import { 
  downloadFile, 
  FileInfo as DownloadFileInfo,
  parseFilePathFromUrl,
  isPersonalFile,
  buildBackendPath
} from '../../utils/downloadUtils';
import { useApp } from '../../components/AppContext';

interface FilePreviewInfo {
  name: string;
  path: string;
  size: number;
  created_at: string;
  modified_at: string;
  hash?: string | { md5?: string; sha1?: string; sha256?: string; [key: string]: any };
  mime_type?: string;
  is_dir: boolean;
}

const FilePreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state: appState } = useApp();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FilePreviewInfo | null>(null);
  const [selectedHashType, setSelectedHashType] = useState<string>('md5');



  // 获取文件信息
  const fetchFileInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filePath = parseFilePathFromUrl(location.pathname);
      
      // 解析文件名和目录路径
      const fileName = filePath.split('/').pop() || '';
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
      
      // 构建目录的后端路径
      const backendDirPath = buildBackendPath(dirPath, location.pathname, appState.user?.username || 'testuser');
      const cleanBackendDirPath = backendDirPath === '/' ? '' : backendDirPath.replace(/\/$/, '');
      
      // 获取当前用户名
      const username = appState.user?.username;
      
      // 判断是否为个人文件
      const isPersonal = isPersonalFile(location.pathname);
      
      // 使用fileApi.getFileList()，这样会经过响应拦截器处理
      const response = await fileApi.getFileList(cleanBackendDirPath || '/', username, isPersonal);
      
      if (response && response.flag && response.data && response.data.fileList) {
        // 在文件列表中查找目标文件
        const targetFile = response.data.fileList.find((file: any) => file.fileName === fileName);
        
        if (targetFile) {
          // 调试：打印原始数据
          console.log('原始文件数据:', targetFile);
          console.log('createTime:', targetFile.createTime, 'modifyTime:', targetFile.modifyTime);
          
          // 转换为FilePreviewInfo格式
          const fileInfo: FilePreviewInfo = {
            name: targetFile.fileName,
            path: filePath,
            size: targetFile.fileSize || 0,
            created_at: targetFile.createTime || targetFile.timeCreate || '',
            modified_at: targetFile.modifyTime || targetFile.timeModify || '',
            hash: targetFile.fileHash || '',
            mime_type: targetFile.mimeType || '',
            is_dir: targetFile.fileType === 0
          };
          
          console.log('转换后的文件信息:', fileInfo);
          setFileInfo(fileInfo);
        } else {
          setError('文件不存在');
        }
      } else {
        setError('获取目录信息失败');
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

  // 当文件信息更新时，初始化哈希类型选择
  useEffect(() => {
    if (fileInfo?.hash) {
      const availableTypes = getAvailableHashTypes();
      if (availableTypes.length > 0) {
        // 优先选择 md5，如果没有则选择第一个可用的
        if (availableTypes.includes('md5')) {
          setSelectedHashType('md5');
        } else {
          setSelectedHashType(availableTypes[0]);
        }
      }
    }
  }, [fileInfo]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateInput: string | number): string => {
    if (!dateInput || (typeof dateInput === 'string' && dateInput.trim() === '')) {
      return '-';
    }
    
    try {
      let date: Date;
      
      // 处理不同的输入格式
      if (typeof dateInput === 'number') {
        // 数字时间戳处理
        const timestamp = dateInput < 10000000000 ? dateInput * 1000 : dateInput;
        date = new Date(timestamp);
      } else if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        
        // 检查是否为纯数字字符串（时间戳）
        if (/^\d+$/.test(trimmed)) {
          const timestamp = parseInt(trimmed, 10);
          date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
        } else {
          // 直接尝试解析日期字符串（包括ISO 8601格式）
          date = new Date(trimmed);
        }
      } else {
        return String(dateInput);
      }
      
      // 验证日期是否有效
      if (isNaN(date.getTime())) {
        // 如果转换失败，返回原文本
        return String(dateInput);
      }
      
      // 格式化为本地时间字符串
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('日期格式化错误:', error, '输入:', dateInput);
      // 如果转换失败，返回原文本
      return String(dateInput);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 这里可以添加一个成功提示
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 获取不包含文件名的目录路径
  const getDirectoryPath = (fullPath: string, fileName: string): string => {
    if (!fullPath || !fileName) return fullPath || '';
    
    // 如果路径以文件名结尾，则去掉文件名
    if (fullPath.endsWith('/' + fileName)) {
      return fullPath.substring(0, fullPath.length - fileName.length - 1);
    } else if (fullPath.endsWith('\\' + fileName)) {
      return fullPath.substring(0, fullPath.length - fileName.length - 1);
    }
    
    return fullPath;
  };

  // 处理路径点击跳转
  const handlePathClick = (directoryPath: string) => {
    if (directoryPath) {
      // 确保路径以 / 结尾
      const normalizedPath = directoryPath.endsWith('/') ? directoryPath : directoryPath + '/';
      
      // 检查是否为个人文件路径
      const isPersonal = isPersonalFile(location.pathname);
      let targetPath: string;
      
      if (isPersonal) {
        // 个人文件路径
        if (normalizedPath === '/') {
          targetPath = '/@pages/myfile/';
        } else {
          targetPath = `/@pages/myfile${normalizedPath}`;
        }
      } else {
        // 公共文件路径，直接使用路径
        targetPath = normalizedPath;
      }
      
      navigate(targetPath);
    }
  };

  // 获取选中的哈希值
  const getSelectedHashValue = (): string => {
    if (!fileInfo?.hash) return '';
    
    if (typeof fileInfo.hash === 'string') {
      return fileInfo.hash;
    }
    
    if (typeof fileInfo.hash === 'object') {
      const hashObj = fileInfo.hash as { md5?: string; sha1?: string; sha256?: string; [key: string]: any };
      return hashObj[selectedHashType] || '';
    }
    
    return '';
  };

  // 获取可用的哈希类型
  const getAvailableHashTypes = (): string[] => {
    if (!fileInfo?.hash) return [];
    
    if (typeof fileInfo.hash === 'string') {
      return ['hash']; // 如果是字符串，就显示为通用哈希
    }
    
    if (typeof fileInfo.hash === 'object') {
      const hashObj = fileInfo.hash as { md5?: string; sha1?: string; sha256?: string; [key: string]: any };
      return Object.keys(hashObj).filter(key => hashObj[key]);
    }
    
    return [];
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

  // 处理文件下载
  const handleFileDownload = async () => {
    if (!fileInfo) {
      setError('文件信息不存在');
      return;
    }

    await downloadFile({
      fileInfo: fileInfo as DownloadFileInfo,
      currentPath: location.pathname,
      onError: setError,
      onSuccess: () => {
        console.log('文件下载成功');
      }
    });
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
          <Box display="flex" alignItems="flex-start" gap={3}>
            {/* 左侧：文件图标 */}
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'transparent',
                flexShrink: 0,
              }}
            >
              {getFileIcon(fileInfo.name, fileInfo.mime_type)}
            </Avatar>

            {/* 右侧：文件信息 */}
            <Box flex={1}>
              {/* 文件名和操作按钮 */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h5" component="h1">
                  {fileInfo.name}
                </Typography>
                <Box display="flex" gap={1}>
                  <Tooltip title={fileInfo.is_dir ? "文件夹不支持下载" : "下载"}>
                    <span>
                      <IconButton 
                        color="primary" 
                        size="small" 
                        onClick={handleFileDownload}
                        disabled={fileInfo.is_dir}
                      >
                        <Download />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <IconButton color="primary" size="small" title="分享">
                    <Share />
                  </IconButton>
                  <IconButton color="primary" size="small" title="编辑">
                    <Edit />
                  </IconButton>
                </Box>
              </Box>

              {/* 文件信息网格布局 */}
              <Grid container spacing={1.5}>
                <Grid size={12}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ minWidth: 'fit-content' }}>
                      路径：
                    </Typography>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => handlePathClick(getDirectoryPath(fileInfo.path, fileInfo.name))}
                      sx={{ 
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        color: 'primary.main',
                        wordBreak: 'break-all',
                        textAlign: 'left',
                        '&:hover': {
                          color: 'primary.dark'
                        }
                      }}
                    >
                      {(() => {
                        const dirPath = getDirectoryPath(fileInfo.path, fileInfo.name) || '/';
                        return dirPath === '/' ? '/' : dirPath + '/';
                      })()}
                    </Link>
                  </Box>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ minWidth: 'fit-content' }}>
                      大小：
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ wordBreak: 'break-all', flex: 1, minWidth: 0 }}>
                      {formatFileSize(fileInfo.size)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ minWidth: 'fit-content' }}>
                      创建时间：
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ wordBreak: 'break-all', flex: 1, minWidth: 0 }}>
                      {formatDate(fileInfo.created_at)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ minWidth: 'fit-content' }}>
                      修改时间：
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ wordBreak: 'break-all', flex: 1, minWidth: 0 }}>
                      {formatDate(fileInfo.modified_at)}
                    </Typography>
                  </Box>
                </Grid>

                {fileInfo.mime_type && (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" component="span" sx={{ minWidth: 'fit-content' }}>
                        类型：
                      </Typography>
                      <Chip label={fileInfo.mime_type} size="small" sx={{ height: 20, fontSize: '0.75rem' }} />
                    </Box>
                  </Grid>
                )}

                {fileInfo.hash && getAvailableHashTypes().length > 0 && (
                  <Grid size={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                        文件校验：
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                        {getAvailableHashTypes().length > 1 && (
                          <FormControl size="small" sx={{ minWidth: 70 }}>
                            <Select
                              value={selectedHashType}
                              onChange={(e) => setSelectedHashType(e.target.value)}
                              variant="outlined"
                              sx={{ height: 24, fontSize: '0.75rem' }}
                            >
                              {getAvailableHashTypes().map((type) => (
                                <MenuItem key={type} value={type} sx={{ fontSize: '0.75rem' }}>
                                  {type.toUpperCase()}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: 0.25 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              wordBreak: 'break-all',
                              flex: 1,
                              minWidth: 0,
                              lineHeight: 1.2
                            }}
                          >
                            {getSelectedHashValue()}
                          </Typography>
                          
                          {getSelectedHashValue() && (
                            <Tooltip title="复制校验值">
                              <IconButton 
                                size="small" 
                                onClick={() => copyToClipboard(getSelectedHashValue())}
                                sx={{ p: 0.25, ml: 0.25 }}
                              >
                                <ContentCopy sx={{ fontSize: '0.875rem' }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Box>
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
