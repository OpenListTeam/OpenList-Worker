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
} from '@mui/material';
import {
  Folder,
  Home,
  NavigateNext,
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

// 路径选择对话框
export const PathSelectDialog: React.FC<PathSelectDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  currentPath,
  isPersonalFile,
}) => {
  const [selectedPath, setSelectedPath] = useState(currentPath || '/');
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 构建后端路径
  const buildBackendPath = (filePath: string): string => {
    if (isPersonalFile) {
      const username = 'admin'; // 这里应该从用户状态获取
      return `/@home/${username}${filePath}`;
    } else {
      return filePath;
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
      if (response.data && response.data.flag && response.data.data) {
        const folderList = response.data.data.filter((item: any) => item.is_dir);
        setFolders(folderList);
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
      setSelectedPath(currentPath);
      fetchFolders(currentPath);
    }
  }, [open, currentPath]);

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
    const pathParts = (selectedPath || '/').split('/').filter(part => part !== '');
    const breadcrumbs = [{ label: '根目录', path: '/' }];
    
    let currentPath = '';
    pathParts.forEach(part => {
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
          <Typography variant="subtitle2" gutterBottom>
            当前选择的路径:
          </Typography>
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