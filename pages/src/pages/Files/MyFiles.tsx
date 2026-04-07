/**
 * 我的文件 — 用户个人文件空间
 * 基于 /@home/用户名 路径的文件管理
 */
import React from 'react';
import { Card, Typography, Empty } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store';

const { Title, Text } = Typography;

const MyFiles: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <FolderOutlined style={{ marginRight: 12 }} />
          我的文件
        </Title>
        <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
          {user?.users_name} 的个人文件空间
        </Text>
      </div>

      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text type="secondary">个人文件空间为空</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                您可以上传文件到个人空间，这些文件仅您自己可见
              </Text>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default MyFiles;
