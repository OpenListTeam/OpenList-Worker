/**
 * 文件管理器 — 核心页面
 * 支持文件浏览、上传、下载、复制、移动、删除、重命名、分享、加密、压缩
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Button, Space, Breadcrumb, Dropdown, Modal, Input, Upload, message,
  Typography, Tooltip, Empty, Skeleton, Select, InputNumber, Form, Tree, Spin,
} from 'antd';
import {
  FolderOutlined, FileOutlined, UploadOutlined, FolderAddOutlined,
  DownloadOutlined, DeleteOutlined, EditOutlined, CopyOutlined,
  ScissorOutlined, ShareAltOutlined, LockOutlined, FileZipOutlined,
  ReloadOutlined, HomeOutlined, MoreOutlined, EyeOutlined,
  AppstoreOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../posts/api';
import { useAuthStore } from '../../store';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;
const { confirm } = Modal;

interface FileItem {
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: number;
  fileUUID?: string;
  fileHash?: { md5?: string; sha1?: string; sha256?: string };
  thumbnails?: string;
  timeModify?: string;
  timeCreate?: string;
}

// 右键菜单位置
interface ContextMenuPos {
  x: number;
  y: number;
  record: FileItem;
}

const FileManager: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore(state => state.user);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // 右键菜单
  const [contextMenu, setContextMenu] = useState<ContextMenuPos | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // 新建文件夹对话框
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // 重命名对话框
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameName, setRenameName] = useState('');

  // 移动对话框
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null);
  const [moveDest, setMoveDest] = useState('');

  // 复制对话框
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState<FileItem | null>(null);
  const [copyDest, setCopyDest] = useState('');

  // 分享对话框
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);
  const [shareExpire, setShareExpire] = useState<number>(7);
  const [sharePass, setSharePass] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  // 加密对话框
  const [encryptOpen, setEncryptOpen] = useState(false);
  const [encryptTarget, setEncryptTarget] = useState<FileItem | null>(null);
  const [encryptGroup, setEncryptGroup] = useState<string>('');
  const [encryptGroups, setEncryptGroups] = useState<{ crypt_name: string; crypt_pass?: string }[]>([]);
  const [encryptLoading, setEncryptLoading] = useState(false);

  // 解密对话框
  const [decryptOpen, setDecryptOpen] = useState(false);
  const [decryptTarget, setDecryptTarget] = useState<FileItem | null>(null);
  const [decryptPass, setDecryptPass] = useState('');
  const [decryptLoading, setDecryptLoading] = useState(false);

  // 目录树（复制/移动用）
  const [dirTreeData, setDirTreeData] = useState<any[]>([]);
  const [dirTreeLoading, setDirTreeLoading] = useState(false);

  // 文件夹编辑对话框
  const [folderEditOpen, setFolderEditOpen] = useState(false);
  const [folderEditTarget, setFolderEditTarget] = useState<FileItem | null>(null);
  const [folderMatesName, setFolderMatesName] = useState('');
  const [folderCryptName, setFolderCryptName] = useState('');
  const [folderEditLoading, setFolderEditLoading] = useState(false);
  const [matesOptions, setMatesOptions] = useState<{ mates_name: string }[]>([]);

  // 压缩对话框
  const [compressOpen, setCompressOpen] = useState(false);
  const [compressTarget, setCompressTarget] = useState<FileItem | null>(null);
  const [compressFormat, setCompressFormat] = useState('zip');
  const [compressName, setCompressName] = useState('');
  const [compressLoading, setCompressLoading] = useState(false);

  // 加载加密组列表
  const loadEncryptGroups = useCallback(async () => {
    try {
      const res = await api.post('/api/admin/setting/list', { group: 'crypt' });
      if (res?.code === 200 && res?.data) setEncryptGroups(res.data);
    } catch { /* 忽略 */ }
  }, []);

  // 加载路径规则列表
  const loadMatesOptions = useCallback(async () => {
    try {
      const res = await api.post('/api/admin/meta/list', {});
      if (res?.code === 200 && res?.data) setMatesOptions(res.data);
    } catch { /* 忽略 */ }
  }, []);

  // 加载目录树（指定父路径下的子目录）
  const loadDirTree = useCallback(async (parentPath: string = '/') => {
    setDirTreeLoading(true);
    try {
      const res = await api.post('/api/fs/list', { path: parentPath, password: '', page: 1, per_page: 0, refresh: false });
      if (res?.content) {
        const dirs = (res.content as any[]).filter((f: any) => f.is_dir);
        return dirs.map((d: any) => ({
          title: d.name,
          key: parentPath === '/' ? `/${d.name}` : `${parentPath}/${d.name}`,
          isLeaf: false,
        }));
      }
    } catch { /* 忽略 */ } finally { setDirTreeLoading(false); }
    return [];
  }, []);

  // 初始化目录树根节点
  const initDirTree = useCallback(async () => {
    const roots = await loadDirTree('/');
    setDirTreeData([{ title: '/', key: '/', isLeaf: false, children: roots }]);
  }, [loadDirTree]);

  // 目录树懒加载
  const onLoadDirData = async ({ key }: any) => {
    const children = await loadDirTree(key);
    const updateTree = (nodes: any[]): any[] =>
      nodes.map(n => n.key === key
        ? { ...n, children }
        : n.children ? { ...n, children: updateTree(n.children) } : n
      );
    setDirTreeData(prev => updateTree(prev));
  };

  // 从URL提取路径（URL 中可能含有编码字符，需解码后作为实际路径）
  useEffect(() => {
    const rawPath = location.pathname.replace('/files', '') || '/';
    try {
      const decoded = decodeURIComponent(rawPath);
      setCurrentPath(decoded === '' ? '/' : decoded);
    } catch {
      setCurrentPath(rawPath === '' ? '/' : rawPath);
    }
  }, [location.pathname]);

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/fs/list', { path: currentPath, password: '', page: 1, per_page: 0, refresh: false });
      if (res?.content) {
        // api拦截器已自动解包data层，res直接是 { content, total, ... }
        const content = res.content as any[];
        setFiles(content.map((item: any) => ({
          filePath: `${currentPath === '/' ? '' : currentPath}/${item.name}`,
          fileName: item.name,
          fileSize: item.size || 0,
          fileType: item.is_dir ? 0 : 1,
          timeModify: item.modified,
          timeCreate: item.created,
          thumbnails: item.thumb,
        })));
      } else {
        setFiles([]);
      }
    } catch {
      message.error(t('common.failed'));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentPath, t]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // 点击空白处关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // 导航到目录
  const navigateToPath = (path: string) => {
    if (path === '/') { navigate('/files'); return; }
    const encoded = path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
    navigate(`/files${encoded}`);
  };

  // 跳转预览页
  const navigateToPreview = (record: FileItem) => {
    const filePath = currentPath === '/' ? `/${record.fileName}` : `${currentPath}/${record.fileName}`;
    const encoded = filePath.split('/').map((seg) => encodeURIComponent(seg)).join('/');
    navigate(`/preview${encoded}`);
  };

  // 面包屑
  const breadcrumbItems = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const items: any[] = [
      { title: <HomeOutlined onClick={() => navigateToPath('/')} style={{ cursor: 'pointer' }} /> },
    ];
    let accumulated = '';
    parts.forEach((part) => {
      accumulated += `/${part}`;
      const path = accumulated;
      items.push({ title: <span onClick={() => navigateToPath(path)} style={{ cursor: 'pointer' }}>{part}</span> });
    });
    return items;
  };

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  };

  // 文件图标
  const getFileIcon = (item: FileItem) => {
    if (item.fileType === 0) return <FolderOutlined style={{ fontSize: 20, color: '#F59E0B' }} />;
    const ext = item.fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
      return <FileOutlined style={{ fontSize: 20, color: '#10B981' }} />;
    if (['mp4', 'mkv', 'avi', 'mov'].includes(ext))
      return <FileOutlined style={{ fontSize: 20, color: '#8B5CF6' }} />;
    if (['mp3', 'flac', 'wav', 'aac'].includes(ext))
      return <FileOutlined style={{ fontSize: 20, color: '#EC4899' }} />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
      return <FileZipOutlined style={{ fontSize: 20, color: '#F97316' }} />;
    if (['enc', 'zec'].includes(ext))
      return <LockOutlined style={{ fontSize: 20, color: '#EF4444' }} />;
    return <FileOutlined style={{ fontSize: 20, color: '#6B7280' }} />;
  };

  // 获取文件完整路径
  const getFilePath = (record: FileItem) =>
    currentPath === '/' ? `/${record.fileName}` : `${currentPath}/${record.fileName}`;

  // 点击处理：文件夹进入，文件跳转预览
  const handleClick = (record: FileItem) => {
    if (record.fileType === 0) {
      navigateToPath(getFilePath(record));
    } else {
      navigateToPreview(record);
    }
  };

  // 下载文件
  const handleDownload = async (record: FileItem) => {
    try {
      const res = await api.post('/api/fs/get', { path: getFilePath(record), password: '' });
      if (res?.code === 200 && res?.data?.raw_url) {
        window.open(res.data.raw_url, '_blank');
      } else {
        message.info(t('files.downloadLink') + ': ' + JSON.stringify(res?.data));
      }
    } catch {
      message.error(t('common.failed'));
    }
  };

  // 删除文件
  const handleDelete = (record: FileItem) => {
    confirm({
      title: t('files.deleteConfirm', { name: record.fileName }),
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await api.post('/api/fs/remove', { dir: currentPath, names: [record.fileName] });
          if (res?.code === 200) { message.success(t('common.success')); loadFiles(); }
          else message.error(res?.message || t('common.failed'));
        } catch { message.error(t('common.failed')); }
      },
    });
  };

  // 新建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const newPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
      const res = await api.post('/api/fs/mkdir', { path: newPath });
      if (res?.code === 200) {
        message.success(t('common.success'));
        setNewFolderOpen(false); setNewFolderName(''); loadFiles();
      } else message.error(res?.message || t('common.failed'));
    } catch { message.error(t('common.failed')); }
  };

  // 重命名
  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return;
    try {
      const res = await api.post('/api/fs/rename', { path: getFilePath(renameTarget), name: renameName });
      if (res?.code === 200) {
        message.success(t('common.success'));
        setRenameOpen(false); setRenameTarget(null); loadFiles();
      } else message.error(res?.message || t('common.failed'));
    } catch { message.error(t('common.failed')); }
  };

  // 移动文件
  const handleMove = async () => {
    if (!moveTarget || !moveDest.trim()) return;
    try {
      const res = await api.post('/api/fs/move', { src_dir: currentPath, dst_dir: moveDest, names: [moveTarget.fileName] });
      if (res?.code === 200) {
        message.success(t('common.success'));
        setMoveOpen(false); setMoveTarget(null); setMoveDest(''); loadFiles();
      } else message.error(res?.message || t('common.failed'));
    } catch { message.error(t('common.failed')); }
  };

  // 复制文件
  const handleCopy = async () => {
    if (!copyTarget || !copyDest.trim()) return;
    try {
      const res = await api.post('/api/fs/copy', { src_dir: currentPath, dst_dir: copyDest, names: [copyTarget.fileName] });
      if (res?.code === 200) {
        message.success(t('common.success'));
        setCopyOpen(false); setCopyTarget(null); setCopyDest(''); loadFiles();
      } else message.error(res?.message || t('common.failed'));
    } catch { message.error(t('common.failed')); }
  };

  // 分享文件
  const handleShare = async () => {
    if (!shareTarget) return;
    setShareLoading(true);
    try {
      const endsDate = shareExpire > 0
        ? new Date(Date.now() + shareExpire * 24 * 3600 * 1000).toISOString()
        : '';
      // 优先从 store 获取，若为空则从 localStorage 兜底解析
      let userName = currentUser?.users_name || '';
      if (!userName) {
        try {
          const raw = localStorage.getItem('openlist-auth');
          if (raw) {
            const parsed = JSON.parse(raw);
            userName = parsed?.state?.user?.users_name || '';
          }
        } catch { /* 忽略 */ }
      }
      // 仍然拿不到用户名时，使用 token 中的 sub 字段（后端 JWT 中存的是用户名）
      if (!userName) {
        try {
          const raw = localStorage.getItem('openlist-auth');
          if (raw) {
            const parsed = JSON.parse(raw);
            const token = parsed?.state?.token || '';
            if (token) {
              // JWT payload 是 base64，解码获取 sub
              const payload = JSON.parse(atob(token.split('.')[1]));
              userName = payload?.sub || payload?.users_name || '';
            }
          }
        } catch { /* 忽略 */ }
      }
      const res = await api.post('/api/share/create', {
        path: getFilePath(shareTarget),
        password: sharePass,
        expire: shareExpire > 0 ? shareExpire * 86400 : 0,
      });
      if (res?.code === 200 && res?.data) {
        const id = res.data.id || res.data.share_uuid || '';
        setShareLink(id ? `${window.location.origin}/s/${id}` : `${window.location.origin}/s/`);
      } else {
        message.error(res?.message || t('common.failed'));
      }
    } catch { message.error(t('common.failed')); }
    finally { setShareLoading(false); }
  };

  // 加密文件（关联加密组到文件路径的 meta 规则）
  const handleEncrypt = async () => {
    if (!encryptTarget || !encryptGroup) return;
    setEncryptLoading(true);
    try {
      const filePath = getFilePath(encryptTarget);
      const res = await api.post('/api/admin/meta/create', {
        path: filePath,
        password: encryptGroup,
        p_sub: true,
        write: false,
      });
      if (res?.code === 200) {
        message.success('加密关联成功');
        setEncryptOpen(false); setEncryptTarget(null); setEncryptGroup('');
      } else message.error(res?.message || t('common.failed'));
    } catch { message.error(t('common.failed')); }
    finally { setEncryptLoading(false); }
  };

  // 解密文件（移除路径的加密关联或解密文件内容）
  const handleDecrypt = async () => {
    if (!decryptTarget) return;
    setDecryptLoading(true);
    try {
      const filePath = getFilePath(decryptTarget);
      // 调用文件其他操作API（解密）
      const res = await api.post('/api/fs/other', {
        path: filePath,
        method: 'decrypt',
        args: { password: decryptPass },
      });
      if (res?.code === 200) {
        message.success('文件解密成功');
        setDecryptOpen(false); setDecryptTarget(null); setDecryptPass('');
        loadFiles();
      } else {
        message.error(res?.message || '解密失败');
      }
    } catch { message.error('解密失败'); }
    finally { setDecryptLoading(false); }
  };

  // 文件夹编辑（分配路径规则和加密组）
  const handleFolderEdit = async () => {
    if (!folderEditTarget) return;
    setFolderEditLoading(true);
    try {
      const folderPath = getFilePath(folderEditTarget);
      const res = await api.post('/api/admin/meta/create', {
        path: folderPath,
        password: folderCryptName || undefined,
        p_sub: true,
        write: false,
      });
      if (res?.code === 200) {
        message.success('文件夹配置已保存');
        setFolderEditOpen(false); setFolderEditTarget(null); setFolderMatesName(''); setFolderCryptName('');
      } else message.error(res?.message || t('common.failed'));
    } catch { message.error(t('common.failed')); }
    finally { setFolderEditLoading(false); }
  };

  // 压缩文件（创建压缩任务）
  const handleCompress = async () => {
    if (!compressTarget || !compressName.trim()) return;
    setCompressLoading(true);
    try {
      const userName = currentUser?.users_name || '';
      if (!userName) { message.error('用户未登录'); setCompressLoading(false); return; }
      const outputPath = `${currentPath === '/' ? '' : currentPath}/${compressName}.${compressFormat}`;
      const res = await api.post('/api/task/offline_download/add', {
        type: 'compress',
        urls: [getFilePath(compressTarget)],
        save_path: outputPath,
        tool: compressFormat,
      });
      if (res?.code === 200) {
        message.success(t('common.success'));
        setCompressOpen(false); setCompressTarget(null); setCompressName(''); loadFiles();
      } else message.error(res?.message || t('common.failed'));
    } catch { message.error(t('common.failed')); }
    finally { setCompressLoading(false); }
  };

  // 上传文件
  const handleUpload = async (file: File) => {
    try {
      const uploadPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      const res = await api.put('/api/fs/put', file, {
        headers: {
          'File-Path': encodeURIComponent(uploadPath),
          'Content-Type': file.type || 'application/octet-stream',
          'Content-Length': String(file.size),
        },
      });
      if (res?.code === 200) { message.success(t('common.success')); loadFiles(); }
      else message.error(res?.message || t('common.failed'));
    } catch { message.error(t('common.failed')); }
    return false;
  };

  // 打开右键菜单
  const openContextMenu = (e: React.MouseEvent, record: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, record });
  };

  // 打开加密对话框时加载加密组
  const openEncryptDialog = (record: FileItem) => {
    setEncryptTarget(record); setEncryptGroup(''); setEncryptOpen(true);
    loadEncryptGroups();
  };

  // 打开文件夹编辑对话框
  const openFolderEditDialog = (record: FileItem) => {
    setFolderEditTarget(record); setFolderMatesName(''); setFolderCryptName(''); setFolderEditOpen(true);
    loadEncryptGroups(); loadMatesOptions();
  };

  // 打开移动/复制对话框时初始化目录树
  const openMoveDialog = (record: FileItem) => {
    setMoveTarget(record); setMoveDest(''); setMoveOpen(true);
    initDirTree();
  };
  const openCopyDialog = (record: FileItem) => {
    setCopyTarget(record); setCopyDest(currentPath); setCopyOpen(true);
    initDirTree();
  };

  // 右键菜单项
  const buildContextMenuItems = (record: FileItem) => [
    ...(record.fileType !== 0 ? [
      { key: 'preview', icon: <EyeOutlined />, label: '预览', onClick: () => { setContextMenu(null); navigateToPreview(record); } },
      { key: 'download', icon: <DownloadOutlined />, label: t('common.download'), onClick: () => { setContextMenu(null); handleDownload(record); } },
      { type: 'divider' as const },
    ] : [
      { key: 'folder-edit', icon: <EditOutlined />, label: '编辑文件夹', onClick: () => { setContextMenu(null); openFolderEditDialog(record); } },
      { type: 'divider' as const },
    ]),
    { key: 'rename', icon: <EditOutlined />, label: t('common.rename'), onClick: (e?: any) => { e?.stopPropagation?.(); setContextMenu(null); setRenameTarget(record); setRenameName(record.fileName); setRenameOpen(true); } },
    { key: 'copy', icon: <CopyOutlined />, label: t('common.copy'), onClick: () => { setContextMenu(null); openCopyDialog(record); } },
    { key: 'move', icon: <ScissorOutlined />, label: t('common.move'), onClick: () => { setContextMenu(null); openMoveDialog(record); } },
    { type: 'divider' as const },
    { key: 'share', icon: <ShareAltOutlined />, label: t('common.share'), onClick: () => { setContextMenu(null); setShareTarget(record); setShareLink(''); setShareExpire(7); setSharePass(''); setShareOpen(true); } },
    { key: 'encrypt', icon: <LockOutlined />, label: t('common.encrypt'), onClick: () => { setContextMenu(null); openEncryptDialog(record); } },
    { key: 'decrypt', icon: <LockOutlined />, label: '解密', onClick: () => { setContextMenu(null); setDecryptTarget(record); setDecryptPass(''); setDecryptOpen(true); } },
    { key: 'compress', icon: <FileZipOutlined />, label: t('common.unzip'), onClick: () => { setContextMenu(null); setCompressTarget(record); setCompressName(record.fileName.replace(/\.[^.]+$/, '') || record.fileName); setCompressFormat('zip'); setCompressOpen(true); } },
    { type: 'divider' as const },
    { key: 'delete', icon: <DeleteOutlined />, label: t('common.delete'), danger: true, onClick: () => { setContextMenu(null); handleDelete(record); } },
  ];

  // 操作列菜单（与右键菜单相同）
  const actionMenuItems = (record: FileItem) => buildContextMenuItems(record);

  // 表格列定义
  const columns: ColumnsType<FileItem> = [
    {
      title: t('files.fileName'),
      dataIndex: 'fileName',
      key: 'fileName',
      render: (name: string, record: FileItem) => (
        <Space style={{ cursor: 'pointer' }} onClick={() => handleClick(record)}>
          {getFileIcon(record)}
          <Text strong={record.fileType === 0} style={{ fontSize: 13 }}>{name}</Text>
        </Space>
      ),
      sorter: (a, b) => a.fileName.localeCompare(b.fileName),
    },
    {
      title: t('files.fileSize'),
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (size: number, record: FileItem) =>
        record.fileType === 0 ? <Text type="secondary">-</Text> : <Text type="secondary">{formatSize(size)}</Text>,
      sorter: (a, b) => a.fileSize - b.fileSize,
      responsive: ['md'] as any,
    },
    {
      title: t('files.modifyTime'),
      dataIndex: 'timeModify',
      key: 'timeModify',
      width: 180,
      render: (time: string) =>
        time ? <Text type="secondary">{dayjs(time).format('YYYY-MM-DD HH:mm')}</Text> : <Text type="secondary">-</Text>,
      sorter: (a, b) => new Date(a.timeModify || 0).getTime() - new Date(b.timeModify || 0).getTime(),
      responsive: ['lg'] as any,
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 60,
      render: (_: any, record: FileItem) => (
        <Dropdown menu={{ items: actionMenuItems(record) }} trigger={['click']}>
          <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      {/* 工具栏 */}
      <Card
        variant="borderless"
        style={{ marginBottom: 16, borderRadius: 12 }}
        styles={{ body: { padding: '12px 20px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Breadcrumb items={breadcrumbItems()} style={{ fontSize: 14 }} />
          <Space size={8}>
            <Tooltip title={t('common.refresh')}>
              <Button type="text" icon={<ReloadOutlined />} onClick={loadFiles} />
            </Tooltip>
            <Tooltip title={viewMode === 'list' ? 'Grid' : 'List'}>
              <Button
                type="text"
                icon={viewMode === 'list' ? <AppstoreOutlined /> : <UnorderedListOutlined />}
                onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
              />
            </Tooltip>
            <Button icon={<FolderAddOutlined />} onClick={() => setNewFolderOpen(true)}>
              {t('files.newFolder')}
            </Button>
            <Upload showUploadList={false} beforeUpload={handleUpload} multiple>
              <Button type="primary" icon={<UploadOutlined />} style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', border: 'none' }}>
                {t('files.uploadFile')}
              </Button>
            </Upload>
          </Space>
        </div>
      </Card>

      {/* 文件列表 */}
      <Card variant="borderless" style={{ borderRadius: 12 }} styles={{ body: { padding: viewMode === 'grid' ? 16 : 0 } }}>
        {loading ? (
          <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
        ) : files.length === 0 ? (
          <Empty description={t('files.noFiles')} style={{ padding: '80px 0' }} />
        ) : viewMode === 'grid' ? (
          /* ── 网格视图 ── */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
          }}>
            {files.map((record) => (
              <div
                key={record.fileName}
                onClick={() => handleClick(record)}
                onContextMenu={(e) => openContextMenu(e, record)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px 8px 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
                  background: 'var(--ant-color-bg-container, #fff)',
                  transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
                  userSelect: 'none',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.12)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.3)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--ant-color-border-secondary, #f0f0f0)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                {/* 文件图标 */}
                <div style={{ fontSize: 40, marginBottom: 10, lineHeight: 1 }}>
                  {getFileIcon(record)}
                </div>
                {/* 文件名 */}
                <Text
                  ellipsis={{ tooltip: record.fileName }}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    textAlign: 'center',
                    width: '100%',
                    lineHeight: 1.4,
                  }}
                >
                  {record.fileName}
                </Text>
                {/* 文件大小 */}
                {record.fileType !== 0 && (
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                    {formatSize(record.fileSize)}
                  </Text>
                )}
                {/* 操作按钮（悬停时显示） */}
                <div
                  style={{ marginTop: 8 }}
                  onClick={e => e.stopPropagation()}
                >
                  <Dropdown menu={{ items: actionMenuItems(record) }} trigger={['click']}>
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      style={{ opacity: 0.6 }}
                    />
                  </Dropdown>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── 列表视图 ── */
          <Table
            dataSource={files}
            columns={columns}
            rowKey={(record) => record.fileName}
            pagination={false}
            size="middle"
            onRow={(record) => ({
              onClick: (e) => {
                // 如果点击的是操作列按钮，不触发行点击
                const target = e.target as HTMLElement;
                if (target.closest('.ant-dropdown-trigger') || target.closest('.ant-btn')) return;
                handleClick(record);
              },
              onContextMenu: (e) => openContextMenu(e, record),
            })}
            style={{ borderRadius: 12, overflow: 'hidden' }}
          />
        )}
      </Card>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
            background: 'var(--ant-color-bg-elevated, #fff)',
            borderRadius: 8,
            boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            padding: '4px 0',
            minWidth: 160,
          }}
          onClick={(e) => e.stopPropagation()}
        >
      {buildContextMenuItems(contextMenu.record).map((item, idx) => {
            if (item.type === 'divider') {
              return <div key={`divider-${idx}`} style={{ height: 1, background: 'var(--ant-color-split, #f0f0f0)', margin: '4px 0' }} />;
            }
            return (
              <div
                key={item.key}
                onClick={(e) => { e.stopPropagation(); (item as any).onClick?.(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 16px', cursor: 'pointer', fontSize: 13,
                  color: (item as any).danger ? '#ff4d4f' : 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ant-color-fill-secondary, #f5f5f5)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 新建文件夹对话框 */}
      <Modal
        title={t('files.newFolder')} open={newFolderOpen}
        onOk={handleCreateFolder} onCancel={() => { setNewFolderOpen(false); setNewFolderName(''); }}
        okText={t('common.confirm')} cancelText={t('common.cancel')}
      >
        <Input placeholder={t('files.newFolder')} value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)} onPressEnter={handleCreateFolder} autoFocus />
      </Modal>

      {/* 重命名对话框 */}
      <Modal
        title={t('common.rename')} open={renameOpen}
        onOk={handleRename} onCancel={() => { setRenameOpen(false); setRenameTarget(null); }}
        okText={t('common.confirm')} cancelText={t('common.cancel')}
      >
        <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} onPressEnter={handleRename} autoFocus />
      </Modal>

      {/* 移动对话框 */}
      <Modal
        title={`移动 "${moveTarget?.fileName}"`} open={moveOpen}
        onOk={handleMove} onCancel={() => { setMoveOpen(false); setMoveTarget(null); setMoveDest(''); }}
        okText={t('common.confirm')} cancelText={t('common.cancel')}
      >
        <Form layout="vertical">
          <Form.Item label="目标目录" extra={moveDest ? `已选择：${moveDest}` : '请在下方目录树中选择目标目录'}>
            <Input value={moveDest} onChange={(e) => setMoveDest(e.target.value)} placeholder="/目录路径" prefix={<FolderOutlined />} />
          </Form.Item>
          <Form.Item>
            <Spin spinning={dirTreeLoading}>
              <div style={{ border: '1px solid var(--ant-color-border, #d9d9d9)', borderRadius: 6, maxHeight: 280, overflow: 'auto', padding: '4px 0' }}>
                <Tree
                  treeData={dirTreeData}
                  loadData={onLoadDirData}
                  selectedKeys={moveDest ? [moveDest] : []}
                  onSelect={(keys) => setMoveDest(keys[0] as string || '')}
                  blockNode
                  style={{ fontSize: 13 }}
                />
              </div>
            </Spin>
          </Form.Item>
        </Form>
      </Modal>

      {/* 复制对话框 */}
      <Modal
        title={`复制 "${copyTarget?.fileName}"`} open={copyOpen}
        onOk={handleCopy} onCancel={() => { setCopyOpen(false); setCopyTarget(null); setCopyDest(''); }}
        okText={t('common.confirm')} cancelText={t('common.cancel')}
      >
        <Form layout="vertical">
          <Form.Item label="目标目录" extra={copyDest ? `已选择：${copyDest}` : '请在下方目录树中选择目标目录'}>
            <Input value={copyDest} onChange={(e) => setCopyDest(e.target.value)} placeholder="/目录路径" prefix={<FolderOutlined />} />
          </Form.Item>
          <Form.Item>
            <Spin spinning={dirTreeLoading}>
              <div style={{ border: '1px solid var(--ant-color-border, #d9d9d9)', borderRadius: 6, maxHeight: 280, overflow: 'auto', padding: '4px 0' }}>
                <Tree
                  treeData={dirTreeData}
                  loadData={onLoadDirData}
                  selectedKeys={copyDest ? [copyDest] : []}
                  onSelect={(keys) => setCopyDest(keys[0] as string || '')}
                  blockNode
                  style={{ fontSize: 13 }}
                />
              </div>
            </Spin>
          </Form.Item>
        </Form>
      </Modal>

      {/* 分享对话框 */}
      <Modal
        title={`分享 "${shareTarget?.fileName}"`} open={shareOpen}
        onOk={shareLink ? () => { navigator.clipboard.writeText(shareLink); message.success('链接已复制'); } : handleShare}
        onCancel={() => { setShareOpen(false); setShareTarget(null); setShareLink(''); setSharePass(''); }}
        okText={shareLink ? '复制链接' : '生成链接'}
        cancelText={t('common.cancel')}
        confirmLoading={shareLoading}
      >
        <Form layout="vertical">
          <Form.Item label="有效期（天）" extra="设为 0 表示永不过期">
            <InputNumber
              min={0} max={365} value={shareExpire}
              onChange={(v) => setShareExpire(v ?? 7)}
              style={{ width: '100%' }}
              disabled={!!shareLink}
            />
          </Form.Item>
          <Form.Item label="访问密码" extra="留空则无需密码即可访问">
            <Input.Password
              placeholder="可选，留空表示公开分享"
              value={sharePass}
              onChange={(e) => setSharePass(e.target.value)}
              disabled={!!shareLink}
            />
          </Form.Item>
          {shareLink && (
            <Form.Item label="分享链接">
              <Input.TextArea value={shareLink} readOnly rows={2} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 加密对话框 */}
      <Modal
        title={`加密关联 "${encryptTarget?.fileName}"`} open={encryptOpen}
        onOk={handleEncrypt} onCancel={() => { setEncryptOpen(false); setEncryptTarget(null); setEncryptGroup(''); }}
        okText="确认关联" cancelText={t('common.cancel')}
        confirmLoading={encryptLoading}
        okButtonProps={{ disabled: !encryptGroup }}
      >
        <Form layout="vertical">
          <Form.Item label="选择加密组" extra="将此文件/目录关联到指定加密组，上传到此路径的文件将自动加密">
            <Select
              placeholder="请选择加密组"
              value={encryptGroup || undefined}
              onChange={setEncryptGroup}
              style={{ width: '100%' }}
              options={encryptGroups.map(g => ({ label: g.crypt_name, value: g.crypt_name }))}
              notFoundContent={<span style={{ color: '#999', fontSize: 12 }}>暂无加密组，请先在「加密配置」中创建</span>}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 解密对话框 */}
      <Modal
        title={`解密文件 "${decryptTarget?.fileName}"`} open={decryptOpen}
        onOk={handleDecrypt} onCancel={() => { setDecryptOpen(false); setDecryptTarget(null); setDecryptPass(''); }}
        okText="确认解密" cancelText={t('common.cancel')}
        confirmLoading={decryptLoading}
        okButtonProps={{ disabled: !decryptPass }}
      >
        <Form layout="vertical">
          <Form.Item label="解密密码" extra="请输入此文件关联的加密组密码">
            <Input.Password
              placeholder="请输入解密密码"
              value={decryptPass}
              onChange={(e) => setDecryptPass(e.target.value)}
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 文件夹编辑对话框 */}
      <Modal
        title={`编辑文件夹 "${folderEditTarget?.fileName}"`} open={folderEditOpen}
        onOk={handleFolderEdit} onCancel={() => { setFolderEditOpen(false); setFolderEditTarget(null); }}
        okText="保存配置" cancelText={t('common.cancel')}
        confirmLoading={folderEditLoading}
      >
        <Form layout="vertical">
          <Form.Item label="关联加密组" extra="上传到此文件夹的文件将自动使用所选加密组加密">
            <Select
              placeholder="不加密（留空）"
              value={folderCryptName || undefined}
              onChange={setFolderCryptName}
              allowClear
              style={{ width: '100%' }}
              options={encryptGroups.map(g => ({ label: g.crypt_name, value: g.crypt_name }))}
              notFoundContent={<span style={{ color: '#999', fontSize: 12 }}>暂无加密组，请先在「加密配置」中创建</span>}
            />
          </Form.Item>
          <Form.Item label="路径规则" extra="为此文件夹应用已有的路径规则配置">
            <Select
              placeholder="不应用规则（留空）"
              value={folderMatesName || undefined}
              onChange={setFolderMatesName}
              allowClear
              style={{ width: '100%' }}
              options={matesOptions.map(m => ({ label: m.mates_name, value: m.mates_name }))}
              notFoundContent={<span style={{ color: '#999', fontSize: 12 }}>暂无路径规则，请先在「路径配置」中创建</span>}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 压缩对话框 */}
      <Modal
        title={`压缩 "${compressTarget?.fileName}"`} open={compressOpen}
        onOk={handleCompress} onCancel={() => { setCompressOpen(false); setCompressTarget(null); setCompressName(''); }}
        okText="开始压缩" cancelText={t('common.cancel')}
        confirmLoading={compressLoading}
      >
        <Form layout="vertical">
          <Form.Item label="压缩格式">
            <Select
              value={compressFormat}
              onChange={setCompressFormat}
              options={[
                { label: 'ZIP (.zip)', value: 'zip' },
                { label: 'TAR.GZ (.tar.gz)', value: 'tar.gz' },
                { label: '7Z (.7z)', value: '7z' },
              ]}
            />
          </Form.Item>
          <Form.Item label="输出文件名" extra={`将保存到当前目录：${currentPath}`}>
            <Input
              value={compressName}
              onChange={(e) => setCompressName(e.target.value)}
              addonAfter={`.${compressFormat}`}
              placeholder="压缩包名称"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FileManager;
