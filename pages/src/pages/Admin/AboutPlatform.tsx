import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Info,
  Code,
  Update,
  People,
  Storage,
  Speed,
  Security,
} from '@mui/icons-material';
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
    { name: '前端', tech: 'React 18 + TypeScript + Material-UI' },
    { name: '后端', tech: 'Node.js + Express + TypeScript' },
    { name: '数据库', tech: 'SQLite' },
    { name: '构建工具', tech: 'Vite' },
    { name: '部署', tech: 'Docker + Nginx' },
  ];

  return (
    <Box sx={{ width: '100%', height: '100%', p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '15px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Info color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  系统信息
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : systemInfo ? (
                <List dense>
                  <ListItem>
                    <ListItemText primary="版本号" secondary={systemInfo.version || '未知'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="构建时间" secondary={systemInfo.build || '未知'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Node.js版本" secondary={systemInfo.nodeVersion || '未知'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="运行平台" secondary={systemInfo.platform || '未知'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="运行时间" secondary={systemInfo.uptime || '未知'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="内存使用" secondary={systemInfo.memory || '未知'} />
                  </ListItem>
                  {systemInfo.cpuUsage && (
                    <ListItem>
                      <ListItemText primary="CPU信息" secondary={systemInfo.cpuUsage} />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Alert severity="info">暂无系统信息</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '15px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Code color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  技术栈
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                {technologies.map((tech, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={tech.name} secondary={tech.tech} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ borderRadius: '15px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Speed color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  主要功能
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {features.map((feature, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Storage fontSize="small" color="action" />
                      </ListItemIcon>
                      <Typography variant="body2">{feature}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ borderRadius: '15px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  开发团队
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body1" gutterBottom>
                OpenList 是一个开源的云存储管理项目，旨在为用户提供一个统一、安全、易用的多云存储管理平台。
              </Typography>
              <Typography variant="body2" color="text.secondary">
                项目地址: https://github.com/OpenListTeam/OpenList
              </Typography>
              <Typography variant="body2" color="text.secondary">
                文档地址: https://docs.oplist.org
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AboutPlatform;