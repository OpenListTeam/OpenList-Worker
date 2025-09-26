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
  Link
} from '@mui/icons-material';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => React.ReactNode;
  priority?: number; // 优先级，数字越小优先级越高，0为最高优先级（不会被隐藏）
}

interface ResponsiveDataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onShare?: (row: any) => void;
  onDownload?: (row: any) => void;
  onView?: (row: any) => void;
  onCopy?: (row: any) => void;
  onMove?: (row: any) => void;
  onLink?: (row: any) => void;
  onArchive?: (row: any) => void;
  onSettings?: (row: any) => void;
  onRowClick?: (row: any) => void;
  onRowDoubleClick?: (row: any) => void;
  actions?: ('edit' | 'delete' | 'share' | 'download' | 'view' | 'copy' | 'move' | 'link' | 'archive' | 'settings')[];
}

const ResponsiveDataTable: React.FC<ResponsiveDataTableProps> = ({
  title,
  columns,
  data,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  onView,
  onCopy,
  onMove,
  onLink,
  onArchive,
  onSettings,
  onRowClick,
  onRowDoubleClick,
  actions = ['edit', 'delete'],
}) => {
  const [visibleColumns, setVisibleColumns] = useState<Column[]>(columns);
  const [showActionColumn, setShowActionColumn] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // 计算可见列
  const calculateVisibleColumns = () => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const actionColumnWidth = 300; // 操作列的固定宽度改为300px
    let availableWidth = containerWidth - 32; // 减去padding

    // 按优先级排序列
    const sortedColumns = [...columns].sort((a, b) => (a.priority || 999) - (b.priority || 999));
    const newVisibleColumns: Column[] = [];
    
    // 首先为操作列预留空间（优先级4）
    let showActions = true;
    if (availableWidth < actionColumnWidth + 200) { // 如果空间不足以显示操作列和文件名列
      showActions = false;
    } else {
      availableWidth -= actionColumnWidth;
    }
    
    for (const column of sortedColumns) {
      const columnWidth = column.minWidth || 100;
      
      // 优先级为0的列（如文件名）始终显示
      if (column.priority === 0) {
        newVisibleColumns.push(column);
        availableWidth -= Math.max(columnWidth, 200); // 文件名列最小200px
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
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {actions.includes('view') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onView?.(row); }}>
          <Visibility fontSize="small" />
        </IconButton>
      )}
      {actions.includes('download') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDownload?.(row); }}>
          <Download fontSize="small" />
        </IconButton>
      )}
      {actions.includes('link') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onLink?.(row); }}>
          <Link fontSize="small" />
        </IconButton>
      )}
      {actions.includes('copy') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCopy?.(row); }}>
          <FileCopy fontSize="small" />
        </IconButton>
      )}
      {actions.includes('move') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMove?.(row); }}>
          <DriveFileMove fontSize="small" />
        </IconButton>
      )}
      {actions.includes('archive') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onArchive?.(row); }}>
          <Archive fontSize="small" />
        </IconButton>
      )}
      {actions.includes('settings') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSettings?.(row); }}>
          <Settings fontSize="small" />
        </IconButton>
      )}
      {actions.includes('edit') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit?.(row); }}>
          <Edit fontSize="small" />
        </IconButton>
      )}
      {actions.includes('share') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onShare?.(row); }}>
          <Share fontSize="small" />
        </IconButton>
      )}
      {actions.includes('delete') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete?.(row); }}>
          <Delete fontSize="small" />
        </IconButton>
      )}
    </Box>
  );

  return (
    <Box ref={containerRef} sx={{ width: '100%', height: '100%' }}>
      <TableContainer component={Paper} sx={{ height: '100%', borderRadius: '15px' }}>
        <Table stickyHeader sx={{ minWidth: 400 }} aria-label="responsive data table">
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ 
                    minWidth: column.priority === 0 ? Math.max(column.minWidth || 200, 200) : column.minWidth,
                    width: column.priority === 0 ? 'auto' : column.minWidth
                  }}
                  sx={{ fontWeight: 'bold' }}
                >
                  {column.label}
                </TableCell>
              ))}
              {showActionColumn && (
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '300px', minWidth: '300px', maxWidth: '300px', padding: '8px' }}>
                  操作
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
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
                        maxWidth: column.priority === 0 ? 'none' : column.minWidth,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {column.format ? column.format(value) : value}
                    </TableCell>
                  );
                })}
                {showActionColumn && (
                  <TableCell align="center" sx={{ width: '300px', minWidth: '300px', maxWidth: '300px', padding: '8px' }}>
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