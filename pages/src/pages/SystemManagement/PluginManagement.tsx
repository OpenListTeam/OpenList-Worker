import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, ListItemSecondaryAction, Switch, IconButton, Button, Chip } from '@mui/material';
import { Delete, Settings, Add } from '@mui/icons-material';

const PluginManagement: React.FC = () => {
  const plugins = [
    { id: 1, name: '文件加密插件', version: '1.0.0', enabled: true, description: '提供文件加密功能' },
    { id: 2, name: '云存储插件', version: '2.1.0', enabled: false, description: '支持多种云存储服务' },
    { id: 3, name: 'OCR识别插件', version: '1.2.0', enabled: true, description: '图片文字识别功能' },
    { id: 4, name: '视频转码插件', version: '1.5.0', enabled: false, description: '视频格式转换和处理' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          插件管理
        </Typography>
        <Button variant="contained" startIcon={<Add />}>
          安装插件
        </Button>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          已安装插件
        </Typography>
        <List>
          {plugins.map((plugin) => (
            <ListItem key={plugin.id} divider>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ mr: 2 }}>
                    {plugin.name}
                  </Typography>
                  <Chip 
                    label={plugin.enabled ? '已启用' : '已禁用'} 
                    color={plugin.enabled ? 'success' : 'default'} 
                    size="small" 
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {plugin.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  版本: {plugin.version}
                </Typography>
              </Box>
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={plugin.enabled}
                  onChange={() => {}}
                />
                <IconButton edge="end" aria-label="settings">
                  <Settings />
                </IconButton>
                <IconButton edge="end" aria-label="delete">
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          插件市场
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          从官方插件市场安装新插件
        </Typography>
        <Button variant="outlined">
          浏览插件市场
        </Button>
      </Paper>
    </Box>
  );
};

export default PluginManagement;