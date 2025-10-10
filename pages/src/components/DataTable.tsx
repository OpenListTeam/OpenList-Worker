import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Box,
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
  Replay
} from '@mui/icons-material';

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
  const renderStatusChip = (status: number) => (
    <Chip
      label={status === 1 ? '启用' : '禁用'}
      size="small"
      color={status === 1 ? 'success' : 'default'}
    />
  );

  const renderActionButtons = (row: any) => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {actions.includes('view') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onView?.(row); }} disabled={loading}>
          <Visibility fontSize="small" />
        </IconButton>
      )}
      {actions.includes('download') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDownload?.(row); }} disabled={loading}>
          <Download fontSize="small" />
        </IconButton>
      )}
      {actions.includes('copy') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCopy?.(row); }} disabled={loading}>
          <FileCopy fontSize="small" />
        </IconButton>
      )}
      {actions.includes('move') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMove?.(row); }} disabled={loading}>
          <DriveFileMove fontSize="small" />
        </IconButton>
      )}
      {actions.includes('reload') && (
        <IconButton 
          size="small" 
          onClick={(e) => { e.stopPropagation(); onReload?.(row); }} 
          disabled={loading}
          title="重新加载"
        >
          <Replay fontSize="small" />
        </IconButton>
      )}
      {actions.includes('edit') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit?.(row); }} disabled={loading}>
          <Edit fontSize="small" />
        </IconButton>
      )}
      {actions.includes('delete') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete?.(row); }} disabled={loading}>
          <Delete fontSize="small" />
        </IconButton>
      )}
      {actions.includes('share') && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onShare?.(row); }} disabled={loading}>
          <Share fontSize="small" />
        </IconButton>
      )}
    </Box>
  );

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <TableContainer component={Paper} sx={{ height: '100%', borderRadius: '15px' }}>
        <Table stickyHeader sx={{ minWidth: 500 }} aria-label="data table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sx={{ fontWeight: 'bold' }}
                >
                  {column.label}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                操作
              </TableCell>
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
                {columns.map((column) => {
                  const value = row[column.id];
                  return (
                    <TableCell key={column.id} align={column.align}>
                      {column.format ? column.format(value) : value}
                    </TableCell>
                  );
                })}
                <TableCell align="center">
                  {renderActionButtons(row)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DataTable;