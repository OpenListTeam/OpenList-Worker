import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Breadcrumbs,
  Link,
  CircularProgress,
  TreeView,
  TreeItem,
} from '@mui/material';
import {
  Folder,
  Home,
  NavigateNext,
  ExpandMore,
  ChevronRight,
  FolderOpen,
} from '@mui/icons-material';
import axios from 'axios';

interface PathSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (path: string) => void;
  title: string;
  currentPath: string;
  isPersonalFile: boolean;
}

interface NameInputDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  title: string;
  placeholder: string;
  defaultValue?: string;
}

interface FolderInfo {
  name: string;
  is_dir: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  path: string;
  children?: TreeNode[];
  loaded?: boolean;
}

// 路径选择对话框
export const PathSelectDialog: React.FC<PathSelectDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  currentPath,
  isPersonalFile,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>('/');
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 构建后端路径
  const buildBackendPath = (path: string) => {
    if (isPersonalFile) {
      return path === '/' ? '/personal' : `/personal${path}`;
    } else {
      return path;
    }
  };

  // 获取文件夹列表
  const fetchFolders = async (path: string) => {
    setLoading(true);
    try {
      const backendPath = buildBackendPath(path);
      const cleanBackendPath = backendPath === '/' ? '' : backendPath.replace(/\/$/, '');
      
      let apiUrl: string;
      if (cleanBackendPath === '' || cleanBackendPath === '/') {
        apiUrl = 'http://127.0.0.1:8787/@files/list/path/';
      } else {
        const pathWithSlash = cleanBackendPath.startsWith('/') ? cleanBackendPath : `/${cleanBackendPath}`;
        apiUrl = `http://127.0.0.1:8787/@files/list/path${pathWithSlash}/`;
      }

      const response = await axios.get(apiUrl);
      if (response.data && response.data.flag && response.data.data && response.data.data.fileList) {
        // 使用返回数据中的fileType字段进行过滤，fileType === 0 表示文件夹
        const folderList = response.data.data.fileList.filter((item: any) => item.fileType === 0);
        setFolders(folderList.map((item: any) => ({
          name: item.fileName,
          is_dir: true
        })));
      } else {
        setFolders([]);
      }
    } catch (error) {
      console.error('获取文件夹列表失败:', error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      // 默认从根目录开始
      setSelectedPath('/');
      fetchFolders('/');
    }
  }, [open]);

  const handleFolderClick = (folderName: string) => {
    const newPath = selectedPath === '/' ? `/${folderName}` : `${selectedPath}/${folderName}`;
    setSelectedPath(newPath);
    fetchFolders(newPath);
  };

  const handleBreadcrumbClick = (path: string) => {
    setSelectedPath(path);
    fetchFolders(path);
  };

  // 生成面包屑导航
  const generateBreadcrumbs = () => {
    const breadcrumbs = [];
    const pathParts = selectedPath.split('/').filter(part => part !== '');
    
    // 根目录
    breadcrumbs.push({ label: '根目录', path: '/' });
    
    // 子目录
    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      breadcrumbs.push({ label: part, path: currentPath });
    });
    
    return breadcrumbs;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            {generateBreadcrumbs().map((breadcrumb, index) => (
              <Link
                key={index}
                component="button"
                variant="body2"
                onClick={() => handleBreadcrumbClick(breadcrumb.path)}
                sx={{ textDecoration: 'none' }}
              >
                {index === 0 ? <Home fontSize="small" sx={{ mr: 0.5 }} /> : null}
                {breadcrumb.label}
              </Link>
            ))}
          </Breadcrumbs>
        </Box>

        <Box sx={{ height: 300, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {folders.map((folder, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton onClick={() => handleFolderClick(folder.name)}>
                    <ListItemIcon>
                      <Folder />
                    </ListItemIcon>
                    <ListItemText primary={folder.name} />
                  </ListItemButton>
                </ListItem>
              ))}
              {folders.length === 0 && !loading && (
                <ListItem>
                  <ListItemText primary="此目录下没有文件夹" />
                </ListItem>
              )}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={() => onConfirm(selectedPath)} variant="contained">
          确认
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// 名称输入对话框
export const NameInputDialog: React.FC<NameInputDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  placeholder,
  defaultValue = '',
}) => {
  const [name, setName] = useState(defaultValue);

  useEffect(() => {
    if (open) {
      setName(defaultValue);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={placeholder}
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!name.trim()}>
          确认
        </Button>
      </DialogActions>
    </Dialog>
  );
};