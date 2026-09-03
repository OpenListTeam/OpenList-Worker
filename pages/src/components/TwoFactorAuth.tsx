import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  Input,
  Modal,
  message,
  Space,
  Alert,
  Divider,
  Tag,
  QRCode,
} from 'antd';
import {
  SafetyOutlined,
  QrcodeOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { apiService } from '../posts/api';

const { Title, Text, Paragraph } = Typography;

interface TwoFactorAuthProps {
  onStatusChange?: (enabled: boolean) => void;
}

interface TOTPData {
  secret: string;
  otpauth_uri: string;
  enrollment_token: string;
  expires_in: number;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [totpData, setTotpData] = useState<TOTPData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [disableModalVisible, setDisableModalVisible] = useState(false);

  // 检查当前 2FA 状态
  const checkStatus = async () => {
    try {
      const result = await apiService.get('/api/me');
      const has2FA = !!(result?.otp_secret);
      setEnabled(has2FA);
      onStatusChange?.(has2FA);
    } catch (err) {
      console.error('检查 2FA 状态失败:', err);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // 生成 TOTP 密钥
  const handleGenerate = async () => {
    try {
      setLoading(true);
      const result = await apiService.post('/api/auth/2fa/generate');
      setTotpData({
        secret: result.secret,
        otpauth_uri: result.otpauth_uri,
        enrollment_token: result.enrollment_token,
        expires_in: result.expires_in || 600,
      });
      setSetupModalVisible(true);
    } catch (err: any) {
      message.error(err?.message || '生成 TOTP 密钥失败');
    } finally {
      setLoading(false);
    }
  };

  // 验证并启用 2FA
  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      message.error('请输入 6 位验证码');
      return;
    }

    try {
      setLoading(true);
      await apiService.post('/api/auth/2fa/verify', {
        code: verifyCode,
        enrollment_token: totpData?.enrollment_token,
      });
      message.success('二次验证已成功启用');
      setEnabled(true);
      setSetupModalVisible(false);
      setVerifyCode('');
      setTotpData(null);
      onStatusChange?.(true);
      await checkStatus();
    } catch (err: any) {
      message.error(err?.message || '验证码错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 停用 2FA
  const handleDisable = async () => {
    try {
      setLoading(true);
      await apiService.post('/api/auth/2fa/disable');
      message.success('二次验证已停用');
      setEnabled(false);
      setDisableModalVisible(false);
      onStatusChange?.(false);
      await checkStatus();
    } catch (err: any) {
      message.error(err?.message || '停用失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ borderRadius: 15 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            <SafetyOutlined style={{ fontSize: 20, color: enabled ? '#52c41a' : '#8c8c8c' }} />
            <Title level={5} style={{ margin: 0 }}>
              二次验证（TOTP）
            </Title>
            {enabled ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                已启用
              </Tag>
            ) : (
              <Tag color="default" icon={<CloseCircleOutlined />}>
                未启用
              </Tag>
            )}
          </Space>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {enabled ? (
          <>
            <Alert
              message="二次验证已启用"
              description="您的账户已启用基于时间的一次性密码（TOTP）二次验证，每次登录时需要提供验证码。"
              type="success"
              showIcon
            />
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => setDisableModalVisible(true)}
              loading={loading}
            >
              停用二次验证
            </Button>
          </>
        ) : (
          <>
            <Alert
              message="建议启用二次验证"
              description="二次验证（2FA）可以为您的账户提供额外的安全保护。启用后，登录时除了密码外，还需要提供动态验证码。"
              type="info"
              showIcon
            />
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
              您可以使用以下应用生成验证码：
              <br />• Google Authenticator
              <br />• Microsoft Authenticator
              <br />• Authy
              <br />• 其他支持 TOTP 的应用
            </Paragraph>
            <Button
              type="primary"
              icon={<QrcodeOutlined />}
              onClick={handleGenerate}
              loading={loading}
            >
              启用二次验证
            </Button>
          </>
        )}
      </Space>

      {/* 设置 2FA Modal */}
      <Modal
        title={
          <Space>
            <SafetyOutlined style={{ color: '#1890ff' }} />
            <span>设置二次验证</span>
          </Space>
        }
        open={setupModalVisible}
        onCancel={() => {
          setSetupModalVisible(false);
          setVerifyCode('');
          setTotpData(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setSetupModalVisible(false);
              setVerifyCode('');
              setTotpData(null);
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleVerify}
            disabled={!verifyCode || verifyCode.length !== 6}
          >
            验证并启用
          </Button>,
        ]}
        width={500}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="请按以下步骤操作"
            description="使用您的验证器应用扫描二维码或手动输入密钥，然后输入应用生成的 6 位验证码完成设置。"
            type="info"
            showIcon
          />

          {totpData && (
            <>
              <div style={{ textAlign: 'center' }}>
                <Title level={5}>1. 扫描二维码</Title>
                <div
                  style={{
                    display: 'inline-block',
                    padding: 16,
                    background: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                  }}
                >
                  <QRCode value={totpData.otpauth_uri} size={200} />
                </div>
              </div>

              <div>
                <Title level={5}>2. 或手动输入密钥</Title>
                <Input.TextArea
                  value={totpData.secret}
                  readOnly
                  autoSize={{ minRows: 2, maxRows: 3 }}
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  请妥善保存此密钥，用于在新设备上恢复二次验证。
                </Text>
              </div>

              <div>
                <Title level={5}>3. 输入验证码</Title>
                <Input
                  placeholder="请输入 6 位验证码"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  size="large"
                  style={{ fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                  onPressEnter={handleVerify}
                />
              </div>
            </>
          )}
        </Space>
      </Modal>

      {/* 停用确认 Modal */}
      <Modal
        title={
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>停用二次验证</span>
          </Space>
        }
        open={disableModalVisible}
        onCancel={() => setDisableModalVisible(false)}
        onOk={handleDisable}
        okText="确认停用"
        cancelText="取消"
        okButtonProps={{ danger: true, loading }}
      >
        <Alert
          message="警告"
          description="停用二次验证会降低您的账户安全性。确定要停用吗？"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </Modal>
    </Card>
  );
};

export default TwoFactorAuth;
