import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  List,
  Modal,
  message,
  Space,
  Alert,
  Divider,
  Tag,
  Input,
  Empty,
} from 'antd';
import {
  KeyOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { apiService } from '../posts/api';
import { startRegistration } from '@simplewebauthn/browser';

const { Title, Text } = Typography;

interface WebAuthnCredential {
  id: string;
  device_name: string;
  created_at: number;
  last_used_at?: number;
  transports: string[];
}

interface WebAuthnManagementProps {
  onStatusChange?: (hasCredentials: boolean) => void;
}

const WebAuthnManagement: React.FC<WebAuthnManagementProps> = ({ onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<WebAuthnCredential | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');

  // 加载凭据列表
  const loadCredentials = async () => {
    try {
      setLoading(true);
      const result = await apiService.get('/api/authn/credentials');
      setCredentials(result?.credentials || []);
      onStatusChange?.(result?.credentials?.length > 0);
    } catch (err: any) {
      console.error('加载凭据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  // 添加新凭据
  const handleAddCredential = async () => {
    if (!newDeviceName.trim()) {
      message.error('请输入设备名称');
      return;
    }

    try {
      setLoading(true);

      // 1. 请求注册选项
      const optionsResult = await apiService.post('/api/authn/registration/begin', {
        authenticator_attachment: 'platform', // 可选：platform（内置）或 cross-platform（外置）
      });

      // 2. 调用浏览器 WebAuthn API
      const credential = await startRegistration(optionsResult);

      // 3. 提交凭据到服务器
      await apiService.post('/api/authn/registration/finish', {
        challenge_key: optionsResult.challenge_key,
        credential,
        device_name: newDeviceName,
      });

      message.success('安全密钥已成功添加');
      setAddModalVisible(false);
      setNewDeviceName('');
      await loadCredentials();
    } catch (err: any) {
      console.error('添加凭据失败:', err);
      if (err?.name === 'NotAllowedError') {
        message.error('用户取消了操作或设备不支持');
      } else {
        message.error(err?.message || '添加失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 删除凭据
  const handleDeleteCredential = (credential: WebAuthnCredential) => {
    Modal.confirm({
      title: '删除安全密钥',
      content: `确定要删除设备"${credential.device_name}"吗？删除后将无法使用该密钥登录。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiService.post('/api/authn/credentials/delete', {
            credential_id: credential.id,
          });
          message.success('安全密钥已删除');
          await loadCredentials();
        } catch (err: any) {
          message.error(err?.message || '删除失败');
        }
      },
    });
  };

  // 重命名凭据
  const handleRenameCredential = async () => {
    if (!selectedCredential || !newDeviceName.trim()) {
      message.error('请输入新的设备名称');
      return;
    }

    try {
      setLoading(true);
      await apiService.post('/api/authn/credentials/rename', {
        credential_id: selectedCredential.id,
        device_name: newDeviceName,
      });
      message.success('设备名称已更新');
      setRenameModalVisible(false);
      setSelectedCredential(null);
      setNewDeviceName('');
      await loadCredentials();
    } catch (err: any) {
      message.error(err?.message || '重命名失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '从未使用';
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  return (
    <Card style={{ borderRadius: 15 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            <KeyOutlined style={{ fontSize: 20, color: credentials.length > 0 ? '#52c41a' : '#8c8c8c' }} />
            <Title level={5} style={{ margin: 0 }}>
              安全密钥（WebAuthn）
            </Title>
            {credentials.length > 0 && (
              <Tag color="success">{credentials.length} 个密钥</Tag>
            )}
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalVisible(true)}
            loading={loading}
          >
            添加密钥
          </Button>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <Alert
          message="安全密钥说明"
          description="使用 FIDO2/WebAuthn 硬件密钥或生物识别（如指纹、面容）进行无密码登录，提供更高的安全性。"
          type="info"
          showIcon
        />

        {credentials.length === 0 ? (
          <Empty
            description="尚未添加安全密钥"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={credentials}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="rename"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setSelectedCredential(item);
                      setNewDeviceName(item.device_name);
                      setRenameModalVisible(true);
                    }}
                  >
                    重命名
                  </Button>,
                  <Button
                    key="delete"
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteCredential(item)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<SafetyOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                  title={item.device_name}
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        添加时间：{formatDate(item.created_at)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        最后使用：{formatDate(item.last_used_at)}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Space>

      {/* 添加凭据 Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#1890ff' }} />
            <span>添加安全密钥</span>
          </Space>
        }
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          setNewDeviceName('');
        }}
        onOk={handleAddCredential}
        okText="添加"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="准备您的安全密钥"
            description='点击"添加"后，请按照浏览器提示使用硬件密钥、指纹或面容进行注册。'
            type="info"
            showIcon
          />
          <div>
            <Text>设备名称</Text>
            <Input
              placeholder="例如：YubiKey 5、MacBook 指纹"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              maxLength={50}
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>

      {/* 重命名 Modal */}
      <Modal
        title="重命名安全密钥"
        open={renameModalVisible}
        onCancel={() => {
          setRenameModalVisible(false);
          setSelectedCredential(null);
          setNewDeviceName('');
        }}
        onOk={handleRenameCredential}
        okText="保存"
        cancelText="取消"
        confirmLoading={loading}
      >
        <div>
          <Text>新设备名称</Text>
          <Input
            placeholder="请输入新的设备名称"
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            maxLength={50}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </Card>
  );
};

export default WebAuthnManagement;
