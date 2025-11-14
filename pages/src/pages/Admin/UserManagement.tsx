import React, {useState, useEffect} from 'react';
import {
    Box,
    Button,
    Chip,
    Alert,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    IconButton
} from '@mui/material';
import {Add as AddIcon, Edit, Delete} from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import UserDialog from '../../components/UserDialog';
import {User, UsersConfig, CreateUserRequest, UpdateUserRequest} from '../../types';
import {useUsers} from '../../hooks/useUsers';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UsersConfig | null>(null);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [snackbar, setSnackbar] = useState({open: false, message: '', severity: 'success' as 'success' | 'error'});
    const [searchValue, setSearchValue] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    const {
        loading,
        error,
        getUsers,
        createUser,
        updateUser,
        deleteUser
    } = useUsers();

    // 搜索过滤函数
    const filterUsers = (searchTerm: string, userList: User[]) => {
        if (!searchTerm.trim()) {
            return userList;
        }

        const term = searchTerm.toLowerCase();
        return userList.filter(user =>
            user.users_name.toLowerCase().includes(term) ||
            user.users_mail.toLowerCase().includes(term) ||
            user.users_mask.toLowerCase().includes(term) ||
            (user.is_enabled === 1 ? '启用' : '禁用').includes(term)
        );
    };

    // 加载用户数据
    const loadUsers = async () => {
        try {
            const result = await getUsers();
            if (result.flag && result.data) {
                // 转换数据格式以适配前端显示
                const userData = result.data.map((user, index) => ({
                    users_uuid: index + 1,
                    users_name: user.users_name,
                    users_mail: user.users_mail,
                    users_pass: '***',
                    users_mask: user.users_mask || 'user',
                    is_enabled: user.is_enabled ? 1 : 0,
                    total_size: user.total_size || 0,
                    total_used: user.total_used || 0,
                    oauth_data: user.oauth_data || '{}',
                    mount_data: user.mount_data || '{}'
                }));
                setUsers(userData);
                setFilteredUsers(filterUsers(searchValue, userData));
            } else {
                showSnackbar(result.text, 'error');
            }
        } catch (err) {
            showSnackbar('加载用户数据失败', 'error');
        }
    };

    // 初始化加载数据
    useEffect(() => {
        loadUsers();
    }, []);

    // 监听搜索事件
    useEffect(() => {
        const handleSearchChange = (event: CustomEvent) => {
            const newSearchValue = event.detail.searchValue;
            setSearchValue(newSearchValue);
            setFilteredUsers(filterUsers(newSearchValue, users));
        };

        const handleSearchReset = () => {
            setSearchValue('');
            setFilteredUsers(users);
        };

        const handlePageRefresh = () => {
            loadUsers();
        };

        const handleViewModeChange = (event: CustomEvent) => {
            setViewMode(event.detail.viewMode);
        };

        window.addEventListener('searchChange', handleSearchChange as EventListener);
        window.addEventListener('searchReset', handleSearchReset);
        window.addEventListener('pageRefresh', handlePageRefresh);
        window.addEventListener('viewModeChange', handleViewModeChange as EventListener);

        return () => {
            window.removeEventListener('searchChange', handleSearchChange as EventListener);
            window.removeEventListener('searchReset', handleSearchReset);
            window.removeEventListener('pageRefresh', handlePageRefresh);
            window.removeEventListener('viewModeChange', handleViewModeChange as EventListener);
        };
    }, [users, searchValue]);

    // 当用户数据变化时，重新过滤
    useEffect(() => {
        setFilteredUsers(filterUsers(searchValue, users));
    }, [users, searchValue]);

    // 显示提示消息
    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({open: true, message, severity});
    };

    // 渲染网格视图
    const renderGridView = () => (
        <Grid container spacing={2}>
            {filteredUsers.map((user: User) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={user.users_name}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" component="div" gutterBottom>
                                {user.users_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {user.users_mail}
                            </Typography>
                            <Box sx={{mb: 1}}>
                                <Chip
                                    label={user.users_mask}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            </Box>
                            <Box sx={{mb: 1}}>
                                <Chip
                                    label={user.is_enabled === 1 ? '启用' : '禁用'}
                                    size="small"
                                    color={user.is_enabled === 1 ? 'success' : 'error'}
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                存储: {(user.total_used / 1024 / 1024 / 1024).toFixed(2)}GB
                                / {(user.total_size / 1024 / 1024 / 1024).toFixed(2)}GB
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <IconButton
                                size="small"
                                onClick={() => handleEdit(user)}
                                color="primary"
                            >
                                <Edit/>
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => handleDelete(user)}
                                color="error"
                            >
                                <Delete/>
                            </IconButton>
                        </CardActions>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    // 格式化文件大小
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 表格列定义
    const columns = [
        {id: 'users_name', label: '用户名', minWidth: 120},
        {
            id: 'users_mail',
            label: '邮箱',
            minWidth: 150,
            format: (value: string) => value || '-'
        },
        {
            id: 'users_mask',
            label: '用户权限',
            minWidth: 100,
            format: (value: string) => {
                const maskMap: { [key: string]: string } = {
                    'admin': '管理员',
                    'user': '普通用户',
                    'guest': '访客',
                };
                return maskMap[value] || value || '普通用户';
            }
        },
        {
            id: 'is_enabled',
            label: '状态',
            minWidth: 80,
            format: (value: string) => {
                // is_enabled只会是字符串类型
                const isEnabled = value === 'true';
                return (
                    <Chip
                        label={isEnabled ? '启用' : '禁用'}
                        size="small"
                        color={isEnabled ? 'success' : 'default'}
                    />
                );
            }
        },
        {
            id: 'total_size',
            label: '总空间',
            minWidth: 100,
            format: (value: number) => formatSize(value)
        },
        {
            id: 'total_used',
            label: '已用空间',
            minWidth: 100,
            format: (value: number) => formatSize(value)
        },
    ];

    // 处理创建用户
    const handleCreateUser = () => {
        setSelectedUser(null);
        setDialogMode('create');
        setUserDialogOpen(true);
    };

    // 处理编辑用户
    const handleEdit = (user: User) => {
        setSelectedUser({
            users_name: user.users_name,
            users_mail: user.users_mail,
            users_mask: user.users_mask,
            is_enabled: user.is_enabled === 1,
            total_size: user.total_size,
            total_used: user.total_used,
            oauth_data: user.oauth_data,
            mount_data: user.mount_data
        });
        setDialogMode('edit');
        setUserDialogOpen(true);
    };

    // 处理删除用户
    const handleDelete = (user: User) => {
        setSelectedUser({
            users_name: user.users_name,
            users_mail: user.users_mail,
            users_mask: user.users_mask,
            is_enabled: user.is_enabled === 1,
            total_size: user.total_size,
            total_used: user.total_used,
            oauth_data: user.oauth_data,
            mount_data: user.mount_data
        });
        setDeleteDialogOpen(true);
    };

    // 处理用户表单提交
    const handleUserSubmit = async (userData: CreateUserRequest | UpdateUserRequest) => {
        try {
            let result;
            if (dialogMode === 'create') {
                result = await createUser(userData as CreateUserRequest);
            } else {
                result = await updateUser(userData as UpdateUserRequest);
            }

            if (result.flag) {
                showSnackbar(result.text, 'success');
                await loadUsers(); // 重新加载数据
                setUserDialogOpen(false);
            } else {
                showSnackbar(result.text, 'error');
            }
        } catch (err) {
            showSnackbar('操作失败，请稍后重试', 'error');
        }
    };

    // 确认删除用户
    const handleConfirmDelete = async () => {
        if (!selectedUser) return;

        try {
            const result = await deleteUser(selectedUser.users_name);
            if (result.flag) {
                showSnackbar(result.text, 'success');
                await loadUsers(); // 重新加载数据
            } else {
                showSnackbar(result.text, 'error');
            }
        } catch (err) {
            showSnackbar('删除失败，请稍后重试', 'error');
        } finally {
            setDeleteDialogOpen(false);
            setSelectedUser(null);
        }
    };

    return (
        <Box sx={{p: 3}}>
            {error && (
                <Alert severity="error" sx={{mb: 2}}>
                    {error}
                </Alert>
            )}

            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                <Typography variant="h4" component="h1">
                    用户管理
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon/>}
                    onClick={handleCreateUser}
                    disabled={loading}
                >
                    创建用户
                </Button>
            </Box>

            {viewMode === 'table' ? (
                <DataTable
                    title=""
                    columns={columns}
                    data={filteredUsers}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    actions={['edit', 'delete']}
                />
            ) : (
                renderGridView()
            )}

            {/* 用户编辑对话框 */}
            <UserDialog
                open={userDialogOpen}
                onClose={() => setUserDialogOpen(false)}
                onSubmit={handleUserSubmit}
                user={selectedUser}
                mode={dialogMode}
                loading={loading}
            />

            {/* 删除确认对话框 */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>确认删除</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        确定要删除用户 "{selectedUser?.users_name}" 吗？此操作不可撤销。
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={loading}
                    >
                        取消
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? '删除中...' : '确认删除'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 提示消息 */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({...prev, open: false}))}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({...prev, open: false}))}
                    severity={snackbar.severity}
                    sx={{width: '100%'}}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UserManagement;