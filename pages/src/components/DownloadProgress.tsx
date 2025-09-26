import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  Collapse,
  Alert,
  Fade,
  Stack,
  Chip,
  Divider,
  Badge
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  CloudDownload as CloudDownloadIcon,
  Queue as QueueIcon,
  ClearAll as ClearAllIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

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
        return <CloudDownloadIcon color="primary" />;
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <DownloadIcon />;
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

  const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'error' => {
    switch (status) {
      case 'downloading':
        return 'primary';
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
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 1300,
        maxWidth: 420,
        minWidth: 320,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          borderRadius: 3,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {/* 队列头部 */}
        <Box
          sx={{
            p: 2,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            cursor: 'pointer',
          }}
          onClick={toggleExpanded}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge badgeContent={queueStats.total} color="secondary">
                <QueueIcon />
              </Badge>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                下载队列
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* 统计信息 */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {queueStats.downloading > 0 && (
                  <Chip
                    label={`${queueStats.downloading} 进行中`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'inherit',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                )}
                {queueStats.completed > 0 && (
                  <Chip
                    label={`${queueStats.completed} 完成`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(76, 175, 80, 0.3)',
                      color: 'inherit',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                )}
                {queueStats.failed > 0 && (
                  <Chip
                    label={`${queueStats.failed} 失败`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(244, 67, 54, 0.3)',
                      color: 'inherit',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                )}
              </Box>
              
              {/* 清除所有按钮 */}
              {onClearAll && queueStats.total > 0 && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  sx={{
                    color: 'inherit',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  title="清除所有"
                >
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              )}
              
              {/* 展开/折叠按钮 */}
              <IconButton
                size="small"
                sx={{
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* 队列内容 */}
        <Collapse in={isExpanded}>
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {visibleDownloads.map((download, index) => (
              <Box key={download.id}>
                <Fade in={true} timeout={300}>
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ mt: 0.5 }}>
                        {getStatusIcon(download.status)}
                      </Box>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mb: 0.5
                          }}
                          title={download.fileName}
                        >
                          {download.fileName}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={getStatusText(download.status)}
                            size="small"
                            color={getStatusColor(download.status)}
                            variant="outlined"
                          />
                          {download.status === 'downloading' && (
                            <Typography variant="caption" color="text.secondary">
                              {download.progress}%
                            </Typography>
                          )}
                        </Box>
                        
                        {download.status === 'downloading' && (
                          <LinearProgress
                            variant="determinate"
                            value={download.progress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'action.hover',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                              }
                            }}
                          />
                        )}
                        
                        <Collapse in={!!download.errorMessage}>
                          {download.errorMessage && (
                            <Alert
                              severity="error"
                              sx={{ mt: 1, py: 0.5 }}
                              variant="outlined"
                            >
                              <Typography variant="caption">
                                {download.errorMessage}
                              </Typography>
                            </Alert>
                          )}
                        </Collapse>
                      </Box>
                      
                      <IconButton
                        size="small"
                        onClick={() => handleRemove(download.id)}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'text.primary',
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Fade>
                {index < visibleDownloads.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default DownloadProgress;