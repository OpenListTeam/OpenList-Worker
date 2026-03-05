import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store';
import { Modal, Input, Typography, Spin, Tree } from 'antd';
import {
  FolderOutlined,
  HomeOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { fileApi } from '../posts/api';
import type { DataNode } from 'antd/es/tree';

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
  const authUser = useAuthStore(state => state.user);
  const [selectedPath, setSelectedPath] = useState<string>(currentPath);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 构建后端路径
  const buildBackendPath = (path: string) => {
    return path;
  };

  // 获取文件夹列表
  const fetchFolders = async (path: string): Promise<FolderInfo[]> => {
    try {
      const backendPath = buildBackendPath(path);
      const cleanBackendPath = backendPath === '/' ? '' : backendPath.replace(/\/$/, '');
      
      const username = authUser?.users_name;
      
      const response = await fileApi.getFileList(cleanBackendPath || '/', username, isPersonalFile);
      
      if (response && response.flag && response.data && response.data.fileList) {
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
      initializeTree();
    }
  }, [open]);

  // 将 TreeNode 转为 Antd Tree 的 DataNode
  const convertToAntdTreeData = (nodes: TreeNode[]): DataNode[] => {
    return nodes.map(node => ({
      key: node.id,
      title: node.name,
      icon: node.id === 'root' ? <HomeOutlined /> : <FolderOutlined />,
      children: node.children && node.children.length > 0
        ? convertToAntdTreeData(node.children)
        : [],
      isLeaf: node.loaded && (!node.children || node.children.length === 0),
    }));
  };

  const antdTreeData = useMemo(() => convertToAntdTreeData(treeData), [treeData]);

  // 查找节点
  const findNode = (nodes: TreeNode[], nodeId: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const found = findNode(node.children, nodeId);
        if (found) return found;
      }
    }
    return null;
  };

  // 异步加载子节点
  const onLoadData = (treeNode: any): Promise<void> => {
    const { key } = treeNode;
    const node = findNode(treeData, key as string);
    if (node && node.loaded) {
      return Promise.resolve();
    }
    return loadChildren(key as string, node?.path || '/').then(() => {});
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={() => {
        console.log('PathSelectDialog 确认按钮被点击');
        console.log('selectedPath:', selectedPath);
        console.log('调用 onConfirm...');
        onConfirm(selectedPath);
      }}
      title={title}
      width={640}
      okText="确认"
      cancelText="取消"
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        当前选择路径: {selectedPath}
      </Typography.Text>

      <div style={{ height: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 4, padding: 8 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin />
          </div>
        ) : (
          <Tree
            showIcon
            defaultExpandedKeys={['root']}
            treeData={antdTreeData}
            loadData={onLoadData}
            onSelect={(selectedKeys, info) => {
              if (selectedKeys.length > 0) {
                const nodeId = selectedKeys[0] as string;
                const node = findNode(treeData, nodeId);
                if (node) {
                  setSelectedPath(node.path);
                }
              }
            }}
            selectedKeys={[
              // 反向查找当前selectedPath对应的nodeId
              (() => {
                const find = (nodes: TreeNode[]): string => {
                  for (const n of nodes) {
                    if (n.path === selectedPath) return n.id;
                    if (n.children) {
                      const r = find(n.children);
                      if (r) return r;
                    }
                  }
                  return '';
                };
                return find(treeData);
              })()
            ].filter(Boolean)}
          />
        )}
      </div>
    </Modal>
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
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      title={title}
      width={480}
      okText="确认"
      cancelText="取消"
      okButtonProps={{ disabled: !name.trim() }}
    >
      <Input
        autoFocus
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={handleConfirm}
        style={{ marginTop: 8 }}
      />
    </Modal>
  );
};