import React, { useState, useRef } from 'react';
import { useApp } from './AppContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  Folder,
  InsertDriveFile,
  Delete,
  CheckCircle,
  Error,
  Cancel,
  Refresh,
  Warning,
} from '@mui/icons-material';

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
    
    const backendPath = buildBackendPath(targetPath);
    const cleanBackendPath = cleanPath(backendPath);
    const apiUrl = `/@files/upload/path${cleanBackendPath}`;

    const formData = new FormData();
    formData.append('files', item.file);

    try {
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'uploading' } : i
      ));

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok || !result.flag) {
        throw new Error(result.text || `上传失败: ${response.statusText}`);
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
    const backendPath = buildBackendPath(currentPath);
    const cleanBackendPath = cleanPath(backendPath);
    // target参数只包含文件夹名称，不包含完整路径
    const targetName = folderPath + '/';
    const apiUrl = `/@files/create/path${cleanBackendPath}?target=${encodeURIComponent(targetName)}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`创建文件夹失败: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.flag) {
        throw new Error(result.text || '创建文件夹失败');
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
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'uploading':
        return <CircularProgress size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'uploading':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={isUploading}
      onBackdropClick={(event) => {
        event.stopPropagation();
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUpload />
          文件上传
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box mb={2}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            当前路径: {currentPath}
          </Typography>
        </Box>

        <Box display="flex" gap={2} mb={3}>
          <Button
            variant="outlined"
            startIcon={<InsertDriveFile />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            添加文件
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Folder />}
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
          >
            添加目录
          </Button>
        </Box>

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
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              上传列表 ({uploadItems.length} 项)
            </Typography>
            
            <List>
              {uploadItems.map((item) => (
                <ListItem key={item.id}>
                  <ListItemIcon>
                    {item.type === 'folder' ? <Folder /> : <InsertDriveFile />}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.875rem' }}>
                          {item.name}
                        </span>
                        <Chip
                          label={item.status}
                          size="small"
                          color={getStatusColor(item.status) as any}
                        />
                      </span>
                    }
                    secondary={
                      <>
                        {item.size && (
                          <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                            {formatFileSize(item.size)}
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <LinearProgress 
                            variant="indeterminate" 
                            sx={{ mt: 1 }} 
                          />
                        )}
                        {item.error && (
                          <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                            <Tooltip title={item.error} arrow placement="top">
                              <Warning 
                                color="error" 
                                sx={{ 
                                  fontSize: '1rem', 
                                  cursor: 'pointer',
                                  '&:hover': { opacity: 0.7 }
                                }} 
                              />
                            </Tooltip>
                            <Typography 
                              variant="caption" 
                              color="error" 
                              sx={{ ml: 0.5, fontSize: '0.75rem' }}
                            >
                              上传失败
                            </Typography>
                          </Box>
                        )}
                      </>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Box display="flex" gap={1}>
                      {item.status === 'error' && (
                        <IconButton
                          size="small"
                          onClick={() => handleRetryItem(item.id)}
                          disabled={isUploading}
                          title="重试"
                        >
                          <Refresh />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isUploading}
                        title="删除"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          {/* 左侧：取消/关闭按钮 */}
          <Button 
            onClick={handleClose} 
            disabled={isUploading}
            variant={allItemsCompleted ? "contained" : "outlined"}
          >
            {isUploading ? '上传中...' : allItemsCompleted ? '关闭' : '取消'}
          </Button>

          {/* 右侧：其他操作按钮 */}
          <Box display="flex" gap={1}>
            {/* 清空已完成按钮 */}
            {hasSuccessItems && !isUploading && (
              <Button
                onClick={handleClearCompleted}
                variant="outlined"
                color="secondary"
              >
                清空已完成
              </Button>
            )}

            {/* 上传/重试按钮 */}
            {!allItemsCompleted && (
              <Button
                onClick={handleUpload}
                variant="contained"
                disabled={uploadItems.length === 0 || isUploading}
                startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUpload />}
              >
                {isUploading ? '上传中...' : '开始上传'}
              </Button>
            )}

            {/* 重试所有失败项按钮 */}
            {allItemsCompleted && hasFailedItems && !isUploading && (
              <Button
                onClick={handleUpload}
                variant="contained"
                color="warning"
                startIcon={<Refresh />}
              >
                重试所有
              </Button>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default FileUploadDialog;