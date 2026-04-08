import React, { useState, useRef } from 'react';
import { useApp } from './AppContext';
import {
  Modal,
  Button,
  Typography,
  Progress,
  Spin,
  List,
  Tag,
  Divider,
  Tooltip,
  Space,
} from 'antd';
import {
  CloudUploadOutlined,
  FolderOutlined,
  FileOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';

interface UploadItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  file?: File;
  webkitRelativePath?: string;
}

interface FileUploadDialogProps {
  open: boolean;
  onClose: (hasSuccessfulUploads?: boolean) => void;
  currentPath: string;
  onUploadComplete: () => void;
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  open,
  onClose,
  currentPath,
  onUploadComplete,
}) => {
  const { state: appState } = useApp();
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadCompleted, setIsUploadCompleted] = useState(false);
  const [hasSuccessfulUploads, setHasSuccessfulUploads] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newItems: UploadItem[] = Array.from(files).map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      type: 'file',
      size: file.size,
      status: 'pending',
      progress: 0,
      file,
    }));

    setUploadItems(prev => [...prev, ...newItems]);
    event.target.value = '';
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // 处理文件夹结构
    const folderStructure = new Map<string, UploadItem[]>();
    
    Array.from(files).forEach((file, index) => {
      const relativePath = file.webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      if (pathParts.length > 1) {
        // 这是文件夹中的文件
        const folderPath = pathParts.slice(0, -1).join('/');
        
        if (!folderStructure.has(folderPath)) {
          folderStructure.set(folderPath, []);
        }
        
        folderStructure.get(folderPath)!.push({
          id: `folder-file-${Date.now()}-${index}`,
          name: file.name,
          type: 'file',
          size: file.size,
          status: 'pending',
          progress: 0,
          file,
          webkitRelativePath: relativePath,
        });
      }
    });

    // 创建文件夹项目
    const newItems: UploadItem[] = [];
    folderStructure.forEach((files, folderPath) => {
      newItems.push({
        id: `folder-${Date.now()}-${folderPath}`,
        name: folderPath,
        type: 'folder',
        status: 'pending',
        progress: 0,
      });
      newItems.push(...files);
    });

    setUploadItems(prev => [...prev, ...newItems]);
    event.target.value = '';
  };

  const removeItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const buildBackendPath = (filePath: string): string => {
    // 直接使用路径，不添加前缀
    return filePath;
  };

  const cleanPath = (path: string): string => {
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  };

  const uploadFile = async (item: UploadItem): Promise<void> => {
    if (!item.file) return;

    const targetPath = item.webkitRelativePath 
      ? `${currentPath}/${item.webkitRelativePath}`.replace(/\/+/g, '/')
      : `${currentPath}/${item.name}`.replace(/\/+/g, '/');
    
    const cleanTargetPath = cleanPath(targetPath);
    // 新版 API：PUT /api/fs/put，通过 File-Path 请求头传递目标路径
    const apiUrl = `/api/fs/put`;

    try {
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'uploading' } : i
      ));

      const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token
        : null;

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'File-Path': cleanTargetPath,
          'Content-Length': String(item.file.size),
          'Content-Type': item.file.type || 'application/octet-stream',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: item.file,
      });

      const result = await response.json();
      
      if (!response.ok || result.code !== 200) {
        throw new Error(result.message || `上传失败: ${response.statusText}`);
      }

      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'success', progress: 100 } : i
      ));
    } catch (error) {
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { 
          ...i, 
          status: 'error', 
          error: error instanceof Error ? error.message : '上传失败' 
        } : i
      ));
    }
  };

  const createFolder = async (folderPath: string): Promise<void> => {
    // 新版 API：POST /api/fs/mkdir，body 传递完整目标路径
    const fullFolderPath = cleanPath(`${currentPath}/${folderPath}`);
    const apiUrl = `/api/fs/mkdir`;

    const token = localStorage.getItem('auth-storage')
      ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token
      : null;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ path: fullFolderPath }),
      });

      if (!response.ok) {
        throw new Error(`创建文件夹失败: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.code !== 200) {
        throw new Error(result.message || '创建文件夹失败');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleUpload = async () => {
    if (uploadItems.length === 0) return;

    setIsUploading(true);
    let hasSuccess = false;

    try {
      // 如果所有项目都已完成，只重试失败的项目
      const itemsToProcess = allItemsCompleted 
        ? uploadItems.filter(item => item.status === 'error')
        : uploadItems.filter(item => item.status === 'pending' || item.status === 'error');

      // 首先创建所有文件夹
      const folders = itemsToProcess.filter(item => item.type === 'folder');
      for (const folder of folders) {
        try {
          setUploadItems(prev => prev.map(i => 
            i.id === folder.id ? { ...i, status: 'uploading' } : i
          ));
          
          await createFolder(folder.name);
          
          setUploadItems(prev => prev.map(i => 
            i.id === folder.id ? { ...i, status: 'success', progress: 100 } : i
          ));
          hasSuccess = true;
        } catch (error) {
          setUploadItems(prev => prev.map(i => 
            i.id === folder.id ? { 
              ...i, 
              status: 'error', 
              error: error instanceof Error ? error.message : '创建文件夹失败' 
            } : i
          ));
        }
      }

      // 然后上传所有文件
      const files = itemsToProcess.filter(item => item.type === 'file');
      for (const file of files) {
        try {
          await uploadFile(file);
          hasSuccess = true;
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }

      // 检查是否所有项目都已完成
      const allCompleted = uploadItems.every(item => 
        item.status === 'success' || item.status === 'error'
      );
      
      if (allCompleted) {
        setIsUploadCompleted(true);
      }
      
      if (hasSuccess) {
        onUploadComplete();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      // 检查是否有成功的上传
      const hasSuccessfulUploads = uploadItems.some(item => item.status === 'success');
      
      setUploadItems([]);
      setIsUploadCompleted(false);
      onClose(hasSuccessfulUploads);
    }
  };

  const handleRetryItem = async (itemId: string) => {
    const item = uploadItems.find(i => i.id === itemId);
    if (!item || isUploading) return;

    if (item.type === 'file') {
      await uploadFile(item);
    } else if (item.type === 'folder') {
      await createFolder(item);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (isUploading) return;
    setUploadItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleClearCompleted = () => {
    if (isUploading) return;
    setUploadItems(prev => prev.filter(item => item.status !== 'success'));
  };

  // 辅助函数
  const hasFailedItems = uploadItems.some(item => item.status === 'error');
  const hasSuccessItems = uploadItems.some(item => item.status === 'success');
  const allItemsCompleted = uploadItems.length > 0 && uploadItems.every(item => 
    item.status === 'success' || item.status === 'error'
  );
  const allItemsSuccess = uploadItems.length > 0 && uploadItems.every(item => 
    item.status === 'success'
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'uploading':
        return <Spin size="small" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'uploading':
        return 'processing';
      default:
        return 'default';
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <CloudUploadOutlined />
          <span>文件上传</span>
        </Space>
      }
      width={720}
      maskClosable={!isUploading}
      keyboard={!isUploading}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 左侧：取消/关闭按钮 */}
          <Button
            onClick={handleClose}
            disabled={isUploading}
            type={allItemsCompleted ? 'primary' : 'default'}
          >
            {isUploading ? '上传中...' : allItemsCompleted ? '关闭' : '取消'}
          </Button>

          {/* 右侧：其他操作按钮 */}
          <Space>
            {/* 清空已完成按钮 */}
            {hasSuccessItems && !isUploading && (
              <Button onClick={handleClearCompleted}>
                清空已完成
              </Button>
            )}

            {/* 上传/重试按钮 */}
            {!allItemsCompleted && (
              <Button
                type="primary"
                onClick={handleUpload}
                disabled={uploadItems.length === 0 || isUploading}
                icon={isUploading ? <Spin size="small" /> : <CloudUploadOutlined />}
              >
                {isUploading ? '上传中...' : '开始上传'}
              </Button>
            )}

            {/* 重试所有失败项按钮 */}
            {allItemsCompleted && hasFailedItems && !isUploading && (
              <Button
                type="primary"
                danger
                onClick={handleUpload}
                icon={<ReloadOutlined />}
              >
                重试所有
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">
          当前路径: {currentPath}
        </Typography.Text>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<FileOutlined />}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          添加文件
        </Button>

        <Button
          icon={<FolderOutlined />}
          onClick={() => folderInputRef.current?.click()}
          disabled={isUploading}
        >
          添加目录
        </Button>
      </Space>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: "" } as any)}
        style={{ display: 'none' }}
        onChange={handleFolderSelect}
      />

      {uploadItems.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Typography.Title level={5} style={{ marginBottom: 12 }}>
            上传列表 ({uploadItems.length} 项)
          </Typography.Title>

          <List
            dataSource={uploadItems}
            style={{ maxHeight: 400, overflow: 'auto' }}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={[
                  ...(item.status === 'error' ? [
                    <Tooltip title="重试" key="retry">
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => handleRetryItem(item.id)}
                        disabled={isUploading}
                      />
                    </Tooltip>
                  ] : []),
                  <Tooltip title="删除" key="delete">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={isUploading}
                    />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    item.type === 'folder'
                      ? <FolderOutlined style={{ fontSize: 20 }} />
                      : <FileOutlined style={{ fontSize: 20 }} />
                  }
                  title={
                    <Space size={8}>
                      <span style={{ fontSize: 14 }}>{item.name}</span>
                      <Tag color={getStatusColor(item.status)}>{item.status}</Tag>
                      {getStatusIcon(item.status)}
                    </Space>
                  }
                  description={
                    <>
                      {item.size != null && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {formatFileSize(item.size)}
                        </Typography.Text>
                      )}
                      {item.status === 'uploading' && (
                        <Progress
                          percent={item.progress}
                          size="small"
                          status="active"
                          style={{ marginTop: 4, marginBottom: 0 }}
                        />
                      )}
                      {item.error && (
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                          <Tooltip title={item.error}>
                            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 14, cursor: 'pointer' }} />
                          </Tooltip>
                          <Typography.Text type="danger" style={{ marginLeft: 4, fontSize: 12 }}>
                            上传失败
                          </Typography.Text>
                        </div>
                      )}
                    </>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}
    </Modal>
  );
};

export default FileUploadDialog;