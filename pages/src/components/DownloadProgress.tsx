import React, { useState, useEffect } from 'react';
import { Typography, Progress, Button, Alert, Tag, Badge, Divider } from 'antd';
import {
  CloseOutlined,
  DownloadOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CloudDownloadOutlined,
  UnorderedListOutlined,
  ClearOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';

export interface DownloadProgressInfo {
  id: string;
  fileName: string;
  progress: number; // 0-100
  status: 'downloading' | 'completed' | 'error' | 'cancelled';
  errorMessage?: string;
}

interface DownloadProgressProps {
  downloads: DownloadProgressInfo[];
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
  onClearAll?: () => void;
}

const DownloadProgress: React.FC<DownloadProgressProps> = ({ downloads, onRemove, onCancel, onClearAll }) => {
  const [visibleDownloads, setVisibleDownloads] = useState<DownloadProgressInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  useEffect(() => {
    setVisibleDownloads(downloads);
  }, [downloads]);

  // 计算队列统计信息
  const queueStats = {
    total: downloads.length,
    downloading: downloads.filter(d => d.status === 'downloading').length,
    completed: downloads.filter(d => d.status === 'completed').length,
    failed: downloads.filter(d => d.status === 'error').length,
    cancelled: downloads.filter(d => d.status === 'cancelled').length
  };

  const handleRemove = (id: string) => {
    const download = downloads.find(d => d.id === id);
    
    if (download?.status === 'downloading') {
      // 如果正在下载，则取消下载
      onCancel(id);
    } else {
      // 如果已完成、失败或已取消，则移除记录
      // 添加淡出动画
      setVisibleDownloads(prev => 
        prev.map(download => 
          download.id === id 
            ? { ...download, status: 'completed' as const }
            : download
        )
      );
      
      // 延迟移除，让动画完成
      setTimeout(() => {
        onRemove(id);
      }, 300);
    }
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'downloading':
        return <CloudDownloadOutlined style={{ color: '#1677ff', fontSize: 18 }} />;
      case 'completed':
        return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />;
      case 'error':
        return <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 18 }} />;
      default:
        return <DownloadOutlined style={{ fontSize: 18 }} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'downloading':
        return '下载中...';
      case 'completed':
        return '下载完成';
      case 'error':
        return '下载失败';
      case 'cancelled':
        return '已取消';
      default:
        return '未知状态';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'downloading':
        return 'processing';
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  if (visibleDownloads.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 1300,
        maxWidth: 420,
        minWidth: 320,
      }}
    >
      <div
        style={{
          borderRadius: 12,
          backgroundColor: 'var(--ant-color-bg-elevated, #fff)',
          border: '1px solid var(--ant-color-border, #d9d9d9)',
          overflow: 'hidden',
          boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* 队列头部 */}
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--ant-color-primary, #1677ff)',
            color: '#fff',
            cursor: 'pointer',
          }}
          onClick={toggleExpanded}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge count={queueStats.total} size="small" color="orange">
                <UnorderedListOutlined style={{ fontSize: 18, color: '#fff' }} />
              </Badge>
              <Typography.Text strong style={{ color: '#fff', fontSize: 14 }}>
                下载队列
              </Typography.Text>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* 统计信息 */}
              <div style={{ display: 'flex', gap: 4 }}>
                {queueStats.downloading > 0 && (
                  <Tag
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      border: 'none',
                      fontSize: 11,
                      lineHeight: '18px',
                      padding: '0 6px',
                      marginInlineEnd: 0,
                    }}
                  >
                    {queueStats.downloading} 进行中
                  </Tag>
                )}
                {queueStats.completed > 0 && (
                  <Tag
                    style={{
                      backgroundColor: 'rgba(76, 175, 80, 0.3)',
                      color: '#fff',
                      border: 'none',
                      fontSize: 11,
                      lineHeight: '18px',
                      padding: '0 6px',
                      marginInlineEnd: 0,
                    }}
                  >
                    {queueStats.completed} 完成
                  </Tag>
                )}
                {queueStats.failed > 0 && (
                  <Tag
                    style={{
                      backgroundColor: 'rgba(244, 67, 54, 0.3)',
                      color: '#fff',
                      border: 'none',
                      fontSize: 11,
                      lineHeight: '18px',
                      padding: '0 6px',
                      marginInlineEnd: 0,
                    }}
                  >
                    {queueStats.failed} 失败
                  </Tag>
                )}
              </div>

              {/* 清除所有按钮 */}
              {onClearAll && queueStats.total > 0 && (
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  style={{ color: '#fff' }}
                  title="清除所有"
                />
              )}

              {/* 展开/折叠按钮 */}
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                style={{ color: '#fff' }}
              />
            </div>
          </div>
        </div>

        {/* 队列内容 */}
        {isExpanded && (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {visibleDownloads.map((download, index) => (
              <div key={download.id}>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ marginTop: 2 }}>
                      {getStatusIcon(download.status)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Text
                        strong
                        ellipsis
                        title={download.fileName}
                        style={{ display: 'block', marginBottom: 4, fontSize: 13 }}
                      >
                        {download.fileName}
                      </Typography.Text>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Tag color={getStatusColor(download.status)} style={{ marginInlineEnd: 0 }}>
                          {getStatusText(download.status)}
                        </Tag>
                        {download.status === 'downloading' && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {download.progress}%
                          </Typography.Text>
                        )}
                      </div>

                      {download.status === 'downloading' && (
                        <Progress
                          percent={download.progress}
                          size="small"
                          showInfo={false}
                          strokeLinecap="round"
                          style={{ marginBottom: 0 }}
                        />
                      )}

                      {download.errorMessage && (
                        <Alert
                          type="error"
                          message={
                            <Typography.Text style={{ fontSize: 12 }}>
                              {download.errorMessage}
                            </Typography.Text>
                          }
                          style={{ marginTop: 8, padding: '4px 12px' }}
                          showIcon={false}
                          banner
                        />
                      )}
                    </div>

                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined style={{ fontSize: 12 }} />}
                      onClick={() => handleRemove(download.id)}
                      style={{ color: 'var(--ant-color-text-secondary)' }}
                    />
                  </div>
                </div>
                {index < visibleDownloads.length - 1 && <Divider style={{ margin: 0 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadProgress;