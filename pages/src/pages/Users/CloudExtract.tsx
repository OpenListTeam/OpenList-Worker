/**
 * 云端解压页面
 * 管理云端文件解压任务
 */
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Modal, Typography, Space, Tag, message, Popconfirm, Select } from 'antd';
import { FileZipOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title } = Typography;

const CloudExtract: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res: any = await apiService.get('/api/task/decompress/undone');
      if (res.flag && res.data) {
        setTasks(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error('获取解压任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleCreate = async (values: any) => {
    try {
      const res: any = await apiService.post('/api/fs/other', {
        method: 'decompress',
        path: values.archive_path,
        dst_dir: values.target_path,
        password: values.password || '',
      });
      if (res.code === 200) {
        message.success('解压任务已创建');
        setModalVisible(false);
        form.resetFields();
        fetchTasks();
      } else {
        message.error(res.message || '创建失败');
      }
    } catch (error: any) {
      message.error(error.message || '创建失败');
    }
  };

  const columns = [
    { title: '压缩文件', key: 'archive', render: (_: any, r: any) => {
      try { return JSON.parse(r.tasks_info || '{}').archive_path || '-'; } catch { return '-'; }
    }},
    { title: '解压路径', key: 'target', render: (_: any, r: any) => {
      try { return JSON.parse(r.tasks_info || '{}').target_path || '-'; } catch { return '-'; }
    }},
    {
      title: '状态', dataIndex: 'tasks_flag', key: 'tasks_flag',
      render: (v: number) => {
        const map: Record<number, { color: string; text: string }> = {
          0: { color: 'default', text: '等待中' }, 1: { color: 'blue', text: '执行中' },
          2: { color: 'green', text: '已完成' }, 3: { color: 'red', text: '失败' },
        };
        const item = map[v] || { color: 'default', text: '未知' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <Popconfirm title="确定删除？" onConfirm={async () => {
          try {
            const res: any = await apiService.post('/api/task/decompress/delete', { tid: record.tasks_uuid });
            if (res.code === 200) { message.success('已删除'); fetchTasks(); }
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
          <FileZipOutlined style={{ marginRight: 12 }} />
          云端解压
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchTasks}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>新建任务</Button>
        </Space>
      </div>

      <Card>
        <Table columns={columns} dataSource={tasks} rowKey="tasks_uuid" loading={loading} pagination={false} />
      </Card>

      <Modal title="新建云端解压任务" open={modalVisible} onCancel={() => setModalVisible(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="压缩文件路径" name="archive_path" rules={[{ required: true }]}>
            <Input placeholder="要解压的压缩文件路径" />
          </Form.Item>
          <Form.Item label="解压目标路径" name="target_path" rules={[{ required: true }]}>
            <Input placeholder="解压到的目标路径" />
          </Form.Item>
          <Form.Item label="解压密码(可选)" name="password">
            <Input.Password placeholder="如果压缩文件有密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CloudExtract;
