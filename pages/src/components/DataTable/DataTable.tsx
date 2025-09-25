import React, { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TableSortLabel,
    Checkbox,
    Paper,
    Toolbar,
    Typography,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Delete as DeleteIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';

interface Column {
    id: string;
    label: string;
    minWidth?: number;
    align?: 'right' | 'left' | 'center';
    format?: (value: any) => string;
    sortable?: boolean;
}

interface DataTableProps {
    columns: Column[];
    rows: any[];
    title?: string;
    showCheckbox?: boolean;
    showPagination?: boolean;
    showToolbar?: boolean;
    onSelectionChange?: (selected: string[]) => void;
    onRowClick?: (row: any) => void;
    loading?: boolean;
}

interface Order {
    direction: 'asc' | 'desc';
    id: string;
}

const DataTable: React.FC<DataTableProps> = ({
    columns,
    rows,
    title,
    showCheckbox = false,
    showPagination = true,
    showToolbar = true,
    onSelectionChange,
    onRowClick,
    loading = false
}) => {
    const [order, setOrder] = useState<Order>({ direction: 'asc', id: '' });
    const [selected, setSelected] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleRequestSort = (property: string) => {
        const isAsc = order.id === property && order.direction === 'asc';
        setOrder({ direction: isAsc ? 'desc' : 'asc', id: property });
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = rows.map((row) => row.id);
            setSelected(newSelected);
            onSelectionChange?.(newSelected);
            return;
        }
        setSelected([]);
        onSelectionChange?.([]);
    };

    const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }

        setSelected(newSelected);
        onSelectionChange?.(newSelected);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const isSelected = (id: string) => selected.indexOf(id) !== -1;

    // 排序逻辑
    const sortedRows = useMemo(() => {
        if (!order.id) return rows;

        return [...rows].sort((a, b) => {
            const aValue = a[order.id];
            const bValue = b[order.id];

            if (aValue < bValue) {
                return order.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return order.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [rows, order]);

    // 分页逻辑
    const paginatedRows = useMemo(() => {
        if (!showPagination) return sortedRows;
        return sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [sortedRows, page, rowsPerPage, showPagination]);

    const emptyRows = rowsPerPage - Math.min(rowsPerPage, rows.length - page * rowsPerPage);

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '16px' }}>
            {showToolbar && (
                <Toolbar
                    sx={{
                        pl: { sm: 2 },
                        pr: { xs: 1, sm: 1 },
                    }}
                >
                    {selected.length > 0 ? (
                        <Typography
                            sx={{ flex: '1 1 100%' }}
                            color="inherit"
                            variant="subtitle1"
                            component="div"
                        >
                            {selected.length} 项已选择
                        </Typography>
                    ) : (
                        <Typography
                            sx={{ flex: '1 1 100%' }}
                            variant="h6"
                            id="tableTitle"
                            component="div"
                        >
                            {title}
                        </Typography>
                    )}

                    {selected.length > 0 ? (
                        <Tooltip title="删除">
                            <IconButton>
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="筛选列表">
                            <IconButton>
                                <FilterListIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Toolbar>
            )}

            <TableContainer>
                <Table stickyHeader aria-label="数据表格">
                    <TableHead>
                        <TableRow>
                            {showCheckbox && (
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        color="primary"
                                        indeterminate={selected.length > 0 && selected.length < rows.length}
                                        checked={rows.length > 0 && selected.length === rows.length}
                                        onChange={handleSelectAllClick}
                                        inputProps={{
                                            'aria-label': 'select all desserts',
                                        }}
                                    />
                                </TableCell>
                            )}
                            {columns.map((column) => (
                                <TableCell
                                    key={column.id}
                                    align={column.align}
                                    style={{ minWidth: column.minWidth }}
                                >
                                    {column.sortable !== false ? (
                                        <TableSortLabel
                                            active={order.id === column.id}
                                            direction={order.id === column.id ? order.direction : 'asc'}
                                            onClick={() => handleRequestSort(column.id)}
                                        >
                                            {column.label}
                                        </TableSortLabel>
                                    ) : (
                                        column.label
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + (showCheckbox ? 1 : 0)} align="center">
                                    加载中...
                                </TableCell>
                            </TableRow>
                        ) : paginatedRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + (showCheckbox ? 1 : 0)} align="center">
                                    暂无数据
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {paginatedRows.map((row, index) => {
                                    const isItemSelected = isSelected(row.id);
                                    const labelId = `enhanced-table-checkbox-${index}`;

                                    return (
                                        <TableRow
                                            hover
                                            onClick={(event) => {
                                                if (showCheckbox) {
                                                    handleClick(event, row.id);
                                                } else if (onRowClick) {
                                                    onRowClick(row);
                                                }
                                            }}
                                            role={showCheckbox ? "checkbox" : undefined}
                                            aria-checked={isItemSelected}
                                            tabIndex={-1}
                                            key={row.id}
                                            selected={isItemSelected}
                                        >
                                            {showCheckbox && (
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        color="primary"
                                                        checked={isItemSelected}
                                                        inputProps={{
                                                            'aria-labelledby': labelId,
                                                        }}
                                                    />
                                                </TableCell>
                                            )}
                                            {columns.map((column) => {
                                                const value = row[column.id];
                                                return (
                                                    <TableCell key={column.id} align={column.align}>
                                                        {column.format && value != null
                                                            ? column.format(value)
                                                            : value}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })}
                                {emptyRows > 0 && (
                                    <TableRow
                                        style={{
                                            height: 53 * emptyRows,
                                        }}
                                    >
                                        <TableCell colSpan={columns.length + (showCheckbox ? 1 : 0)} />
                                    </TableRow>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {showPagination && (
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={rows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="每页行数"
                    labelDisplayedRows={({ from, to, count }) =>
                        `第 ${from}-${to} 行，共 ${count} 行`
                    }
                />
            )}
        </Paper>
    );
};

export default DataTable;