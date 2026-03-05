import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  List,
  Divider,
  Spin,
  Alert,
  Row,
  Col,
  Space,
} from 'antd';
import {
  InfoCircleOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { systemApi } from '../../posts/api';

interface SystemInfo {
  version?: string;
  build?: string;
  nodeVersion?: string;
  platform?: string;
  uptime?: string;
  memory?: string;
  cpuUsage?: string;
}

const AboutPlatform: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取系统信息
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        setLoading(true);
        const response = await systemApi.getSystemInfo();
        
        if (response.flag && response.data) {
          setSystemInfo(response.data);
        } else {
          setError(response.text || '获取系统信息失败');
        }
      } catch (err: any) {
        console.error('获取系统信息失败:', err);
        setError(err.message || '获取系统信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchSystemInfo();
  }, []);

  const features = [
    '多驱动器支持 (OneDrive, Google Drive, 百度网盘等)',
    '文件加密和分享功能',
    '用户权限管理',
    '离线下载和任务管理',
    'WebDAV和FTP支持',
    '响应式Web界面',
    'RESTful API接口',
    '插件扩展系统',
  ];

  const technologies = [
    { name: '前端', tech: 'React 18 + TypeScript + Ant Design' },
    { name: '后端', tech: 'Node.js + Express + TypeScript' },
    { name: '数据库', tech: 'SQLite' },
    { name: '构建工具', tech: 'Vite' },
    { name: '部署', tech: 'Docker + Nginx' },
  ];

  // 系统信息列表数据
  const systemInfoItems = systemInfo
    ? [
        { label: '版本号', value: systemInfo.version || '未知' },
        { label: '构建时间', value: systemInfo.build || '未知' },
        { label: 'Node.js版本', value: systemInfo.nodeVersion || '未知' },
        { label: '运行平台', value: systemInfo.platform || '未知' },
        { label: '运行时间', value: systemInfo.uptime || '未知' },
        { label: '内存使用', value: systemInfo.memory || '未知' },
        ...(systemInfo.cpuUsage ? [{ label: 'CPU信息', value: systemInfo.cpuUsage }] : []),
      ]
    : [];

  return (
    <div style={{ width: '100%', height: '100%', padding: 24 }}>
      <Row gutter={[24, 24]}>
        {/* 系统信息 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined style={{ color: 'var(--ant-color-primary)' }} />
                <span>系统信息</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <Spin />
              </div>
            ) : error ? (
              <Alert message={error} type="error" showIcon />
            ) : systemInfo ? (
              <List
                size="small"
                dataSource={systemInfoItems}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta title={item.label} description={item.value} />
                  </List.Item>
                )}
              />
            ) : (
              <Alert message="暂无系统信息" type="info" showIcon />
            )}
          </Card>
        </Col>

        {/* 技术栈 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <CodeOutlined style={{ color: 'var(--ant-color-primary)' }} />
                <span>技术栈</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <List
              size="small"
              dataSource={technologies}
              renderItem={(tech) => (
                <List.Item>
                  <List.Item.Meta title={tech.name} description={tech.tech} />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 主要功能 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined style={{ color: 'var(--ant-color-primary)' }} />
                <span>主要功能</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <Row gutter={[16, 12]}>
              {features.map((feature, index) => (
                <Col xs={24} md={12} key={index}>
                  <Space align="center">
                    <DatabaseOutlined style={{ color: 'var(--ant-color-text-secondary)', fontSize: 14 }} />
                    <Typography.Text>{feature}</Typography.Text>
                  </Space>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* 开发团队 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <TeamOutlined style={{ color: 'var(--ant-color-primary)' }} />
                <span>开发团队</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <Typography.Paragraph>
              OpenList 是一个开源的云存储管理项目，旨在为用户提供一个统一、安全、易用的多云存储管理平台。
            </Typography.Paragraph>
            <Typography.Text type="secondary">
              项目地址: https://github.com/OpenListTeam/OpenList
            </Typography.Text>
            <br />
            <Typography.Text type="secondary">
              文档地址: https://docs.oplist.org
            </Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AboutPlatform;