import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
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
  Collapse,
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
import { fileApi } from '../posts/api';

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
  const { state: appState } = useApp();
  const [selectedPath, setSelectedPath] = useState<string>(currentPath);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<string[]>(['root']);
  const [loading, setLoading] = useState<boolean>(false);

  // 构建后端路径
  const buildBackendPath = (path: string) => {
    // 直接使用路径，不添加前缀
    return path;
  };

  // 获取文件夹列表
  const fetchFolders = async (path: string): Promise<FolderInfo[]> => {
    try {
      const backendPath = buildBackendPath(path);
      const cleanBackendPath = backendPath === '/' ? '' : backendPath.replace(/\/$/, '');
      
      // 获取当前用户名
      const username = appState.user?.username;
      
      // 使用fileApi.getFileList()，这样会经过响应拦截器处理
      const response = await fileApi.getFileList(cleanBackendPath || '/', username, isPersonalFile);
      
      if (response && response.flag && response.data && response.data.fileList) {
        // 使用返回数据中的fileType字段进行过滤，fileType === 0 表示文件夹
        const folderList = response.data.fileList.filter((item: any) => item.fileType === 0);
        return folderList.map((item: any) => ({
          name: item.fileName,
          is_dir: true
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error('获取文件夹列表失败:', error);
      return [];
    }
  };

  // 初始化树形数据
  const initializeTree = async () => {
    setLoading(true);
    try {
      const rootFolders = await fetchFolders('/');
      const rootNode: TreeNode = {
        id: 'root',
        name: '根目录',
        path: '/',
        children: rootFolders.map(folder => ({
          id: `/${folder.name}`,
          name: folder.name,
          path: `/${folder.name}`,
          children: [],
          loaded: false
        })),
        loaded: true
      };
      setTreeData([rootNode]);
    } catch (error) {
      console.error('初始化树形数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载子节点
  const loadChildren = async (nodeId: string, nodePath: string) => {
    const folders = await fetchFolders(nodePath);
    
    const updateNode = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            children: folders.map(folder => ({
              id: `${nodePath === '/' ? '' : nodePath}/${folder.name}`,
              name: folder.name,
              path: `${nodePath === '/' ? '' : nodePath}/${folder.name}`,
              children: [],
              loaded: false
            })),
            loaded: true
          };
        } else if (node.children) {
          return {
            ...node,
            children: updateNode(node.children)
          };
        }
        return node;
      });
    };

    setTreeData(prevData => updateNode(prevData));
  };

  useEffect(() => {
    if (open) {
      setSelectedPath('/');
      setExpanded(['root']);
      initializeTree();
    }
  }, [open]);

  const handleToggle = (nodeId: string) => {
    const isExpanded = expanded.includes(nodeId);
    
    // 查找节点的函数
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === nodeId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(treeData);
    
    if (isExpanded) {
      // 如果已展开，则折叠
      setExpanded(expanded.filter(id => id !== nodeId));
    } else {
      // 如果未展开，则展开
      setExpanded([...expanded, nodeId]);
      
      // 检查是否需要加载子节点数据
      if (node && !node.loaded) {
        loadChildren(nodeId, node.path);
      }
    }
  };

  const handleSelect = (nodeId: string, nodePath: string) => {
    setSelectedPath(nodePath);
  };

  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expanded.includes(node.id);
    const isSelected = selectedPath === node.path;
    
    return (
      <React.Fragment key={node.id}>
        <ListItem 
          disablePadding
          sx={{ 
            pl: level * 2,
            bgcolor: isSelected ? 'action.selected' : 'transparent'
          }}
        >
          <ListItemButton
            onClick={() => handleSelect(node.id, node.path)}
            sx={{ py: 0.5 }}
          >
            <ListItemIcon 
              sx={{ minWidth: 32, cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(node.id);
              }}
            >
              {node.id !== 'root' || (node.children && node.children.length > 0) ? (
                isExpanded ? <ExpandMore /> : <ChevronRight />
              ) : <ChevronRight />}
            </ListItemIcon>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {node.id === 'root' ? <Home /> : <Folder />}
            </ListItemIcon>
            <ListItemText 
              primary={node.name}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItemButton>
        </ListItem>
        {node.children && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {node.children.map(child => renderTreeNode(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          当前选择路径: {selectedPath}
        </Typography>

        <Box sx={{ height: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {treeData.map(node => renderTreeNode(node))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={() => {
          console.log('PathSelectDialog 确认按钮被点击');
          console.log('selectedPath:', selectedPath);
          console.log('调用 onConfirm...');
          onConfirm(selectedPath);
        }} variant="contained">
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