/**
 * 云端复制页面
 * 管理云端文件复制任务
 */
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Modal, Typography, Space, Tag, message, Popconfirm, Empty } from 'antd';
import { CopyOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title, Text } = Typography;

interface CopyTask {
  tasks_uuid: string;
  source_path: string;
  target_path: string;
  status: string;
  progress: number;
  created_at: string;
}

const CloudCopy: React.FC = () => {
  const [tasks, setTasks] = useState<CopyTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res: any = await apiService.get('/api/task/copy/undone');
      setTasks(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error('获取复制任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleCreate = async (values: any) => {
    try {
      const res: any = await apiService.post('/api/fs/copy', {
        src_dir: values.source_path,
        dst_dir: values.target_path,
        names: [],
      });
      message.success('复制任务已创建');
      setModalVisible(false);
      form.resetFields();
      fetchTasks();
    } catch (error: any) {
      message.error(error.message || '创建失败');
    }
  };

  const columns = [
    { title: '源路径', dataIndex: 'source_path', key: 'source_path', render: (_: any, r: any) => {
      try { const info = JSON.parse(r.tasks_info || '{}'); return info.source_path || '-'; } catch { return '-'; }
    }},
    { title: '目标路径', dataIndex: 'target_path', key: 'target_path', render: (_: any, r: any) => {
      try { const info = JSON.parse(r.tasks_info || '{}'); return info.target_path || '-'; } catch { return '-'; }
    }},
    {
      title: '状态', dataIndex: 'tasks_flag', key: 'tasks_flag',
      render: (v: number) => {
        const map: Record<number, { color: string; text: string }> = {
          0: { color: 'default', text: '等待中' },
          1: { color: 'blue', text: '执行中' },
          2: { color: 'green', text: '已完成' },
          3: { color: 'red', text: '失败' },
        };
        const item = map[v] || { color: 'default', text: '未知' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <Popconfirm title="确定删除此任务？" onConfirm={async () => {
          try {
            await apiService.post('/api/task/copy/delete', { tid: record.tasks_uuid });
            message.success('任务已删除');
            fetchTasks();
          } catch (e: any) { message.error(e.message); }
        }}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <CopyOutlined style={{ marginRight: 12 }} />
          云端复制
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchTasks}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>新建任务</Button>
        </Space>
      </div>

      <Card>
        <Table columns={columns} dataSource={tasks} rowKey="tasks_uuid" loading={loading} pagination={false} />
      </Card>

      <Modal title="新建云端复制任务" open={modalVisible} onCancel={() => setModalVisible(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="源路径" name="source_path" rules={[{ required: true }]}>
            <Input placeholder="要复制的文件/文件夹路径" />
          </Form.Item>
          <Form.Item label="目标路径" name="target_path" rules={[{ required: true }]}>
            <Input placeholder="复制到的目标路径" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CloudCopy;
