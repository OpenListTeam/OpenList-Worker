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
import { Edit, Delete, Share, Download, Visibility } from '@mui/icons-material';

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
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onShare?: (row: any) => void;
  onDownload?: (row: any) => void;
  onView?: (row: any) => void;
  actions?: ('edit' | 'delete' | 'share' | 'download' | 'view')[];
}

const DataTable: React.FC<DataTableProps> = ({
  title,
  columns,
  data,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  onView,
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
        <IconButton size="small" onClick={() => onView?.(row)}>
          <Visibility fontSize="small" />
        </IconButton>
      )}
      {actions.includes('edit') && (
        <IconButton size="small" onClick={() => onEdit?.(row)}>
          <Edit fontSize="small" />
        </IconButton>
      )}
      {actions.includes('delete') && (
        <IconButton size="small" onClick={() => onDelete?.(row)}>
          <Delete fontSize="small" />
        </IconButton>
      )}
      {actions.includes('share') && (
        <IconButton size="small" onClick={() => onShare?.(row)}>
          <Share fontSize="small" />
        </IconButton>
      )}
      {actions.includes('download') && (
        <IconButton size="small" onClick={() => onDownload?.(row)}>
          <Download fontSize="small" />
        </IconButton>
      )}
    </Box>
  );

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <TableContainer component={Paper} sx={{ height: '100%', borderRadius: '20px' }}>
        <Table stickyHeader sx={{ minWidth: 650 }} aria-label="data table">
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
              <TableRow hover role="checkbox" tabIndex={-1} key={index}>
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