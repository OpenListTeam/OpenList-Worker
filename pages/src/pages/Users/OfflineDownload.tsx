import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Input,
  Typography,
  Alert,
  Space,
  Tag,
  message,
} from 'antd';
import {
  PlusOutlined,
  CaretRightOutlined,
  PauseOutlined,
  StopOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import DataTable from '../../components/DataTable';
import { PathSelectDialog } from '../../components/FileOperationDialogs';
import { useAuthStore } from '../../store';
import apiService from '../../posts/api';
import type { Fetch } from '../../types';

const { Title, Text } = Typography;

const OfflineDownload: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const [data, setData] = useState<Fetch[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pathSelectOpen, setPathSelectOpen] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [selectedPath, setSelectedPath] = useState('/');
  const [error, setError] = useState('');

  // 获取离线下载任务列表
  const fetchDownloadTasks = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/task/offline_download/undone');
      if (response.code === 200) {
        setData(response.data || []);
      }
    } catch (error) {
      console.error('获取离线下载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloadTasks();
  }, []);

  const getStatusText = (flag: number) => {
    const statusMap: { [key: number]: { text: string; color: string } } = {
      0: { text: '等待中', color: 'default' },
      1: { text: '下载中', color: 'processing' },
      2: { text: '已完成', color: 'success' },
      3: { text: '失败', color: 'error' },
      4: { text: '暂停', color: 'warning' },
    };
    return statusMap[flag] || { text: '未知', color: 'default' };
  };

  const columns = [
    { id: 'fetch_uuid', label: '任务UUID', minWidth: 150 },
    {
      id: 'fetch_from',
      label: '下载地址',
      minWidth: 300,
      format: (value: string) => (
        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </div>
      ),
    },
    { id: 'fetch_dest', label: '目标路径', minWidth: 150 },
    { id: 'fetch_user', label: '所属用户', minWidth: 120 },
    {
      id: 'fetch_flag',
      label: '任务状态',
      minWidth: 100,
      format: (value: number) => {
        const status = getStatusText(value);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
  ];

  const handleEdit = (item: Fetch) => {
    console.log('编辑离线下载任务:', item);
  };

  const handleDelete = async (item: Fetch) => {
    try {
      const response = await apiService.post('/api/task/offline_download/delete', {
        tid: item.fetch_uuid,
      });
      if (response.code === 200) {
        await fetchDownloadTasks();
      }
    } catch (error) {
      console.error('删除离线下载任务失败:', error);
    }
  };

  const handleAddDownload = () => {
    setDownloadUrl('');
    setSelectedPath('/');
    setError('');
    setAddDialogOpen(true);
  };

  const handleConfirmAdd = async () => {
    if (!downloadUrl.trim()) {
      setError('请输入下载链接');
      return;
    }

    try {
      const response = await apiService.post('/api/fs/add_offline_download', {
        path: selectedPath,
        urls: [downloadUrl.trim()],
        tool: 'simple_http',
        delete_policy: 'delete_on_upload_succeed',
      });

      if (response.code === 200) {
        setAddDialogOpen(false);
        await fetchDownloadTasks();
      } else {
        setError(response.message || '创建下载任务失败');
      }
    } catch (error: any) {
      setError(error.response?.data?.text || '创建下载任务失败');
    }
  };

  const handlePathSelect = (path: string) => {
    setSelectedPath(path);
    setPathSelectOpen(false);
  };

  // 批量操作函数
  const handleStartAllTasks = async () => {
    try {
      const pausedTasks = data.filter((task) => task.fetch_flag === 2);
      let successCount = 0;

      for (const task of pausedTasks) {
        const response = await apiService.post('/api/task/offline_download/retry', {
          tid: task.fetch_uuid,
        });
        if (response.code === 200) successCount++;
      }

      if (successCount > 0) {
        message.success(`成功启动 ${successCount} 个任务`);
        fetchDownloadTasks();
      } else {
        message.warning('没有可启动的任务');
      }
    } catch (error) {
      message.error('启动任务失败');
    }
  };

  const handlePauseAllTasks = async () => {
    try {
      const runningTasks = data.filter(
        (task) => task.fetch_flag === 0 || task.fetch_flag === 1
      );
      let successCount = 0;

      for (const task of runningTasks) {
        const response = await apiService.post('/api/task/offline_download/cancel', {
          tid: task.fetch_uuid,
        });
        if (response.code === 200) successCount++;
      }

      if (successCount > 0) {
        message.success(`成功暂停 ${successCount} 个任务`);
        fetchDownloadTasks();
      } else {
        message.warning('没有可暂停的任务');
      }
    } catch (error) {
      message.error('暂停任务失败');
    }
  };

  const handleStopAllTasks = async () => {
    try {
      const activeTasks = data.filter(
        (task) => task.fetch_flag !== 3 && task.fetch_flag !== 4
      );
      let successCount = 0;

      for (const task of activeTasks) {
        const response = await apiService.post('/api/task/offline_download/cancel', {
          tid: task.fetch_uuid,
        });
        if (response.code === 200) successCount++;
      }

      if (successCount > 0) {
        message.success(`成功停止 ${successCount} 个任务`);
        fetchDownloadTasks();
      } else {
        message.warning('没有可停止的任务');
      }
    } catch (error) {
      message.error('停止任务失败');
    }
  };

  const handleDeleteCompletedTasks = async () => {
    try {
      const completedTasks = data.filter(
        (task) => task.fetch_flag === 3 || task.fetch_flag === 4
      );
      let successCount = 0;

      for (const task of completedTasks) {
        const response = await apiService.post('/api/task/offline_download/delete', {
          tid: task.fetch_uuid,
        });
        if (response.code === 200) successCount++;
      }

      if (successCount > 0) {
        message.success(`成功删除 ${successCount} 个已完成任务`);
        fetchDownloadTasks();
      } else {
        message.warning('没有可删除的已完成任务');
      }
    } catch (error) {
      message.error('删除任务失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            离线下载
          </Title>
          <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
            创建和管理离线下载任务，支持多种下载协议
          </Text>
        </div>
        <Space size={12}>
          <Space.Compact>
            <Button icon={<CaretRightOutlined />} onClick={handleStartAllTasks}>
              开始所有
            </Button>
            <Button icon={<PauseOutlined />} onClick={handlePauseAllTasks}>
              暂停所有
            </Button>
            <Button icon={<StopOutlined />} onClick={handleStopAllTasks}>
              停止所有
            </Button>
            <Button icon={<DeleteOutlined />} onClick={handleDeleteCompletedTasks}>
              清理已完成
            </Button>
          </Space.Compact>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDownload}>
            添加下载
          </Button>
        </Space>
      </div>

      <DataTable
        title="离线下载"
        columns={columns}
        data={data}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        actions={['edit', 'delete']}
      />

      {/* 新增下载对话框 */}
      <Modal
        title="新增离线下载任务"
        open={addDialogOpen}
        onCancel={() => setAddDialogOpen(false)}
        onOk={handleConfirmAdd}
        okText="确定"
        cancelText="取消"
        width={520}
      >
        <div style={{ paddingTop: 8 }}>
          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              下载链接
            </label>
            <Input
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="请输入要下载的文件链接"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              目标路径
            </label>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={selectedPath} readOnly style={{ flex: 1 }} />
              <Button onClick={() => setPathSelectOpen(true)}>选择</Button>
            </Space.Compact>
          </div>
        </div>
      </Modal>

      {/* 路径选择对话框 */}
      <PathSelectDialog
        open={pathSelectOpen}
        onClose={() => setPathSelectOpen(false)}
        onConfirm={handlePathSelect}
        title="选择下载目标路径"
        currentPath={selectedPath}
        isPersonalFile={true}
      />
    </div>
  );
};

export default OfflineDownload;