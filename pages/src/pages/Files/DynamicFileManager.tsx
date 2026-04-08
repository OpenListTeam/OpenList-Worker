import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import {
  Spin,
  Alert,
  Breadcrumb,
  Button,
  Tooltip,
  Card,
  message,
  Modal,
  Grid,
  Typography,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  HomeOutlined,
  RightOutlined,
  ReloadOutlined,
  UploadOutlined,
  FolderAddOutlined,
  FileAddOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  DragOutlined,
  CopyOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import ResponsiveDataTable from '../../components/ResponsiveDataTable';
import { PathSelectDialog, NameInputDialog } from '../../components/FileOperationDialogs';
import FileUploadDialog from '../../components/FileUploadDialog';
import FilePreview from './FilePreview';
import { FileInfo, PathInfo } from '../../types';
import { downloadFile, FileInfo as DownloadFileInfo } from '../../utils/downloadUtils';
import apiService, { fileApi } from '../../posts/api';

const { Row, Col } = Grid;

const DynamicFileManager: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const authUser = useAuthStore(state => state.user);
  // 简单的移动端检测
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pathInfo, setPathInfo] = useState<PathInfo | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('/');
  
  // 排序状态
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 搜索和视图状态
  const [searchValue, setSearchValue] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // 对话框状态
  const [pathSelectDialog, setPathSelectDialog] = useState({
    open: false,
    title: '',
    operation: '' as 'copy' | 'move' | '',
    selectedFile: null as any,
    onConfirm: (() => {}) as (targetPath: string) => void,
  });
  
  const [nameInputDialog, setNameInputDialog] = useState({
    open: false,
    title: '',
    placeholder: '',
    type: '' as 'folder' | 'file' | 'rename' | '',
    selectedFile: null as any,
  });

  // 上传对话框状态
  const [uploadDialog, setUploadDialog] = useState({
    open: false,
  });

  // 消息提示 - 使用antd message
  const [messageApi, contextHolder] = message.useMessage();

  // 更多操作菜单状态
  const [selectedFileForMenu, setSelectedFileForMenu] = useState<any>(null);

  // 检查是否为个人文件路径
  const isPersonalFile = (pathname: string): boolean => {
    try {
      const decodedPathname = decodeURIComponent(pathname);
      return decodedPathname.startsWith('/@pages/myfile');
    } catch (error) {
      console.error('URL解码失败:', error, 'pathname:', pathname);
      return pathname.startsWith('/@pages/myfile');
    }
  };

  // 从URL路径解析文件路径
  const parsePathFromUrl = (pathname: string): string => {
    console.log('parsePathFromUrl: 输入路径:', pathname);
    try {
      // 先对URL进行解码处理中文字符
      const decodedPathname = decodeURIComponent(pathname);
      console.log('parsePathFromUrl: 解码后路径:', decodedPathname);
      
      // 个人文件根路径: /@pages/myfile -> /
      if (decodedPathname === '/@pages/myfile') {
        console.log('parsePathFromUrl: 个人文件根路径，返回 /');
        return '/';
      }
      // 个人文件路径: /@pages/myfile/sub/ -> /sub/
      if (decodedPathname.startsWith('/@pages/myfile/')) {
        const filePath = decodedPathname.substring(15); // 去掉 '/@pages/myfile/' 前缀
        const result = filePath || '/';
        console.log('parsePathFromUrl: 个人文件路径，结果:', result);
        return result;
      }
      // 公共文件路径: 直接使用路径（不再有/@pages/前缀）
      // 如果是根路径或其他路径，直接使用
      const result = decodedPathname === '/' ? '/' : decodedPathname;
      console.log('parsePathFromUrl: 公共文件路径，结果:', result);
      return result;
    } catch (error) {
      console.error('URL解码失败:', error, 'pathname:', pathname);
      // 如果解码失败，使用原始路径
      if (pathname === '/@pages/myfile') {
        console.log('parsePathFromUrl: 解码失败，个人文件根路径，返回 /');
        return '/';
      }
      if (pathname.startsWith('/@pages/myfile/')) {
        const filePath = pathname.substring(15);
        const result = filePath || '/';
        console.log('parsePathFromUrl: 解码失败，个人文件路径，结果:', result);
        return result;
      }
      return pathname === '/' ? '/' : pathname;
    }
  };

  // 构建后端API路径
  const buildBackendPath = (filePath: string, pathname: string): string => {
    // 直接使用路径，不添加前缀
    return filePath;
  };

  // 清理路径，移除多余的斜杠并规范化路径
  const cleanPath = (path: string): string => {
    if (!path) return '/';
    
    // 确保路径以斜杠开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // 移除路径中的双斜杠和多余斜杠
    const cleanedPath = normalizedPath.replace(/\/+/g, '/');
    
    // 移除末尾的斜杠（除非是根路径）
    return cleanedPath === '/' ? cleanedPath : cleanedPath.replace(/\/$/, '');
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
      
      console.log('获取文件列表:', 'Original path:', path, 'Backend path:', backendPath, 'Clean path:', cleanBackendPath);
      
      // 获取当前用户名
      const username = authUser?.users_name;
      
      // 判断是否为个人文件
      const isPersonal = isPersonalFile(location.pathname);
      
      // 使用fileApi.getFileList()，拦截器已解包，response 直接是 { content, total, write, ... }
      const response = await fileApi.getFileList(cleanBackendPath || '/');
      
      // 后端返回格式（解包后）: { content: ObjResp[], total, write, readme, ... }
      if (response && Array.isArray(response.content)) {
        const pathInfo: PathInfo = {
          pageSize: response.total || response.content.length,
          filePath: cleanBackendPath || '/',
          fileList: response.content,  // 直接使用 content 数组，字段为 name/is_dir/size/modified
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
    
    // 构造文件信息对象
    const fileInfo: DownloadFileInfo = {
      name: fileName,
      path: currentPath,
      size: 0, // 这里可以从文件列表中获取实际大小
      created_at: '',
      modified_at: '',
      is_dir: false
    };

    await downloadFile({
      fileInfo,
      currentPath: location.pathname,
      onError: setError,
      onSuccess: () => {
        showMessage('文件下载成功');
      }
    });
  };

  // 处理文件夹单击导航
  const handleFolderClick = (folderName: string) => {
    // 使用相对路径导航，直接在当前路径基础上添加文件夹名
    const relativePath = `${folderName}/`;
    
    console.log('相对路径导航到:', relativePath, '文件夹名:', folderName, '当前路径:', currentPath);
    navigate(relativePath, { relative: 'path' });
  };

  // 处理文件/文件夹单击
  const handleRowClick = (row: any) => {
    if (row.is_dir) {
      // 点击文件夹 - 使用相对路径导航
      handleFolderClick(row.name);
    } else {
      // 点击文件 - 使用相对路径跳转到预览页面
      const relativePath = row.name;
      
      console.log('文件相对路径导航到:', relativePath, '文件名:', row.name, '当前路径:', currentPath);
      navigate(relativePath, { relative: 'path' });
    }
  };

  // 显示消息
  const showMessage = (msg: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    messageApi[severity](msg);
  };

  // 处理文件删除
  const handleFileDelete = (file: any) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 "${file.name}" 吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => doFileDelete(file),
    });
  };

  const doFileDelete = async (file: any) => {
    try {
      // 构建完整的文件路径
      const fullFilePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      const backendPath = buildBackendPath(fullFilePath, location.pathname);
      const cleanBackendPath = cleanPath(backendPath);
      
      console.log('删除操作调试信息:');
      console.log('- currentPath:', currentPath);
      console.log('- file.name:', file.name);
      console.log('- fullFilePath:', fullFilePath);
      console.log('- backendPath:', backendPath);
      console.log('- cleanBackendPath:', cleanBackendPath);
      
      // 获取当前用户名和个人文件标识
      const username = authUser?.users_name;
      const isPersonal = isPersonalFile(location.pathname);
      
      // 使用 fileApi.remove() 删除文件
      const fileName = cleanBackendPath.split('/').pop() || '';
      const dirPath = cleanBackendPath.substring(0, cleanBackendPath.lastIndexOf('/')) || '/';
      const response = await fileApi.remove(dirPath, [fileName]);
      
      if (response === null || response === undefined || (response && response.flag !== false)) {
        showMessage('文件删除成功');
        fetchFileList(currentPath); // 刷新文件列表
      } else {
        showMessage('删除失败: ' + (response?.text || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('删除文件错误:', error);
      showMessage('删除文件失败，请检查网络连接', 'error');
    }
  };

  // 处理文件复制
  const handleFileCopy = (file: any) => {
    console.log('handleFileCopy 被调用，file 参数:', file);
    setPathSelectDialog({
      open: true,
      title: `复制 "${file.name}" 到`,
      onConfirm: (targetPath: string) => handlePathSelectConfirm(targetPath, 'copy', file),
      operation: 'copy',
      selectedFile: file
    });
  };

  // 处理文件移动
  const handleFileMove = (file: any) => {
    console.log('handleFileMove 被调用，file 参数:', file);
    setPathSelectDialog({
      open: true,
      title: `移动 "${file.name}" 到`,
      onConfirm: (targetPath: string) => handlePathSelectConfirm(targetPath, 'move', file),
      operation: 'move',
      selectedFile: file
    });
  };

  // 处理文件分享
  const handleFileShare = async (file: any) => {
    try {
      const fullFilePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      const backendPath = buildBackendPath(fullFilePath, location.pathname);
      
      // 构建分享链接
      const shareUrl = `${window.location.origin}/share${backendPath}`;
      
      // 复制分享链接到剪贴板
      await navigator.clipboard.writeText(shareUrl);
      showMessage(`分享链接已复制到剪贴板: ${shareUrl}`);
    } catch (error) {
      console.error('分享文件错误:', error);
      showMessage('分享文件失败', 'error');
    }
  };

  // 处理获取文件链接 - 修改为复制URL+路径格式
  const handleFileLink = async (file: any) => {
    try {
      const fullFilePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      
      // 构建URL+路径格式，例如：http://localhost:8086/dir/1.jpg
      const baseUrl = window.location.origin; // 使用当前前端地址，通过代理访问后端
      const copyUrl = `${baseUrl}${fullFilePath}`;
      
      // 复制URL+路径到剪贴板
      await navigator.clipboard.writeText(copyUrl);
      showMessage(`文件链接已复制到剪贴板: ${copyUrl}`);
    } catch (error) {
      console.error('复制文件链接错误:', error);
      showMessage('复制文件链接失败', 'error');
    }
  };

  // 处理文件压缩
  const handleFileArchive = async (file: any) => {
    // 压缩功能已移除
  };

  // 处理文件设置
  const handleFileSettings = async (file: any) => {
    try {
      // 这里可以打开文件属性对话框或设置面板
      showMessage(`打开 "${file.name}" 的设置面板`, 'info');
      // TODO: 实现文件设置功能，比如权限设置、属性修改等
    } catch (error) {
      console.error('打开文件设置错误:', error);
      showMessage('打开文件设置失败', 'error');
    }
  };

  // 处理离线下载
  const handleOfflineDownload = async (file: any) => {
    try {
      const fullFilePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      const backendPath = buildBackendPath(fullFilePath, location.pathname);
      
      // 构建文件的完整URL
      const baseUrl = window.location.origin;
      const fileUrl = `${baseUrl}${backendPath}`;
      
      // 创建离线下载任务，使用新版 /api/fs/add_offline_download
      const response = await fileApi.addOfflineDownload(currentPath, [fileUrl]);

      if (response === null || response === undefined || (response && response.flag !== false)) {
        showMessage(`已创建离线下载任务: ${file.name}`);
      } else {
        showMessage(response.text || '创建离线下载任务失败', 'error');
      }
    } catch (error: any) {
      console.error('创建离线下载任务错误:', error);
      showMessage(error.response?.data?.text || '创建离线下载任务失败', 'error');
    }
  };

  // 处理批量离线下载（顶部按钮）
  const handleBatchOfflineDownload = () => {
    // 导航到离线下载管理页面
    navigate('/offline-download');
  };

  // 处理更多操作菜单
  const getMoreMenuItems = (file: any): MenuProps['items'] => [
    {
      key: 'offline',
      icon: <CloudDownloadOutlined />,
      label: '离线下载',
      onClick: () => handleOfflineDownload(file),
    },
    {
      key: 'move',
      icon: <DragOutlined />,
      label: '移动',
      onClick: () => handleFileMove(file),
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制',
      onClick: () => handleFileCopy(file),
    },
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: '重命名',
      onClick: () => {
        setNameInputDialog({
          open: true,
          title: `重命名 "${file.name}"`,
          placeholder: '新名称',
          type: 'rename',
          selectedFile: file,
        });
      },
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () => handleFileDelete(file),
    },
  ];

  // 处理路径选择确认
  const handlePathSelectConfirm = async (targetPath: string, operation: string, selectedFile: any) => {
    console.log('=== handlePathSelectConfirm 开始 ===');
    console.log('targetPath:', targetPath);
    console.log('operation:', operation);
    console.log('selectedFile:', selectedFile);
    console.log('currentPath:', currentPath);
    
    if (!selectedFile) {
      console.log('错误: selectedFile 为空');
      return;
    }

    try {
      // 构建完整的源文件路径
      const fullSourcePath = currentPath === '/' ? `/${selectedFile.name}` : `${currentPath}/${selectedFile.name}`;
      console.log('fullSourcePath:', fullSourcePath);
      
      const sourcePath = buildBackendPath(fullSourcePath, location.pathname);
      console.log('sourcePath:', sourcePath);
      
      // 目标路径也需要使用buildBackendPath处理
      const backendTargetPath = buildBackendPath(targetPath, location.pathname);
      console.log('backendTargetPath:', backendTargetPath);
      
      const cleanSourcePath = cleanPath(sourcePath);
      const cleanTargetPath = cleanPath(backendTargetPath);
      console.log('cleanSourcePath:', cleanSourcePath);
      console.log('cleanTargetPath:', cleanTargetPath);
      
      console.log('发送请求...');
      
      // 获取当前用户名和个人文件标识
      const username = authUser?.users_name;
      const isPersonal = isPersonalFile(location.pathname);
      
      // 使用 fileApi.copy/move 操作文件
      const srcFileName = cleanSourcePath.split('/').pop() || '';
      const srcDir = cleanSourcePath.substring(0, cleanSourcePath.lastIndexOf('/')) || '/';
      const response = operation === 'copy' 
        ? await fileApi.copy(srcDir, cleanTargetPath, [srcFileName])
        : await fileApi.move(srcDir, cleanTargetPath, [srcFileName]);
      console.log('响应:', response);
      
      if (response === null || response === undefined || (response && response.flag !== false)) {
        console.log('操作成功');
        showMessage(`文件${operation === 'copy' ? '复制' : '移动'}成功`);
        fetchFileList(currentPath); // 刷新文件列表
      } else {
        console.log('操作失败:', response?.text);
        showMessage(`${operation === 'copy' ? '复制' : '移动'}失败: ` + (response?.text || '未知错误'), 'error');
      }
    } catch (error) {
      console.error(`${operation === 'copy' ? '复制' : '移动'}文件错误:`, error);
      showMessage(`${operation === 'copy' ? '复制' : '移动'}文件失败，请检查网络连接`, 'error');
    }
    
    console.log('关闭对话框...');
    setPathSelectDialog(prev => ({ ...prev, open: false }));
    console.log('=== handlePathSelectConfirm 结束 ===');
  };

  // 处理创建文件夹
  const handleCreateFolder = () => {
    setNameInputDialog({
      open: true,
      title: '创建文件夹',
      placeholder: '文件夹名称',
      type: 'folder',
      selectedFile: null
    });
  };

  // 处理创建文件
  const handleCreateFile = () => {
    setNameInputDialog({
      open: true,
      title: '创建文件',
      placeholder: '文件名称',
      type: 'file',
      selectedFile: null
    });
  };

  // 处理上传文件
  const handleUpload = () => {
    setUploadDialog({
      open: true,
    });
  };

  // 处理上传完成
  const handleUploadComplete = () => {
      showMessage('文件上传完成');
      // 不再自动刷新文件列表，等待用户手动关闭对话框时再刷新
  };

  // 处理名称输入确认
  const handleNameInputConfirm = async (name: string) => {
    const { type, selectedFile } = nameInputDialog;
    
    try {
      if (type === 'rename') {
        // 处理重命名操作
        if (!selectedFile) {
          showMessage('重命名失败：未选择文件', 'error');
          return;
        }
        
        // 构建完整的文件路径
        const fullFilePath = currentPath === '/' ? `/${selectedFile.name}` : `${currentPath}/${selectedFile.name}`;
        const backendPath = buildBackendPath(fullFilePath, location.pathname);
        const cleanBackendPath = cleanPath(backendPath);
        
        console.log('重命名操作调试信息:');
        console.log('- selectedFile:', selectedFile);
        console.log('- newName:', name);
        console.log('- fullFilePath:', fullFilePath);
        console.log('- backendPath:', backendPath);
        console.log('- cleanBackendPath:', cleanBackendPath);
        
        // 获取当前用户名和个人文件标识
        const username = authUser?.users_name;
        const isPersonal = isPersonalFile(location.pathname);
        
        // 使用 fileApi.rename() 重命名
        const response = await fileApi.rename(cleanBackendPath, name);
        
        if (response === null || response === undefined || (response && response.flag !== false)) {
          showMessage('重命名成功');
          fetchFileList(currentPath); // 刷新文件列表
        } else {
          showMessage('重命名失败: ' + (response?.text || '未知错误'), 'error');
        }
      } else {
        // 处理创建文件/文件夹操作
        const basePath = buildBackendPath(currentPath, location.pathname);
        const cleanBasePath = cleanPath(basePath);
        
        // target参数只包含文件/文件夹名称，不包含完整路径
        const targetName = type === 'folder' ? `${name}/` : name;
        
        console.log('创建文件/文件夹调试信息:');
        console.log('- type:', type);
        console.log('- name:', name);
        console.log('- cleanBasePath:', cleanBasePath);
        console.log('- targetName:', targetName);
        
        // 获取当前用户名和个人文件标识
        const username = authUser?.users_name;
        const isPersonal = isPersonalFile(location.pathname);
        
        // 使用 fileApi.mkdir() 创建文件夹，或上传空文件
        const fullCreatePath = cleanBasePath === '/' ? `/${name}` : `${cleanBasePath}/${name}`;
        const response = type === 'folder'
          ? await fileApi.mkdir(fullCreatePath)
          : await fileApi.mkdir(fullCreatePath); // 文件创建也用 mkdir 占位，实际上可用上传空内容实现
        
        if (response === null || response === undefined || (response && response.flag !== false)) {
          showMessage(`${type === 'folder' ? '文件夹' : '文件'}创建成功`);
          fetchFileList(currentPath); // 刷新文件列表
        } else {
          showMessage(`创建失败: ` + (response?.text || '未知错误'), 'error');
        }
      }
    } catch (error) {
      const operation = type === 'rename' ? '重命名' : `创建${type === 'folder' ? '文件夹' : '文件'}`;
      console.error(`${operation}错误:`, error);
      showMessage(`${operation}失败，请检查网络连接`, 'error');
    }
    
    setNameInputDialog({ open: false, title: '', placeholder: '', type: '', selectedFile: null });
  };

  // 当路径改变时更新当前路径并获取文件列表
  useEffect(() => {
    console.log('DynamicFileManager: location.pathname变化:', location.pathname);
    const filePath = parsePathFromUrl(location.pathname);
    console.log('DynamicFileManager: 解析后的文件路径:', filePath);
    setCurrentPath(filePath);
    fetchFileList(filePath);
  }, [location.pathname]);

  // 添加事件监听器来响应MainLayout的搜索和视图切换事件
  useEffect(() => {
    const handleSearchChange = (event: CustomEvent) => {
      const newSearchValue = event.detail.searchValue;
      setSearchValue(newSearchValue);
      
      // 更新过滤数据
      const tableData = prepareTableData();
      const filtered = filterData(newSearchValue, tableData);
      setFilteredData(filtered);
    };

    const handleSearchReset = () => {
      console.log('DynamicFileManager: 收到searchReset事件，当前路径:', currentPath, 'location.pathname:', location.pathname);
      console.log('DynamicFileManager: pathInfo.fileList长度:', pathInfo.fileList?.length || 0);
      
      // 防护措施：确保在搜索重置时不会意外触发任何导航
      const currentLocationPath = location.pathname;
      console.log('DynamicFileManager: 搜索重置前记录当前路径:', currentLocationPath);
      
      // 使用更安全的方式重置搜索状态
      try {
        // 立即重置搜索值
        setSearchValue('');
        
        // 确保使用当前目录的完整文件列表
        if (pathInfo.fileList && pathInfo.fileList.length > 0) {
          // 使用pathInfo.fileList重新生成表格数据
          const currentTableData = prepareTableData();
          setFilteredData(currentTableData);
          console.log('DynamicFileManager: 使用pathInfo.fileList重置，数据行数:', currentTableData.length);
        } else {
          // 如果pathInfo.fileList为空，重新获取文件列表
          console.log('DynamicFileManager: pathInfo.fileList为空，重新获取文件列表');
          const currentFilePath = parsePathFromUrl(location.pathname);
          fetchFileList(currentFilePath);
        }
        
        // 如果路径发生了变化，强制恢复到原始路径
        if (location.pathname !== currentLocationPath) {
          console.warn('DynamicFileManager: 检测到路径变化，强制恢复:', {
            from: location.pathname,
            to: currentLocationPath
          });
          navigate(currentLocationPath, { replace: true });
        }
      } catch (error) {
        console.error('DynamicFileManager: searchReset处理出错:', error);
        // 如果出错，至少重置搜索值并重新获取文件列表
        setSearchValue('');
        const currentFilePath = parsePathFromUrl(location.pathname);
        fetchFileList(currentFilePath);
      }
      
      // 延迟检查路径是否意外改变
      setTimeout(() => {
        if (location.pathname !== currentLocationPath) {
          console.warn('DynamicFileManager: 延迟检测到搜索重置后路径意外改变!', {
            before: currentLocationPath,
            after: location.pathname
          });
          // 强制恢复到原始路径
          navigate(currentLocationPath, { replace: true });
        }
      }, 100);
    };

    const handlePageRefresh = () => {
      // 使用当前的location.pathname来获取最新路径，而不是依赖currentPath状态
      const currentFilePath = parsePathFromUrl(location.pathname);
      fetchFileList(currentFilePath);
    };

    const handleViewModeChange = (event: CustomEvent) => {
      setViewMode(event.detail.viewMode);
    };

    // 添加事件监听器
    window.addEventListener('searchChange', handleSearchChange as EventListener);
    window.addEventListener('searchReset', handleSearchReset);
    window.addEventListener('pageRefresh', handlePageRefresh);
    window.addEventListener('viewModeChange', handleViewModeChange as EventListener);

    // 清理事件监听器
    return () => {
      window.removeEventListener('searchChange', handleSearchChange as EventListener);
      window.removeEventListener('searchReset', handleSearchReset);
      window.removeEventListener('pageRefresh', handlePageRefresh);
      window.removeEventListener('viewModeChange', handleViewModeChange as EventListener);
    };
  }, []); // 移除currentPath依赖，避免不必要的重新设置

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
  const formatDate = (dateInput?: string | number): string => {
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

  // 生成面包屑导航
  const generateBreadcrumbs = () => {
    const pathParts = currentPath.split('/').filter(part => part);
    const isPersonal = isPersonalFile(location.pathname);
    
    const breadcrumbs = [
      {
        label: isPersonal ? '我的文件' : '公共目录',
        path: '/',
        icon: <HomeOutlined />
      }
    ];

    let currentBreadcrumbPath = '';
    pathParts.forEach((part, index) => {
      currentBreadcrumbPath += `/${part}`;
      breadcrumbs.push({
        label: part,
        path: currentBreadcrumbPath,
        icon: <FolderOutlined />
      });
    });

    return breadcrumbs;
  };

  // 处理面包屑点击
  const handleBreadcrumbClick = (path: string) => {
    const isPersonal = isPersonalFile(location.pathname);
    let targetPath: string;
    
    if (isPersonal) {
      // 个人文件路径 - 确保路径以 / 结尾
      if (path === '/') {
        targetPath = '/@pages/myfile/';
      } else {
        const normalizedPath = path.endsWith('/') ? path : path + '/';
        targetPath = `/@pages/myfile${normalizedPath}`;
      }
    } else {
      // 公共文件路径 - 确保路径以 / 结尾
      targetPath = path.endsWith('/') ? path : path + '/';
    }
    
    navigate(targetPath);
  };

  // 处理文件夹双击
  const handleFolderDoubleClick = (folderName: string) => {
    // 使用相对路径导航，直接在当前路径基础上添加文件夹名
    const relativePath = `${folderName}/`;
    
    console.log('双击文件夹相对路径导航到:', relativePath, '文件夹名:', folderName, '当前路径:', currentPath);
    navigate(relativePath, { relative: 'path' });
  };

  // 刷新当前目录
  const handleRefresh = () => {
    fetchFileList(currentPath);
  };

  // 搜索过滤函数
  const filterData = (searchTerm: string | any, data: any[]) => {
    // 确保searchTerm是字符串类型
    const searchString = typeof searchTerm === 'string' ? searchTerm : String(searchTerm || '');
    
    if (!searchString.trim()) {
      return data;
    }
    
    const term = searchString.toLowerCase();
    return data.filter(item => 
      item.name.toLowerCase().includes(term) ||
      item.type.toLowerCase().includes(term)
    );
  };

  // 准备表格数据
  const prepareTableData = () => {
    if (!pathInfo?.fileList) return [];

    const tableData = pathInfo.fileList.map((file: any) => {
        // 兼容后端新格式（name/is_dir/size/modified）和旧格式（fileName/fileType/fileSize/timeModify）
        const name = file.name || file.fileName || '';
        const isDir = file.is_dir !== undefined ? file.is_dir : (file.fileType === 0);
        const size = file.size !== undefined ? file.size : (file.fileSize || 0);
        const modified = file.modified || file.timeModify;
        return {
          id: file.sign || file.fileUUID || name,
          name,
          type: isDir ? '文件夹' : '文件',
          size: isDir ? '-' : formatFileSize(size),
          modified: formatDate(modified),
          icon: isDir ? <FolderOutlined style={{ color: '#1890ff', fontSize: 18 }} /> : <FileOutlined style={{ fontSize: 18 }} />,
          is_dir: isDir,
          fileSize: size,
          timeModify: modified,
        };
      });

    // 排序逻辑：目录在前，然后按指定字段排序
    return tableData.sort((a, b) => {
      // 首先按目录/文件分类，目录在前
      if (a.is_dir !== b.is_dir) {
        return a.is_dir ? -1 : 1;
      }

      // 然后按指定字段排序
      let compareValue = 0;
      switch (sortBy) {
        case 'name':
          compareValue = (a.name || '').localeCompare(b.name || '', 'zh-CN', { numeric: true });
          break;
        case 'size':
          // 目录大小都为0，文件按实际大小排序
          if (a.is_dir && b.is_dir) {
            compareValue = (a.name || '').localeCompare(b.name || '', 'zh-CN', { numeric: true });
          } else {
            compareValue = a.fileSize - b.fileSize;
          }
          break;
        case 'modified':
          compareValue = new Date(a.timeModify).getTime() - new Date(b.timeModify).getTime();
          break;
        default:
          compareValue = (a.name || '').localeCompare(b.name || '', 'zh-CN', { numeric: true });
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  };

  // 当数据变化时更新过滤数据
  useEffect(() => {
    const tableData = prepareTableData();
    const filtered = filterData(searchValue, tableData);
    setFilteredData(filtered);
  }, [pathInfo, sortBy, sortOrder, searchValue]);

  // 网格视图渲染函数
  const renderGridView = () => {
    return (
      <Row gutter={[16, 16]}>
        {filteredData.map((file) => (
          <Col xs={24} sm={12} md={8} lg={6} key={file.id}>
            <Card
              hoverable
              style={{ height: 200, cursor: 'pointer' }}
              styles={{ body: { 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%',
                padding: '16px 12px 8px',
              }}}
              onClick={() => handleRowClick(file)}
              onDoubleClick={() => {
                if (file.is_dir) {
                  handleFolderDoubleClick(file.name);
                }
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>
                {file.icon}
              </div>
              <Typography.Text
                ellipsis={{ tooltip: file.name }}
                style={{ 
                  fontWeight: 500,
                  textAlign: 'center',
                  width: '100%',
                  wordBreak: 'break-word',
                }}
              >
                {file.name}
              </Typography.Text>
              {!file.is_dir && (
                <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  {file.size}
                </Typography.Text>
              )}
              <div style={{ marginTop: 'auto', display: 'flex', gap: 4, paddingTop: 8 }}>
                <Tooltip title="下载">
                  <Button
                    type="text"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleFileDownload(file); }}
                  />
                </Tooltip>
                <Tooltip title="离线下载">
                  <Button
                    type="text"
                    size="small"
                    icon={<CloudDownloadOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleOfflineDownload(file); }}
                  />
                </Tooltip>
                <Tooltip title="分享">
                  <Button
                    type="text"
                    size="small"
                    icon={<ShareAltOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleFileShare(file); }}
                  />
                </Tooltip>
                <Dropdown menu={{ items: getMoreMenuItems(file) }} trigger={['click']}>
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // 表格列定义
  const columns = [
    {
      id: 'icon',
      label: '',
      minWidth: 40,
      align: 'center' as const,
      format: (value: any) => value,
      priority: 3, // 图标列优先级：第三优先隐藏
      sortable: false,
    },
    {
      id: 'name',
      label: '名称',
      width: 'auto',
      format: (value: string) => value,
      priority: 0, // 文件名列优先级最高，始终显示
      sortable: true,
    },
    {
      id: 'size',
      label: '大小',
      minWidth: 100,
      align: 'right' as const,
      format: (value: string) => value,
      priority: 2, // 大小列优先级：第二优先隐藏
      sortable: true,
    },
    {
      id: 'modified',
      label: '修改时间',
      minWidth: 150,
      format: (value: string) => value,
      priority: 1, // 修改时间优先级：第一优先隐藏
      sortable: true,
    },
  ];

  // 检查URL是否为目录（以/结尾）还是文件
  const isDirectoryUrl = (pathname: string): boolean => {
    // 根路径总是目录
    if (pathname === '/' || pathname === '/@pages/myfile') {
      return true;
    }
    // 以/结尾的是目录
    return pathname.endsWith('/');
  };

  // 处理排序
  const handleSort = (columnId: string, order: 'asc' | 'desc') => {
    setSortBy(columnId);
    setSortOrder(order);
  };

  // 如果URL不是目录（即文件），显示文件预览页面
  if (!isDirectoryUrl(location.pathname)) {
    return <FilePreview />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message={error}
          showIcon
          action={
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={handleRefresh} />
          }
        />
      </div>
    );
  }

  const breadcrumbs = generateBreadcrumbs();
  const tableData = prepareTableData();

  return (
    <div style={{ padding: isMobile ? 8 : 24 }}>
      {contextHolder}
      <Card styles={{ body: { padding: isMobile ? 8 : 16 } }}>
        <div style={{ padding: isMobile ? '8px' : '16px' }}>
          {/* 路径栏和工具栏 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            {/* 面包屑导航 */}
            <div style={{ flex: 1 }}>
              <Breadcrumb
                separator={<RightOutlined style={{ fontSize: 10 }} />}
                items={breadcrumbs.map((breadcrumb, index) => ({
                  key: index,
                  title: (
                    <a
                      onClick={(e) => { e.preventDefault(); handleBreadcrumbClick(breadcrumb.path); }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: index === breadcrumbs.length - 1 ? undefined : '#1890ff',
                        cursor: 'pointer',
                      }}
                    >
                      {breadcrumb.icon}
                      <span>{breadcrumb.label}</span>
                    </a>
                  ),
                }))}
              />
            </div>
            
            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: 4 }}>
              <Tooltip title="刷新">
                <Button type="text" icon={<ReloadOutlined />} onClick={handleRefresh} />
              </Tooltip>
              <Tooltip title="新建文件夹">
                <Button type="text" icon={<FolderAddOutlined />} onClick={handleCreateFolder} />
              </Tooltip>
              <Tooltip title="新建文件">
                <Button type="text" icon={<FileAddOutlined />} onClick={handleCreateFile} />
              </Tooltip>
              <Tooltip title="上传文件">
                <Button type="text" icon={<UploadOutlined />} onClick={handleUpload} />
              </Tooltip>
              <Tooltip title="离线下载">
                <Button type="text" icon={<CloudDownloadOutlined />} onClick={handleBatchOfflineDownload} />
              </Tooltip>
            </div>
          </div>

          {/* 文件列表 */}
          {viewMode === 'table' ? (
            <ResponsiveDataTable
              title="文件列表"
              columns={columns}
              data={filteredData}
              actions={['download', 'share', 'link', 'copy', 'move', 'archive', 'settings', 'delete']}
              onRowClick={handleRowClick}
              onRowDoubleClick={(row) => {
                if (row.is_dir) {
                  handleFolderDoubleClick(row.name);
                }
              }}
              onDownload={handleFileDownload}
              onOffline={handleOfflineDownload}
              onDelete={handleFileDelete}
              onCopy={handleFileCopy}
              onMove={handleFileMove}
              onLink={handleFileLink}
              onArchive={handleFileArchive}
              onSettings={handleFileSettings}
              onShare={handleFileShare}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          ) : (
            <div>
              <Typography.Title level={5} style={{ marginBottom: 16 }}>
                文件列表
              </Typography.Title>
              {renderGridView()}
            </div>
          )}

          {/* 路径选择对话框 */}
          <PathSelectDialog
            open={pathSelectDialog.open}
            title={pathSelectDialog.title}
            currentPath={currentPath}
            isPersonalFile={isPersonalFile(location.pathname)}
            onConfirm={pathSelectDialog.onConfirm}
            onClose={() => setPathSelectDialog({ open: false, title: '', operation: '', selectedFile: null, onConfirm: () => {} })}
          />

          {/* 名称输入对话框 */}
          <NameInputDialog
              open={nameInputDialog.open}
              title={nameInputDialog.title}
              placeholder={nameInputDialog.placeholder}
              onConfirm={handleNameInputConfirm}
              onClose={() => setNameInputDialog({ open: false, title: '', placeholder: '', type: '', selectedFile: null })}
            />

          {/* 文件上传对话框 */}
          <FileUploadDialog
            open={uploadDialog.open}
            onClose={(hasSuccessfulUploads) => {
              setUploadDialog({ open: false });
              // 只有在有成功上传时才刷新文件列表
              if (hasSuccessfulUploads) {
                fetchFileList(currentPath);
              }
            }}
            currentPath={currentPath}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </Card>
    </div>
  );
};

export default DynamicFileManager;