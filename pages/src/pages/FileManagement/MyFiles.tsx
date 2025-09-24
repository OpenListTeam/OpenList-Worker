import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { FileItem } from '../../types';

const MyFiles: React.FC = () => {
  const [files] = useState<FileItem[]>([
    {
      id: '1',
      name: '个人文档',
      size: '1.2 GB',
      modified: '2025-09-24 16:45',
      owner: '当前用户',
      permissions: '700',
      tags: '个人',
    },
    {
      id: '2',
      name: '工作资料',
      size: '3.5 GB',
      modified: '2025-09-23 11:30',
      owner: '当前用户',
      permissions: '750',
      tags: '工作',
    },
    {
      id: '3',
      name: '照片备份',
      size: '8.2 GB',
      modified: '2025-09-22 20:00',
      owner: '当前用户',
      permissions: '700',
      tags: '备份',
    },
    {
      id: '4',
      name: '项目代码',
      size: '2.1 GB',
      modified: '2025-09-21 14:20',
      owner: '当前用户',
      permissions: '755',
      tags: '开发',
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

  const handleShare = (file: FileItem) => {
    console.log('分享文件:', file);
  };

  return (
    <DataTable
      title="我的文件"
      columns={columns}
      data={files}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onDownload={handleDownload}
      onShare={handleShare}
      actions={['edit', 'delete', 'download', 'share']}
    />
  );
};

export default MyFiles;