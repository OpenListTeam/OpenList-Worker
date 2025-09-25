import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { FileItem } from '../../types';

const PublicDirectory: React.FC = () => {
  const [files] = useState<FileItem[]>([
    {
      id: '1',
      name: '公共文档',
      size: '2.5 GB',
      modified: '2025-09-24 15:30',
      owner: '系统管理员',
      permissions: '755',
      tags: '公共',
    },
    {
      id: '2',
      name: '共享图片',
      size: '1.2 GB',
      modified: '2025-09-23 14:20',
      owner: '系统管理员',
      permissions: '755',
      tags: '公共',
    },
    {
      id: '3',
      name: '开源项目',
      size: '5.8 GB',
      modified: '2025-09-22 10:15',
      owner: '系统管理员',
      permissions: '755',
      tags: '公共',
    },
    {
      id: '4',
      name: '技术文档',
      size: '800 MB',
      modified: '2025-09-21 09:45',
      owner: '系统管理员',
      permissions: '755',
      tags: '公共',
    },
  ]);

  const columns = [
    { id: 'name', label: '文件名', minWidth: 200 },
    { id: 'size', label: '大小', minWidth: 100, align: 'right' as const },
    { id: 'modified', label: '修改日期', minWidth: 150, align: 'right' as const },
    { id: 'owner', label: '所有者', minWidth: 120, align: 'right' as const },
    { id: 'permissions', label: '权限', minWidth: 80, align: 'right' as const },
    { id: 'tags', label: '标签', minWidth: 100, align: 'right' as const },
  ];

  const handleEdit = (file: FileItem) => {
    console.log('编辑文件:', file);
  };

  const handleDelete = (file: FileItem) => {
    console.log('删除文件:', file);
  };

  const handleDownload = (file: FileItem) => {
    console.log('下载文件:', file);
  };

  return (
    <DataTable
      title="公共目录"
      columns={columns}
      data={files}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onDownload={handleDownload}
      actions={['edit', 'delete', 'download']}
    />
  );
};

export default PublicDirectory;