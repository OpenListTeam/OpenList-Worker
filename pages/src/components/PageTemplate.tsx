import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    TextField,
    InputAdornment,
    Breadcrumbs,
    Link
} from '@mui/material';
import {
    Add,
    Search,
    Refresh,
    FilterList,
    Download,
    Upload,
    MoreVert
} from '@mui/icons-material';

interface PageTemplateProps {
    title: string;
    breadcrumbs?: Array<{ name: string; href?: string }>;
    onSearch?: (value: string) => void;
    onRefresh?: () => void;
    onAdd?: () => void;
    onUpload?: () => void;
    onDownload?: () => void;
    searchPlaceholder?: string;
    showSearch?: boolean;
    showAdd?: boolean;
    showRefresh?: boolean;
    showFilter?: boolean;
    showUpload?: boolean;
    showDownload?: boolean;
    children: React.ReactNode;
}

const PageTemplate: React.FC<PageTemplateProps> = ({
    title,
    breadcrumbs = [],
    onSearch,
    onRefresh,
    onAdd,
    onUpload,
    onDownload,
    searchPlaceholder = '搜索...',
    showSearch = true,
    showAdd = true,
    showRefresh = true,
    showFilter = false,
    showUpload = false,
    showDownload = false,
    children
}) => {
    const [searchValue, setSearchValue] = React.useState('');

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchValue(value);
        if (onSearch) {
            onSearch(value);
        }
    };

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 页面标题和面包屑 */}
            <Box sx={{ mb: 2 }}>
                {breadcrumbs.length > 0 && (
                    <Breadcrumbs sx={{ mb: 1 }}>
                        {breadcrumbs.map((crumb, index) => (
                            <Link
                                key={index}
                                href={crumb.href}
                                underline="hover"
                                color="inherit"
                            >
                                {crumb.name}
                            </Link>
                        ))}
                    </Breadcrumbs>
                )}
                <Typography variant="h4" component="h1" gutterBottom>
                    {title}
                </Typography>
            </Box>

            {/* 操作栏 */}
            <Paper sx={{ p: 2, mb: 2, borderRadius: '16px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {/* 搜索框 */}
                    {showSearch && (
                        <TextField
                            size="small"
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={handleSearchChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: 200 }}
                        />
                    )}

                    {/* 操作按钮 */}
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                        {showFilter && (
                            <IconButton size="small" title="筛选">
                                <FilterList />
                            </IconButton>
                        )}
                        {showRefresh && (
                            <IconButton size="small" onClick={handleRefresh} title="刷新">
                                <Refresh />
                            </IconButton>
                        )}
                        {showUpload && onUpload && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Upload />}
                                onClick={onUpload}
                            >
                                上传
                            </Button>
                        )}
                        {showDownload && onDownload && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Download />}
                                onClick={onDownload}
                            >
                                下载
                            </Button>
                        )}
                        {showAdd && onAdd && (
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<Add />}
                                onClick={onAdd}
                            >
                                新增
                            </Button>
                        )}
                        <IconButton size="small" title="更多操作">
                            <MoreVert />
                        </IconButton>
                    </Box>
                </Box>
            </Paper>

            {/* 主要内容区域 */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {children}
            </Box>
        </Box>
    );
};

export default PageTemplate;