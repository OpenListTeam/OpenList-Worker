import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Typography, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  EyeOutlined,
  CopyOutlined,
  DragOutlined,
  FileZipOutlined,
  SettingOutlined,
  LinkOutlined,
  CloudDownloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => React.ReactNode;
  priority?: number; // 优先级，数字越小优先级越高，0为最高优先级（不会被隐藏）
  sortable?: boolean; // 是否可排序
}

interface ResponsiveDataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onShare?: (row: any) => void;
  onDownload?: (row: any) => void;
  onOffline?: (row: any) => void;
  onView?: (row: any) => void;
  onCopy?: (row: any) => void;
  onMove?: (row: any) => void;
  onLink?: (row: any) => void;
  onArchive?: (row: any) => void;
  onSettings?: (row: any) => void;
  onAdd?: () => void;
  onRowClick?: (row: any) => void;
  onRowDoubleClick?: (row: any) => void;
  actions?: ('edit' | 'delete' | 'share' | 'download' | 'offline' | 'view' | 'copy' | 'move' | 'link' | 'archive' | 'settings' | 'add')[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (columnId: string, order: 'asc' | 'desc') => void;
}

const ResponsiveDataTable: React.FC<ResponsiveDataTableProps> = ({
  title,
  columns,
  data,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  onOffline,
  onView,
  onCopy,
  onMove,
  onLink,
  onArchive,
  onSettings,
  onAdd,
  onRowClick,
  onRowDoubleClick,
  actions = ['edit', 'delete'],
  sortBy,
  sortOrder,
  onSort,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 操作按钮映射
  const actionButtonMap: Record<string, { icon: React.ReactNode; handler?: (row: any) => void; tooltip: string }> = {
    view: { icon: <EyeOutlined />, handler: onView, tooltip: '查看' },
    download: { icon: <DownloadOutlined />, handler: onDownload, tooltip: '下载' },
    offline: { icon: <CloudDownloadOutlined />, handler: onOffline, tooltip: '离线下载' },
    link: { icon: <LinkOutlined />, handler: onLink, tooltip: '链接' },
    copy: { icon: <CopyOutlined />, handler: onCopy, tooltip: '复制' },
    move: { icon: <DragOutlined />, handler: onMove, tooltip: '移动' },
    archive: { icon: <FileZipOutlined />, handler: onArchive, tooltip: '归档' },
    settings: { icon: <SettingOutlined />, handler: onSettings, tooltip: '设置' },
    edit: { icon: <EditOutlined />, handler: onEdit, tooltip: '编辑' },
    share: { icon: <ShareAltOutlined />, handler: onShare, tooltip: '分享' },
    delete: { icon: <DeleteOutlined />, handler: onDelete, tooltip: '删除' },
  };

  // 构建 Antd Table 列配置
  const buildAntdColumns = (): ColumnsType<any> => {
    const antdColumns: ColumnsType<any> = columns.map((col) => ({
      title: col.label,
      dataIndex: col.id,
      key: col.id,
      align: col.align || 'left',
      width: col.id === 'name' ? undefined : col.minWidth,
      ellipsis: col.id !== 'name',
      sorter: col.sortable && onSort ? true : undefined,
      sortOrder: sortBy === col.id ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
      render: col.format ? (_: any, record: any) => col.format!(record[col.id]) : undefined,
    }));

    // 添加操作列
    const filteredActions = actions.filter((a) => a !== 'add');
    if (filteredActions.length > 0) {
      antdColumns.push({
        title: '操作',
        key: 'actions',
        align: 'center',
        width: 245,
        fixed: 'right',
        render: (_: any, record: any) => (
          <Space size={2} wrap style={{ justifyContent: 'center' }}>
            {filteredActions.map((actionKey) => {
              const actionConfig = actionButtonMap[actionKey];
              if (!actionConfig) return null;
              return (
                <Tooltip title={actionConfig.tooltip} key={actionKey}>
                  <Button
                    type="text"
                    size="small"
                    icon={actionConfig.icon}
                    onClick={(e) => {
                      e.stopPropagation();
                      actionConfig.handler?.(record);
                    }}
                    style={{ padding: '2px 4px', minWidth: 'auto' }}
                  />
                </Tooltip>
              );
            })}
          </Space>
        ),
      });
    }

    return antdColumns;
  };

  // 处理排序变更
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    if (onSort && sorter.columnKey) {
      const newOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
      onSort(sorter.columnKey, newOrder);
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* 标题栏和添加按钮 */}
      {(title || (actions?.includes('add') && onAdd)) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 0,
            padding: '12px 16px',
            borderRadius: '12px 12px 0 0',
            borderBottom: '1px solid var(--ant-color-border, #f0f0f0)',
            background: 'var(--ant-color-bg-container, #fff)',
          }}
        >
          {title && (
            <Typography.Title level={5} style={{ margin: 0, fontWeight: 'bold' }}>
              {title}
            </Typography.Title>
          )}
          {actions?.includes('add') && onAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAdd}
              style={{ borderRadius: 10 }}
            >
              添加
            </Button>
          )}
        </div>
      )}

      <Table
        columns={buildAntdColumns()}
        dataSource={Array.isArray(data) ? data : []}
        rowKey={(_, index) => String(index)}
        pagination={false}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
        onRow={(record) => ({
          onClick: () => onRowClick?.(record),
          onDoubleClick: () => onRowDoubleClick?.(record),
          style: {
            cursor: onRowClick || onRowDoubleClick ? 'pointer' : 'default',
          },
        })}
        style={{
          borderRadius: title || (actions?.includes('add') && onAdd) ? '0 0 12px 12px' : 12,
          overflow: 'hidden',
        }}
        size="middle"
      />
    </div>
  );
};

export default ResponsiveDataTable;