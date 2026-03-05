import React from 'react';
import { Table, Tag, Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  EyeOutlined,
  CopyOutlined,
  DragOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => React.ReactNode;
}

interface DataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  loading?: boolean;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onShare?: (row: any) => void;
  onDownload?: (row: any) => void;
  onView?: (row: any) => void;
  onCopy?: (row: any) => void;
  onMove?: (row: any) => void;
  onReload?: (row: any) => void;
  onRowClick?: (row: any) => void;
  onRowDoubleClick?: (row: any) => void;
  actions?: ('edit' | 'delete' | 'share' | 'download' | 'view' | 'copy' | 'move' | 'reload')[];
}

const DataTable: React.FC<DataTableProps> = ({
  title,
  columns,
  data,
  loading = false,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  onView,
  onCopy,
  onMove,
  onReload,
  onRowClick,
  onRowDoubleClick,
  actions = ['edit', 'delete'],
}) => {
  const renderStatusTag = (status: number) => (
    <Tag color={status === 1 ? 'success' : 'default'}>
      {status === 1 ? '启用' : '禁用'}
    </Tag>
  );

  const renderActionButtons = (_: any, row: any) => (
    <Space size={4}>
      {actions.includes('view') && (
        <Tooltip title="查看">
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); onView?.(row); }} disabled={loading} />
        </Tooltip>
      )}
      {actions.includes('download') && (
        <Tooltip title="下载">
          <Button type="text" size="small" icon={<DownloadOutlined />} onClick={(e) => { e.stopPropagation(); onDownload?.(row); }} disabled={loading} />
        </Tooltip>
      )}
      {actions.includes('copy') && (
        <Tooltip title="复制">
          <Button type="text" size="small" icon={<CopyOutlined />} onClick={(e) => { e.stopPropagation(); onCopy?.(row); }} disabled={loading} />
        </Tooltip>
      )}
      {actions.includes('move') && (
        <Tooltip title="移动">
          <Button type="text" size="small" icon={<DragOutlined />} onClick={(e) => { e.stopPropagation(); onMove?.(row); }} disabled={loading} />
        </Tooltip>
      )}
      {actions.includes('reload') && (
        <Tooltip title="重新加载">
          <Button type="text" size="small" icon={<ReloadOutlined />} onClick={(e) => { e.stopPropagation(); onReload?.(row); }} disabled={loading} />
        </Tooltip>
      )}
      {actions.includes('edit') && (
        <Tooltip title="编辑">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit?.(row); }} disabled={loading} />
        </Tooltip>
      )}
      {actions.includes('delete') && (
        <Tooltip title="删除">
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onDelete?.(row); }} disabled={loading} />
        </Tooltip>
      )}
      {actions.includes('share') && (
        <Tooltip title="分享">
          <Button type="text" size="small" icon={<ShareAltOutlined />} onClick={(e) => { e.stopPropagation(); onShare?.(row); }} disabled={loading} />
        </Tooltip>
      )}
    </Space>
  );

  // 将 Column 接口转换为 Antd ColumnsType
  const antdColumns: ColumnsType<any> = [
    ...columns.map((col) => ({
      title: col.label,
      dataIndex: col.id,
      key: col.id,
      align: col.align as any,
      width: col.minWidth,
      render: col.format ? (_: any, record: any) => col.format!(record[col.id]) : undefined,
    })),
    {
      title: '操作',
      key: '_actions',
      align: 'center' as const,
      render: renderActionButtons,
    },
  ];

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Table
        columns={antdColumns}
        dataSource={data}
        loading={loading}
        rowKey={(_, index) => String(index)}
        sticky
        size="middle"
        pagination={false}
        scroll={{ x: 500 }}
        style={{ borderRadius: 15, overflow: 'hidden' }}
        onRow={(record) => ({
          onClick: () => onRowClick?.(record),
          onDoubleClick: () => onRowDoubleClick?.(record),
          style: {
            cursor: onRowClick || onRowDoubleClick ? 'pointer' : 'default',
          },
        })}
      />
    </div>
  );
};

export default DataTable;