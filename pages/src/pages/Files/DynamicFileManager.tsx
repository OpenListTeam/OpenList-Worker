import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Snackbar,
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
import { PathSelectDialog, NameInputDialog } from '../../components/FileOperationDialogs';
import { FileInfo, PathInfo } from '../../types';
import axios from 'axios';

const DynamicFileManager: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pathInfo, setPathInfo] = useState<PathInfo | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('/');

  // 对话框状态
  const [pathSelectDialog, setPathSelectDialog] = useState({
    open: false,
    title: '',
    operation: '' as 'copy' | 'move' | '',
    selectedFile: null as any,
  });
  
  const [nameInputDialog, setNameInputDialog] = useState({
    open: false,
    title: '',
    placeholder: '',
    operation: '' as 'createFolder' | 'createFile' | '',
  });

  // 消息提示状态
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });

  // 检查是否为个人文件路径
  const isPersonalFile = (pathname: string): boolean => {
    return pathname.startsWith('/@pages/myfile');
  };

  // 从URL路径解析文件路径
  const parsePathFromUrl = (pathname: string): string => {
    // 个人文件路径: /@pages/myfile/sub/ -> /sub/
    if (pathname.startsWith('/@pages/myfile/')) {
      const filePath = pathname.substring(15); // 去掉 '/@pages/myfile/' 前缀
      return filePath || '/';
    }
    // 个人文件根路径: /@pages/myfile -> /
    if (pathname === '/@pages/myfile') {
      return '/';
    }
    // 公共文件路径: 直接使用路径（不再有/@pages/前缀）
    // 如果是根路径或其他路径，直接使用
    return pathname === '/' ? '/' : pathname;
  };

  // 构建后端API路径
  const buildBackendPath = (filePath: string, pathname: string): string => {
    // 模拟用户名，实际应该从用户上下文获取
    const username = 'testuser'; // TODO: 从用户上下文获取实际用户名
    
    if (isPersonalFile(pathname)) {
      // 个人文件需要添加 /@home/<username>/ 前缀
      const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
      return `/@home/${username}${cleanPath}`;
    } else {
      // 公共文件直接使用路径
      return filePath;
    }
  };

  // 获取文件列表 - 使用新的API格式
  const fetchFileList = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // 根据路径类型构建后端路径
      const backendPath = buildBackendPath(path, location.pathname);
      // 确保路径格式正确，去掉末尾的斜杠（除非是根路径）
      const cleanBackendPath = backendPath === '/' ? '' : backendPath.replace(/\/$/, '');
      // 构建API URL，确保路径正确分隔
      let apiUrl: string;
      if (cleanBackendPath === '' || cleanBackendPath === '/') {
        // 根路径情况
        apiUrl = `http://127.0.0.1:8787/@files/list/path`;
      } else {
        // 子路径情况，确保有正确的斜杠分隔
        const pathWithSlash = cleanBackendPath.startsWith('/') ? cleanBackendPath : `/${cleanBackendPath}`;
        apiUrl = `http://127.0.0.1:8787/@files/list/path${pathWithSlash}`;
      }
      
      console.log('API URL:', apiUrl, 'Original path:', path, 'Backend path:', backendPath, 'Clean path:', cleanBackendPath);
      
      const response = await axios.get(apiUrl);
      
      if (response.data && response.data.flag && response.data.data) {
        // 后端返回格式: { flag: true, text: "Success", data: { pageSize, filePath, fileList } }
        const apiData = response.data.data;
        const pathInfo: PathInfo = {
          pageSize: apiData.pageSize,
          filePath: apiData.filePath,
          fileList: apiData.fileList || []
        };
        setPathInfo(pathInfo);
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

  // 处理文件下载
  const handleFileDownload = async (fileOrName: any) => {
    // 如果传入的是对象，提取文件名；如果是字符串，直接使用
    const fileName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
    try {
      // 构建下载API路径
      const backendPath = buildBackendPath(currentPath, location.pathname);
      // 确保路径格式正确，去掉末尾的斜杠（除非是根路径）
      const cleanBackendPath = backendPath === '/' ? '' : backendPath.replace(/\/$/, '');
      // 构建下载API URL，确保路径正确分隔，避免双斜杠
      let downloadApiUrl: string;
      if (cleanBackendPath === '' || cleanBackendPath === '/') {
        // 根路径情况
        downloadApiUrl = `http://127.0.0.1:8787/@files/link/path/${fileName}`;
      } else {
        // 子路径情况，确保有正确的斜杠分隔，避免双斜杠
        const normalizedPath = cleanBackendPath.startsWith('/') ? cleanBackendPath : `/${cleanBackendPath}`;
        // 移除路径中的双斜杠
        const cleanPath = normalizedPath.replace(/\/+/g, '/');
        downloadApiUrl = `http://127.0.0.1:8787/@files/link/path${cleanPath}/${fileName}`;
      }
      
      console.log('下载API URL:', downloadApiUrl);
      
      const response = await axios.get(downloadApiUrl);
      
      if (response.data && response.data.flag && response.data.data && response.data.data.length > 0) {
        const downloadData = response.data.data[0];
        const directUrl = downloadData.direct;
        const headers = downloadData.header || {};
        
        if (directUrl) {
          // 检查header字段是否不为空
          const hasHeaders = headers && Object.keys(headers).length > 0;
          
          if (hasHeaders) {
            // 如果有header，使用fetch下载并保存到本地
            try {
              console.log('使用fetch下载，携带headers:', headers);
              
              const fetchResponse = await fetch(directUrl, {
                method: 'GET',
                headers: headers
              });
              
              if (!fetchResponse.ok) {
                throw new Error(`下载失败: ${fetchResponse.status} ${fetchResponse.statusText}`);
              }
              
              // 获取文件内容
              const blob = await fetchResponse.blob();
              
              // 创建下载链接并触发下载
              const downloadUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              // 清理URL对象
              window.URL.revokeObjectURL(downloadUrl);
              
              showMessage('文件下载成功');
            } catch (fetchError) {
              console.error('Fetch下载失败:', fetchError);
              setError('下载文件失败: ' + (fetchError as Error).message);
            }
          } else {
            // 如果没有header，按原来的方式跳转
            console.log('没有header，使用原方式下载');
            window.open(directUrl, '_blank');
          }
        } else {
          setError('获取下载链接失败');
        }
      } else {
        setError('获取下载链接失败');
      }
    } catch (err) {
      console.error('下载文件错误:', err);
      setError('下载文件失败，请检查网络连接');
    }
  };

  // 处理文件夹单击导航
  const handleFolderClick = (folderName: string) => {
    // 确保路径构建时避免双斜杠
    const cleanCurrentPath = currentPath.endsWith('/') && currentPath !== '/' ? currentPath.slice(0, -1) : currentPath;
    const newPath = cleanCurrentPath === '/' ? `/${folderName}` : `${cleanCurrentPath}/${folderName}`;
    const isPersonal = isPersonalFile(location.pathname);
    let targetPath: string;
    
    if (isPersonal) {
      // 个人文件路径
      targetPath = `/@pages/myfile${newPath}`;
    } else {
      // 公共文件路径 - 直接使用路径，不添加/@pages/前缀
      targetPath = newPath;
    }
    
    console.log('导航到:', targetPath, '新路径:', newPath, '当前路径:', currentPath, '清理后路径:', cleanCurrentPath);
    navigate(targetPath);
  };

  // 处理文件/文件夹单击
  const handleRowClick = (row: any) => {
    if (row.is_dir) {
      // 点击文件夹 - 导航到新路径
      handleFolderClick(row.name);
    } else {
      // 点击文件 - 下载文件
      handleFileDownload(row.name);
    }
  };

  // 显示消息
  const showMessage = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 处理文件删除
  const handleFileDelete = async (file: any) => {
    if (!window.confirm(`确定要删除 "${file.name}" 吗？`)) {
      return;
    }

    try {
      const backendPath = buildBackendPath(currentPath, file.name);
      const cleanBackendPath = cleanPath(backendPath);
      const deleteApiUrl = `${import.meta.env.VITE_API_BASE_URL}/@files/remove/path${cleanBackendPath}`;
      
      const response = await axios.delete(deleteApiUrl);
      
      if (response.data.flag) {
        showMessage('文件删除成功');
        fetchFileList(); // 刷新文件列表
      } else {
        showMessage('删除失败: ' + response.data.text, 'error');
      }
    } catch (error) {
      console.error('删除文件错误:', error);
      showMessage('删除文件失败，请检查网络连接', 'error');
    }
  };

  // 处理文件复制
  const handleFileCopy = (file: any) => {
    setPathSelectDialog({
      open: true,
      title: `复制 "${file.name}" 到`,
      onConfirm: handlePathSelectConfirm,
      operation: 'copy',
      sourceFile: file
    });
  };

  // 处理文件移动
  const handleFileMove = (file: any) => {
    setPathSelectDialog({
      open: true,
      title: `移动 "${file.name}" 到`,
      onConfirm: handlePathSelectConfirm,
      operation: 'move',
      sourceFile: file
    });
  };

  // 处理路径选择确认
  const handlePathSelectConfirm = async (targetPath: string) => {
    const { operation, sourceFile } = pathSelectDialog;
    if (!sourceFile) return;

    try {
      const sourcePath = buildBackendPath(currentPath, sourceFile.name);
      const cleanSourcePath = cleanPath(sourcePath);
      const cleanTargetPath = cleanPath(targetPath);
      
      const action = operation === 'copy' ? 'copy' : 'move';
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/@files/${action}/path${cleanSourcePath}?target=${encodeURIComponent(cleanTargetPath)}`;
      
      const response = await axios.post(apiUrl);
      
      if (response.data.flag) {
        showMessage(`文件${operation === 'copy' ? '复制' : '移动'}成功`);
        fetchFileList(); // 刷新文件列表
      } else {
        showMessage(`${operation === 'copy' ? '复制' : '移动'}失败: ` + response.data.text, 'error');
      }
    } catch (error) {
      console.error(`${operation === 'copy' ? '复制' : '移动'}文件错误:`, error);
      showMessage(`${operation === 'copy' ? '复制' : '移动'}文件失败，请检查网络连接`, 'error');
    }
    
    setPathSelectDialog({ open: false, title: '', onConfirm: () => {}, operation: '', sourceFile: null });
  };

  // 处理创建文件夹
  const handleCreateFolder = () => {
    setNameInputDialog({
      open: true,
      title: '创建文件夹',
      label: '文件夹名称',
      onConfirm: handleNameInputConfirm,
      type: 'folder'
    });
  };

  // 处理创建文件
  const handleCreateFile = () => {
    setNameInputDialog({
      open: true,
      title: '创建文件',
      label: '文件名称',
      onConfirm: handleNameInputConfirm,
      type: 'file'
    });
  };

  // 处理名称输入确认
  const handleNameInputConfirm = async (name: string) => {
    const { type } = nameInputDialog;
    
    try {
      const targetName = type === 'folder' ? `${name}/` : name;
      const targetPath = buildBackendPath(currentPath, targetName);
      const cleanTargetPath = cleanPath(targetPath);
      
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/@files/create/path${cleanTargetPath}?target=${encodeURIComponent(targetName)}`;
      
      const response = await axios.post(apiUrl);
      
      if (response.data.flag) {
        showMessage(`${type === 'folder' ? '文件夹' : '文件'}创建成功`);
        fetchFileList(); // 刷新文件列表
      } else {
        showMessage(`创建失败: ` + response.data.text, 'error');
      }
    } catch (error) {
      console.error(`创建${type === 'folder' ? '文件夹' : '文件'}错误:`, error);
      showMessage(`创建${type === 'folder' ? '文件夹' : '文件'}失败，请检查网络连接`, 'error');
    }
    
    setNameInputDialog({ open: false, title: '', label: '', onConfirm: () => {}, type: '' });
  };

  // 当路径改变时更新当前路径并获取文件列表
  useEffect(() => {
    const filePath = parsePathFromUrl(location.pathname);
    setCurrentPath(filePath);
    fetchFileList(filePath);
  }, [location.pathname]);

  // 格式化文件大小
  const formatFileSize = (size: string | number): string => {
    // 处理字符串格式的文件大小
    const numSize = typeof size === 'string' ? parseInt(size, 10) : size;
    if (numSize === 0 || isNaN(numSize)) return '-';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    let fileSize = numSize;
    
    while (fileSize >= 1024 && index < units.length - 1) {
      fileSize /= 1024;
      index++;
    }
    
    return `${fileSize.toFixed(1)} ${units[index]}`;
  };

  // 格式化时间
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      // 处理ISO字符串格式的时间
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN');
    } catch (error) {
      console.error('日期格式化错误:', error);
      return '-';
    }
  };

  // 生成面包屑导航
  const generateBreadcrumbs = () => {
    const pathParts = currentPath.split('/').filter(part => part);
    const isPersonal = isPersonalFile(location.pathname);
    
    const breadcrumbs = [
      {
        label: isPersonal ? '我的文件' : '公共目录',
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

  // 处理面包屑点击
  const handleBreadcrumbClick = (path: string) => {
    const isPersonal = isPersonalFile(location.pathname);
    let targetPath: string;
    
    if (isPersonal) {
      // 个人文件路径
      targetPath = path === '/' ? '/@pages/myfile' : `/@pages/myfile${path}`;
    } else {
      // 公共文件路径 - 直接使用路径
      targetPath = path;
    }
    
    navigate(targetPath);
  };

  // 处理文件夹双击
  const handleFolderDoubleClick = (folderName: string) => {
    // 确保路径构建时避免双斜杠
    const cleanCurrentPath = currentPath.endsWith('/') && currentPath !== '/' ? currentPath.slice(0, -1) : currentPath;
    const newPath = cleanCurrentPath === '/' ? `/${folderName}` : `${cleanCurrentPath}/${folderName}`;
    const isPersonal = isPersonalFile(location.pathname);
    let targetPath: string;
    
    if (isPersonal) {
      // 个人文件路径
      targetPath = `/@pages/myfile${newPath}`;
    } else {
      // 公共文件路径 - 直接使用路径
      targetPath = newPath;
    }
    
    navigate(targetPath);
  };

  // 刷新当前目录
  const handleRefresh = () => {
    fetchFileList(currentPath);
  };

  // 准备表格数据
  const prepareTableData = () => {
    if (!pathInfo?.fileList) return [];

    return pathInfo.fileList.map((file: FileInfo) => ({
      id: file.fileUUID || file.fileName, // 使用fileUUID作为唯一标识
      name: file.fileName,
      type: file.fileType === 0 ? '文件夹' : '文件',
      size: file.fileType === 0 ? '-' : formatFileSize(file.fileSize || 0),
      modified: formatDate(file.timeModify),
      icon: file.fileType === 0 ? <Folder color="primary" /> : <InsertDriveFile />,
      is_dir: file.fileType === 0
    }));
  };

  // 表格列定义
  const columns = [
    {
      id: 'icon',
      label: '',
      minWidth: 50,
      align: 'center' as const,
      format: (value: any) => value,
    },
    {
      id: 'name',
      label: '名称',
      minWidth: 200,
      format: (value: string) => value,
    },
    {
      id: 'type',
      label: '类型',
      minWidth: 100,
      format: (value: string) => value,
    },
    {
      id: 'size',
      label: '大小',
      minWidth: 100,
      align: 'right' as const,
      format: (value: string) => value,
    },
    {
      id: 'modified',
      label: '修改时间',
      minWidth: 180,
      format: (value: string) => value,
    },
  ];

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
        <Alert severity="error" action={
          <IconButton color="inherit" size="small" onClick={handleRefresh}>
            <Refresh />
          </IconButton>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  const breadcrumbs = generateBreadcrumbs();
  const tableData = prepareTableData();

  return (
    <Box p={3}>
      <Card>
        <CardContent>
          {/* 标题和工具栏 */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h1">
              公共目录
            </Typography>
            <Box>
              <Tooltip title="刷新">
                <IconButton onClick={handleRefresh}>
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="上传文件">
                <IconButton>
                  <Upload />
                </IconButton>
              </Tooltip>
              <Tooltip title="新建文件夹">
                <IconButton>
                  <CreateNewFolder />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* 面包屑导航 */}
          <Box mb={2}>
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
                    gap: 0.5,
                    textDecoration: 'none',
                    color: index === breadcrumbs.length - 1 ? 'text.primary' : 'primary.main',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {breadcrumb.icon}
                  {breadcrumb.label}
                </Link>
              ))}
            </Breadcrumbs>
          </Box>

          {/* 文件列表 */}
          <DataTable
            title="文件列表"
            columns={columns}
            data={tableData}
            actions={['download', 'copy', 'move', 'delete']}
            showCreateButtons={true}
            onRowClick={handleRowClick}
            onRowDoubleClick={(row) => {
              if (row.is_dir) {
                handleFolderDoubleClick(row.name);
              }
            }}
            onDownload={handleFileDownload}
            onDelete={handleFileDelete}
            onCopy={handleFileCopy}
            onMove={handleFileMove}
            onCreateFolder={handleCreateFolder}
            onCreateFile={handleCreateFile}
          />

          {/* 路径选择对话框 */}
          <PathSelectDialog
            open={pathSelectDialog.open}
            title={pathSelectDialog.title}
            currentPath={currentPath}
            isPersonalFile={isPersonalFile(location.pathname)}
            onConfirm={pathSelectDialog.onConfirm}
            onClose={() => setPathSelectDialog({ open: false, title: '', onConfirm: () => {}, operation: '', sourceFile: null })}
          />

          {/* 名称输入对话框 */}
          <NameInputDialog
            open={nameInputDialog.open}
            title={nameInputDialog.title}
            placeholder={nameInputDialog.label}
            onConfirm={nameInputDialog.onConfirm}
            onClose={() => setNameInputDialog({ open: false, title: '', label: '', onConfirm: () => {}, type: '' })}
          />

          {/* 消息提示 */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            message={snackbar.message}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default DynamicFileManager;