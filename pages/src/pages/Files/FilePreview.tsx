/**
 * 文件预览页面
 * 展示文件详细信息，支持图片/视频/音频/文本/PDF 预览
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography, Card, Tag, Button, Breadcrumb, Spin, Alert,
  Divider, Select, Tooltip, Row, Col, Space, message,
} from 'antd';
import {
  ArrowLeftOutlined, FileOutlined, FileImageOutlined,
  VideoCameraOutlined, AudioOutlined, FilePdfOutlined,
  FileTextOutlined, FileZipOutlined, CodeOutlined,
  HomeOutlined, DownloadOutlined, CopyOutlined, LockOutlined,
} from '@ant-design/icons';
import api from '../../posts/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface FileItem {
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: number;
  fileUUID?: string;
  fileHash?: { md5?: string; sha1?: string; sha256?: string } | string;
  thumbnails?: string;
  timeModify?: string;
  timeCreate?: string;
  mimeType?: string;
}

const FilePreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileItem | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedHashType, setSelectedHashType] = useState<string>('md5');

  // 从 URL 解析文件路径（/preview/* → /*）
  const getFilePath = (): string => {
    const raw = location.pathname.replace('/preview', '') || '/';
    try { return decodeURIComponent(raw); } catch { return raw; }
  };

  const filePath = getFilePath();
  const fileName = filePath.split('/').pop() || '';
  const dirPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';

  // 获取文件信息（从目录列表中查找）
  const fetchFileInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/@files/list/path${dirPath}`);
      if (res?.flag && res?.data?.fileList) {
        const target = res.data.fileList.find((f: FileItem) => f.fileName === fileName);
        if (target) {
          setFileInfo(target);
        } else {
          setError('文件不存在');
        }
      } else {
        setError('获取目录信息失败');
      }
    } catch (e: any) {
      setError(e?.message || '获取文件信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取下载链接
  const fetchDownloadUrl = async () => {
    try {
      const res = await api.get(`/@files/link/path${filePath}`);
      if (res?.flag && res?.data?.[0]?.direct) {
        setDownloadUrl(res.data[0].direct);
      }
    } catch { /* 忽略，预览时不强制要求 */ }
  };

  useEffect(() => {
    fetchFileInfo();
    fetchDownloadUrl();
  }, [filePath]);

  // 哈希相关
  const getAvailableHashTypes = (): string[] => {
    if (!fileInfo?.fileHash) return [];
    if (typeof fileInfo.fileHash === 'string') return fileInfo.fileHash ? ['hash'] : [];
    return Object.entries(fileInfo.fileHash as Record<string, string>)
      .filter(([, v]) => v).map(([k]) => k);
  };

  const getHashValue = (): string => {
    if (!fileInfo?.fileHash) return '';
    if (typeof fileInfo.fileHash === 'string') return fileInfo.fileHash;
    return (fileInfo.fileHash as Record<string, string>)[selectedHashType] || '';
  };

  useEffect(() => {
    const types = getAvailableHashTypes();
    if (types.length > 0) setSelectedHashType(types.includes('md5') ? 'md5' : types[0]);
  }, [fileInfo]);

  // 格式化大小
  const formatSize = (bytes: number): string => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  };

  // 格式化时间
  const formatTime = (t?: string): string => {
    if (!t) return '-';
    const d = /^\d+$/.test(t)
      ? dayjs(Number(t) < 1e10 ? Number(t) * 1000 : Number(t))
      : dayjs(t);
    return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : t;
  };

  // 文件图标
  const getFileIcon = (name: string, size = 48) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const iconStyle = { fontSize: size };
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext))
      return <FileImageOutlined style={{ ...iconStyle, color: '#4CAF50' }} />;
    if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv'].includes(ext))
      return <VideoCameraOutlined style={{ ...iconStyle, color: '#FF9800' }} />;
    if (['mp3', 'flac', 'wav', 'aac', 'ogg'].includes(ext))
      return <AudioOutlined style={{ ...iconStyle, color: '#9C27B0' }} />;
    if (ext === 'pdf')
      return <FilePdfOutlined style={{ ...iconStyle, color: '#F44336' }} />;
    if (['doc', 'docx', 'txt', 'rtf', 'md'].includes(ext))
      return <FileTextOutlined style={{ ...iconStyle, color: '#2196F3' }} />;
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext))
      return <FileZipOutlined style={{ ...iconStyle, color: '#795548' }} />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'py', 'go', 'java'].includes(ext))
      return <CodeOutlined style={{ ...iconStyle, color: '#607D8B' }} />;
    if (['enc', 'zec'].includes(ext))
      return <LockOutlined style={{ ...iconStyle, color: '#EF4444' }} />;
    return <FileOutlined style={{ ...iconStyle, color: '#757575' }} />;
  };

  // 面包屑
  const breadcrumbItems = () => {
    const parts = dirPath.split('/').filter(Boolean);
    const items: any[] = [
      {
        key: 'home',
        title: (
          <a onClick={() => navigate('/files')}>
            <HomeOutlined style={{ marginRight: 4 }} />首页
          </a>
        ),
      },
    ];
    let acc = '';
    parts.forEach((part, i) => {
      acc += `/${part}`;
      const p = acc;
      items.push({
        key: i,
        title: <a onClick={() => navigate(`/files${p.split('/').map(encodeURIComponent).join('/')}` )}>{part}</a>,
      });
    });
    items.push({ key: 'file', title: fileName });
    return items;
  };

  // 预览内容渲染
  const renderPreview = () => {
    if (!fileInfo || fileInfo.fileType === 0) return null;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const url = downloadUrl;

    if (!url) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          暂无预览链接
        </div>
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      return (
        <div style={{ textAlign: 'center' }}>
          <img src={url} alt={fileName} style={{ maxWidth: '100%', maxHeight: 600, borderRadius: 8 }} />
        </div>
      );
    }
    if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
      return (
        <video controls style={{ width: '100%', maxHeight: 500, borderRadius: 8 }}>
          <source src={url} />
          您的浏览器不支持视频播放
        </video>
      );
    }
    if (['mp3', 'flac', 'wav', 'aac', 'ogg'].includes(ext)) {
      return (
        <audio controls style={{ width: '100%' }}>
          <source src={url} />
          您的浏览器不支持音频播放
        </audio>
      );
    }
    if (ext === 'pdf') {
      return (
        <iframe src={url} style={{ width: '100%', height: 600, border: 'none', borderRadius: 8 }} title={fileName} />
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        该文件类型暂不支持在线预览，请下载后查看
      </div>
    );
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回</Button>
        <Alert type="error" message={error} showIcon />
      </div>
    );
  }

  if (!fileInfo) return null;

  const hashTypes = getAvailableHashTypes();

  return (
    <div className="animate-fade-in-up">
      {/* 导航栏 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 12, minWidth: 0 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Breadcrumb items={breadcrumbItems()} style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} />
        </div>
      </div>

      {/* 文件信息卡片 */}
      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          {/* 文件图标 */}
          <div style={{
            width: 80, height: 80, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {getFileIcon(fileName)}
          </div>

          {/* 文件详情 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0, wordBreak: 'break-all' }}>{fileName}</Title>
              <Space>
                {downloadUrl && (
                  <Tooltip title="下载">
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => window.open(downloadUrl, '_blank')}
                    >
                      下载
                    </Button>
                  </Tooltip>
                )}
              </Space>
            </div>

            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12} md={8}>
                <Text type="secondary">大小：</Text>
                <Text>{formatSize(fileInfo.fileSize)}</Text>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Text type="secondary">修改时间：</Text>
                <Text>{formatTime(fileInfo.timeModify)}</Text>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Text type="secondary">创建时间：</Text>
                <Text>{formatTime(fileInfo.timeCreate)}</Text>
              </Col>
              <Col span={24}>
                <Text type="secondary">路径：</Text>
                <Text
                  style={{ wordBreak: 'break-all', userSelect: 'all' }}
                  title={dirPath}
                >{dirPath}</Text>
              </Col>
              {fileInfo.mimeType && (
                <Col xs={24} sm={12} md={8}>
                  <Text type="secondary">类型：</Text>
                  <Tag style={{ fontSize: 12 }}>{fileInfo.mimeType}</Tag>
                </Col>
              )}
              {hashTypes.length > 0 && (
                <Col span={24}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text type="secondary">校验值：</Text>
                    {hashTypes.length > 1 && (
                      <Select
                        size="small"
                        value={selectedHashType}
                        onChange={setSelectedHashType}
                        style={{ minWidth: 80 }}
                        options={hashTypes.map(t => ({ label: t.toUpperCase(), value: t }))}
                      />
                    )}
                    <Text style={{ wordBreak: 'break-all', flex: 1 }}>{getHashValue()}</Text>
                    {getHashValue() && (
                      <Tooltip title="复制">
                        <Button type="text" size="small" icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(getHashValue())} />
                      </Tooltip>
                    )}
                  </div>
                </Col>
              )}
            </Row>
          </div>
        </div>
      </Card>

      <Divider />

      {/* 预览区域 */}
      <Card variant="borderless" style={{ borderRadius: 12 }}>
        <Title level={5} style={{ marginBottom: 16 }}>文件预览</Title>
        <div style={{
          minHeight: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--ant-color-fill-quaternary, #fafafa)',
          borderRadius: 8, border: '1px dashed var(--ant-color-border, #d9d9d9)',
          padding: 16,
        }}>
          {renderPreview() || (
            <Text type="secondary">该文件类型暂不支持在线预览</Text>
          )}
        </div>
      </Card>
    </div>
  );
};

export default FilePreview;
