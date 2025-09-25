import React from 'react';
import { Box, Typography, Paper, FormControlLabel, Switch, TextField, Button } from '@mui/material';

const GlobalSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          系统配置
        </Typography>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="启用多语言支持"
        />
        <br />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="启用日志记录"
        />
        <br />
        <TextField
          label="系统标题"
          defaultValue="OpenList文件管理系统"
          fullWidth
          margin="normal"
        />
        <TextField
          label="系统描述"
          defaultValue="一个功能强大的文件管理平台"
          fullWidth
          margin="normal"
          multiline
          rows={3}
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          安全配置
        </Typography>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="启用HTTPS强制跳转"
        />
        <br />
        <FormControlLabel
          control={<Switch />}
          label="启用双因素认证"
        />
        <br />
        <TextField
          label="会话超时时间（分钟）"
          type="number"
          defaultValue="30"
          fullWidth
          margin="normal"
        />
      </Paper>

      <Button variant="contained" color="primary">
        保存设置
      </Button>
    </Box>
  );
};

export default GlobalSettings;