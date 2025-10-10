import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
  TableSortLabel,
  Typography,
  Button,
} from '@mui/material';
import { 
  Edit, 
  Delete, 
  Share, 
  Download, 
  Visibility, 
  FileCopy, 
  DriveFileMove,
  Archive,
  Settings,
  Link,
  CloudDownload,
  Add
} from '@mui/icons-material';

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
  const [visibleColumns, setVisibleColumns] = useState<Column[]>(columns);
  const [showActionColumn, setShowActionColumn] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // 处理排序
  const handleSort = (columnId: string) => {
    if (!onSort) return;
    
    let newOrder: 'asc' | 'desc' = 'asc';
    if (sortBy === columnId && sortOrder === 'asc') {
      newOrder = 'desc';
    }
    
    onSort(columnId, newOrder);
  };

  // 计算可见列
  const calculateVisibleColumns = () => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const actionColumnWidth = 245; // 操作列的固定宽度
    let availableWidth = containerWidth - 32; // 减去padding

    // 按优先级排序列
    const sortedColumns = [...columns].sort((a, b) => (a.priority || 999) - (b.priority || 999));
    const newVisibleColumns: Column[] = [];
    
    // 首先为操作列预留空间（优先级4）
    let showActions = true;
    if (availableWidth < actionColumnWidth + 150) { // 如果空间不足以显示操作列和文件名列
      showActions = false;
    } else {
      availableWidth -= actionColumnWidth;
    }
    
    for (const column of sortedColumns) {
      const columnWidth = column.minWidth || 100;
      
      // 优先级为0的列（如文件名）始终显示
      if (column.priority === 0) {
        newVisibleColumns.push(column);
        availableWidth -= Math.max(columnWidth, 120); // 文件名列最小120px
      } else if (availableWidth >= columnWidth) {
        newVisibleColumns.push(column);
        availableWidth -= columnWidth;
      }
    }

    // 按原始顺序重新排列
    const orderedVisibleColumns = columns.filter(col => 
      newVisibleColumns.some(visCol => visCol.id === col.id)
    );

    setVisibleColumns(orderedVisibleColumns);
    setShowActionColumn(showActions);
  };

  // 监听容器大小变化
  useEffect(() => {
    calculateVisibleColumns();

    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleColumns();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [columns]);

  const renderActionButtons = (row: any) => (
    <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap', justifyContent: 'center' }}>
      {actions.includes('view') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onView?.(row); }}>
          <Visibility sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('download') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onDownload?.(row); }}>
          <Download sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('offline') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onOffline?.(row); }}>
          <CloudDownload sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('link') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onLink?.(row); }}>
          <Link sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('copy') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onCopy?.(row); }}>
          <FileCopy sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('move') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onMove?.(row); }}>
          <DriveFileMove sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('archive') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onArchive?.(row); }}>
          <Archive sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('settings') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onSettings?.(row); }}>
          <Settings sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('edit') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onEdit?.(row); }}>
          <Edit sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('share') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onShare?.(row); }}>
          <Share sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
      {actions.includes('delete') && (
        <IconButton size="small" sx={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); onDelete?.(row); }}>
          <Delete sx={{ fontSize: '16px' }} />
        </IconButton>
      )}
    </Box>
  );

  return (
    <Box ref={containerRef} sx={{ width: '100%' }}>
      {/* 标题栏和添加按钮 */}
      {(title || (actions?.includes('add') && onAdd)) && (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            mb: 2,
            p: 2,
            backgroundColor: 'background.paper',
            borderRadius: '15px 15px 0 0',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          {title && (
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
              {title}
            </Typography>
          )}
          {actions?.includes('add') && onAdd && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onAdd}
              sx={{ borderRadius: '10px' }}
            >
              添加
            </Button>
          )}
        </Box>
      )}
      <TableContainer component={Paper} sx={{ borderRadius: title || (actions?.includes('add') && onAdd) ? '0 0 15px 15px' : '15px', overflowX: 'auto' }}>
        <Table stickyHeader sx={{ width: '100%', tableLayout: 'auto' }} aria-label="responsive data table">
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ 
                    minWidth: column.minWidth,
                    width: column.id === 'name' ? 'auto' : column.minWidth,
                    maxWidth: column.id === 'name' ? 'none' : column.minWidth
                  }}
                  sx={{ fontWeight: 'bold' }}
                >
                  {column.sortable && onSort ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortOrder : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {showActionColumn && (
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '245px', minWidth: '245px', maxWidth: '245px', padding: '4px' }}>
                  操作
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {(Array.isArray(data) ? data : []).map((row, index) => (
              <TableRow 
                hover 
                role="checkbox" 
                tabIndex={-1} 
                key={index}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
                sx={{ 
                  cursor: onRowClick || onRowDoubleClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: onRowClick || onRowDoubleClick ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                  }
                }}
              >
                {visibleColumns.map((column) => {
                  const value = row[column.id];
                  return (
                    <TableCell 
                      key={column.id} 
                      align={column.align}
                      sx={{
                        maxWidth: column.id === 'name' ? 'none' : column.minWidth,
                        overflow: column.id === 'name' ? 'visible' : 'hidden',
                        textOverflow: column.id === 'name' ? 'unset' : 'ellipsis',
                        whiteSpace: column.id === 'name' ? 'normal' : 'nowrap',
                        wordBreak: column.id === 'name' ? 'break-word' : 'normal'
                      }}
                    >
                      {column.format ? column.format(value) : value}
                    </TableCell>
                  );
                })}
                {showActionColumn && (
                  <TableCell align="center" sx={{ width: '245px', minWidth: '245px', maxWidth: '245px', padding: '4px' }}>
                    {renderActionButtons(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ResponsiveDataTable;