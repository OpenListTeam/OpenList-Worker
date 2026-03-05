import React, {useState, useEffect} from 'react';
import {
    Button,
    Tag,
    Alert,
    Modal,
    Typography,
    Row,
    Col,
    Card,
    Space,
    message,
} from 'antd';
import {PlusOutlined, EditOutlined, DeleteOutlined} from '@ant-design/icons';
import DataTable from '../../components/DataTable';
import UserDialog from '../../components/UserDialog';
import {User, UsersConfig, CreateUserRequest, UpdateUserRequest} from '../../types';
import {useUsers} from '../../hooks/useUsers';

const {Title, Text} = Typography;

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UsersConfig | null>(null);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
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
                message.error(result.text);
            }
        } catch (err) {
            message.error('加载用户数据失败');
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

    // 渲染网格视图
    const renderGridView = () => (
        <Row gutter={[16, 16]}>
            {filteredUsers.map((user: User) => (
                <Col xs={24} sm={12} md={8} lg={6} key={user.users_name}>
                    <Card
                        hoverable
                        actions={[
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(user)}
                                key="edit"
                            />,
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDelete(user)}
                                key="delete"
                            />,
                        ]}
                    >
                        <Card.Meta
                            title={user.users_name}
                            description={user.users_mail}
                        />
                        <div style={{marginTop: 12}}>
                            <Space direction="vertical" size={8} style={{width: '100%'}}>
                                <div>
                                    <Tag color="blue">{user.users_mask}</Tag>
                                </div>
                                <div>
                                    <Tag color={user.is_enabled === 1 ? 'success' : 'default'}>
                                        {user.is_enabled === 1 ? '启用' : '禁用'}
                                    </Tag>
                                </div>
                                <Text type="secondary" style={{fontSize: 12}}>
                                    存储: {(user.total_used / 1024 / 1024 / 1024).toFixed(2)}GB
                                    / {(user.total_size / 1024 / 1024 / 1024).toFixed(2)}GB
                                </Text>
                            </Space>
                        </div>
                    </Card>
                </Col>
            ))}
        </Row>
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
                const isEnabled = value === 'true';
                return (
                    <Tag color={isEnabled ? 'success' : 'default'}>
                        {isEnabled ? '启用' : '禁用'}
                    </Tag>
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
                message.success(result.text);
                await loadUsers();
                setUserDialogOpen(false);
            } else {
                message.error(result.text);
            }
        } catch (err) {
            message.error('操作失败，请稍后重试');
        }
    };

    // 确认删除用户
    const handleConfirmDelete = async () => {
        if (!selectedUser) return;

        try {
            const result = await deleteUser(selectedUser.users_name);
            if (result.flag) {
                message.success(result.text);
                await loadUsers();
            } else {
                message.error(result.text);
            }
        } catch (err) {
            message.error('删除失败，请稍后重试');
        } finally {
            setDeleteDialogOpen(false);
            setSelectedUser(null);
        }
    };

    return (
        <div style={{padding: 24}}>
            {error && (
                <Alert
                    message={error}
                    type="error"
                    showIcon
                    closable
                    style={{marginBottom: 16}}
                />
            )}

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                <Title level={4} style={{margin: 0}}>
                    用户管理
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateUser}
                    loading={loading}
                >
                    创建用户
                </Button>
            </div>

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
            <Modal
                title="确认删除"
                open={deleteDialogOpen}
                onCancel={() => setDeleteDialogOpen(false)}
                footer={[
                    <Button
                        key="cancel"
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={loading}
                    >
                        取消
                    </Button>,
                    <Button
                        key="confirm"
                        type="primary"
                        danger
                        loading={loading}
                        onClick={handleConfirmDelete}
                    >
                        确认删除
                    </Button>,
                ]}
            >
                <Text>
                    确定要删除用户 "<Text strong>{selectedUser?.users_name}</Text>" 吗？此操作不可撤销。
                </Text>
            </Modal>
        </div>
    );
};

export default UserManagement;