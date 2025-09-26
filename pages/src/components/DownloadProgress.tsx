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
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';

export interface DownloadProgressInfo {
  id: string;
  fileName: string;
  progress: number; // 0-100
  status: 'downloading' | 'completed' | 'error';
  errorMessage?: string;
}

interface DownloadProgressProps {
  downloads: DownloadProgressInfo[];
  onRemove: (id: string) => void;
}

const DownloadProgress: React.FC<DownloadProgressProps> = ({ downloads, onRemove }) => {
  const [visibleDownloads, setVisibleDownloads] = useState<DownloadProgressInfo[]>([]);

  useEffect(() => {
    setVisibleDownloads(downloads);
  }, [downloads]);

  const handleRemove = (id: string) => {
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
        maxWidth: 400,
        minWidth: 300,
      }}
    >
      <Stack spacing={1}>
        {visibleDownloads.map((download) => (
          <Fade key={download.id} in={true} timeout={300}>
            <Paper
              elevation={6}
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
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
            </Paper>
          </Fade>
        ))}
      </Stack>
    </Box>
  );
};

export default DownloadProgress;