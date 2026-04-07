/**
 * 上传管理页面
 * 管理本地上传任务
 */
import React, { useState } from 'react';
import { Card, Upload, Button, Table, Progress, Typography, Space, Tag, message } from 'antd';
import { CloudUploadOutlined, InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface UploadTask {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'uploading' | 'success' | 'error' | 'pending';
  targetPath: string;
}

const UploadManage: React.FC = () => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const columns = [
    { title: '文件名', dataIndex: 'fileName', key: 'fileName' },
    {
      title: '大小', dataIndex: 'fileSize', key: 'fileSize',
      render: (v: number) => {
        if (v < 1024) return `${v} B`;
        if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
        if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(1)} MB`;
        return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`;
      },
    },
    { title: '目标路径', dataIndex: 'targetPath', key: 'targetPath' },
    {
      title: '进度', dataIndex: 'progress', key: 'progress',
      render: (v: number, record: UploadTask) => (
        <Progress
          percent={v}
          size="small"
          status={record.status === 'error' ? 'exception' : record.status === 'success' ? 'success' : 'active'}
        />
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const colors: Record<string, string> = { uploading: 'blue', success: 'green', error: 'red', pending: 'default' };
        const labels: Record<string, string> = { uploading: '上传中', success: '已完成', error: '失败', pending: '等待中' };
        return <Tag color={colors[v]}>{labels[v]}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: UploadTask) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setTasks(prev => prev.filter(t => t.id !== record.id))}
        >
          移除
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <CloudUploadOutlined style={{ marginRight: 12 }} />
        本地上传
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <Dragger
          multiple
          showUploadList={false}
          beforeUpload={(file) => {
            const newTask: UploadTask = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              fileName: file.name,
              fileSize: file.size,
              progress: 0,
              status: 'pending',
              targetPath: '/',
            };
            setTasks(prev => [...prev, newTask]);
            message.info(`已添加上传任务: ${file.name}`);
            return false; // 阻止自动上传
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">支持单个或批量上传</p>
        </Dragger>
      </Card>

      <Card title="上传任务列表">
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无上传任务' }}
        />
      </Card>
    </div>
  );
};

export default UploadManage;
