/**
 * 媒体库页面 — 支持视频影音、音乐音频、照片图片、书籍报刊
 * 根据路由路径自动识别媒体类型，调用后端 /@media API 获取数据
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Empty, Typography, Tag, List, Input, Spin, Pagination, Image, message } from 'antd';
import {
  VideoCameraOutlined,
  CustomerServiceOutlined,
  PictureOutlined,
  ReadOutlined,
  FileOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title, Text } = Typography;
const { Search } = Input;

// 媒体类型配置
type MediaCategory = 'video' | 'music' | 'image' | 'books';

interface MediaTypeConfig {
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  route: string;
}

const mediaTypeConfig: Record<MediaCategory, MediaTypeConfig> = {
  video: {
    title: '视频影音',
    icon: <VideoCameraOutlined style={{ fontSize: 48 }} />,
    color: '#1890ff',
    description: '浏览和播放视频文件，支持多种视频格式在线预览',
    route: '/media/video',
  },
  music: {
    title: '音乐音频',
    icon: <CustomerServiceOutlined style={{ fontSize: 48 }} />,
    color: '#52c41a',
    description: '浏览和播放音频文件，支持在线音乐播放器',
    route: '/media/music',
  },
  image: {
    title: '照片图片',
    icon: <PictureOutlined style={{ fontSize: 48 }} />,
    color: '#fa8c16',
    description: '浏览图片文件，支持相册模式和幻灯片播放',
    route: '/media/image',
  },
  books: {
    title: '书籍报刊',
    icon: <ReadOutlined style={{ fontSize: 48 }} />,
    color: '#722ed1',
    description: '浏览电子书和文档，支持PDF、EPUB等格式在线阅读',
    route: '/media/books',
  },
};

// 文件大小格式化
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 文件图标
function getFileIcon(fileName: string, category: MediaCategory): React.ReactNode {
  const iconStyle = { fontSize: 32, color: mediaTypeConfig[category].color };
  switch (category) {
    case 'video': return <VideoCameraOutlined style={iconStyle} />;
    case 'music': return <CustomerServiceOutlined style={iconStyle} />;
    case 'image': return <PictureOutlined style={iconStyle} />;
    case 'books': return <ReadOutlined style={iconStyle} />;
    default: return <FileOutlined style={iconStyle} />;
  }
}

interface MediaFile {
  fileName: string;
  fileSize: number;
  fileType: number;
  fullPath: string;
  mountPath: string;
  mediaType: MediaCategory;
  thumbnails?: string;
  timeModify?: string;
  timeCreate?: string;
}

const MediaLibrary: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 从路径中提取媒体类型
  const mediaType = useMemo<MediaCategory>(() => {
    const path = location.pathname;
    const match = path.match(/\/media\/(\w+)/);
    const type = match ? match[1] : 'video';
    return (Object.keys(mediaTypeConfig).includes(type) ? type : 'video') as MediaCategory;
  }, [location.pathname]);

  const config = mediaTypeConfig[mediaType];

  // 状态
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [keyword, setKeyword] = useState('');
  const [stats, setStats] = useState<Record<MediaCategory, number> | null>(null);

  // 获取媒体文件列表
  const fetchFiles = useCallback(async (p: number = 1, kw?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(pageSize),
      });
      if (kw) params.set('keyword', kw);

      const res: any = await apiService.get(`/api/admin/media/list/${mediaType}?${params.toString()}`);
      if (res && res.files !== undefined) {
        // 拦截器解包后直接是 data 对象
        setFiles(res.files || []);
        setTotal(res.total || 0);
        setPage(res.page || p);
      } else {
        setFiles([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('获取媒体列表失败:', error);
      setFiles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [mediaType, pageSize]);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      const res: any = await apiService.get('/api/admin/media/stats');
      if (res) {
        setStats(res);
      }
    } catch (error) {
      console.error('获取媒体统计失败:', error);
    }
  }, []);

  // 切换分类或初始化时加载数据
  useEffect(() => {
    setFiles([]);
    setTotal(0);
    setPage(1);
    setKeyword('');
    fetchFiles(1);
    fetchStats();
  }, [mediaType, fetchFiles, fetchStats]);

  // 搜索
  const handleSearch = (value: string) => {
    setKeyword(value);
    fetchFiles(1, value);
  };

  // 翻页
  const handlePageChange = (p: number) => {
    fetchFiles(p, keyword);
  };

  // 点击文件 — 跳转到文件管理器预览
  const handleFileClick = (file: MediaFile) => {
    // 提取文件所在目录路径
    const dirPath = file.fullPath.substring(0, file.fullPath.lastIndexOf('/')) || '/';
    navigate(`/files${dirPath}?preview=${encodeURIComponent(file.fileName)}`);
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          {config.icon}
          <span style={{ marginLeft: 12 }}>{config.title}</span>
        </Title>
        <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
          {config.description}
        </Text>
      </div>

      {/* 媒体类型标签（带统计数量） */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(mediaTypeConfig).map(([key, val]) => (
          <Tag
            key={key}
            color={key === mediaType ? val.color : 'default'}
            style={{ cursor: 'pointer', marginBottom: 4, padding: '4px 12px', fontSize: 14 }}
            onClick={() => navigate(val.route)}
          >
            {val.title}
            {stats && stats[key as MediaCategory] > 0 && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>({stats[key as MediaCategory]})</span>
            )}
          </Tag>
        ))}
      </div>

      {/* 搜索栏 */}
      <div style={{ marginBottom: 16 }}>
        <Search
          placeholder={`搜索${config.title}...`}
          allowClear
          enterButton={<SearchOutlined />}
          size="middle"
          style={{ maxWidth: 400 }}
          onSearch={handleSearch}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* 媒体内容区域 */}
      <Spin spinning={loading}>
        {files.length > 0 ? (
          <>
            {/* 图片类型使用网格布局 */}
            {mediaType === 'image' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                {files.map((file, index) => (
                  <Card
                    key={`${file.fullPath}-${index}`}
                    hoverable
                    style={{ overflow: 'hidden' }}
                    onClick={() => handleFileClick(file)}
                    cover={
                      file.thumbnails ? (
                        <Image
                          src={file.thumbnails}
                          alt={file.fileName}
                          style={{ height: 160, objectFit: 'cover' }}
                          preview={false}
                          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTgwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjkwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2JmYmZiZiIgZm9udC1zaXplPSIxNCI+5Zu+54mHPC90ZXh0Pjwvc3ZnPg=="
                        />
                      ) : (
                        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                          <PictureOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                        </div>
                      )
                    }
                  >
                    <Card.Meta
                      title={<Text ellipsis={{ tooltip: file.fileName }} style={{ fontSize: 13 }}>{file.fileName}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{formatSize(file.fileSize)}</Text>}
                    />
                  </Card>
                ))}
              </div>
            ) : (
              /* 其他类型使用列表布局 */
              <List
                dataSource={files}
                renderItem={(file, index) => (
                  <List.Item
                    key={`${file.fullPath}-${index}`}
                    style={{ cursor: 'pointer', padding: '12px 16px' }}
                    onClick={() => handleFileClick(file)}
                    extra={
                      <div style={{ textAlign: 'right', minWidth: 120 }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>{formatSize(file.fileSize)}</Text>
                        {file.timeModify && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(file.timeModify).toLocaleDateString()}
                            </Text>
                          </div>
                        )}
                      </div>
                    }
                  >
                    <List.Item.Meta
                      avatar={getFileIcon(file.fileName, mediaType)}
                      title={<Text ellipsis={{ tooltip: file.fileName }}>{file.fileName}</Text>}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {file.fullPath}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}

            {/* 分页 */}
            {total > pageSize && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Pagination
                  current={page}
                  total={total}
                  pageSize={pageSize}
                  onChange={handlePageChange}
                  showTotal={(t) => `共 ${t} 个文件`}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        ) : (
          !loading && (
            <Card>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <Text type="secondary">暂无{config.title}内容</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      请在存储管理中配置挂载点，系统将自动扫描媒体文件
                    </Text>
                  </div>
                }
              />
            </Card>
          )
        )}
      </Spin>
    </div>
  );
};

export default MediaLibrary;
