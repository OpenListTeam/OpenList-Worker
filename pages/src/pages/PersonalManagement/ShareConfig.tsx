import React from 'react';
import { Box, Typography, Paper, FormControlLabel, Switch, TextField, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const ShareConfig: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        分享配置
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          分享设置
        </Typography>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="启用文件分享功能"
        />
        <br />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="允许公开分享"
        />
        <br />
        <FormControlLabel
          control={<Switch />}
          label="需要密码保护分享"
        />
        <br />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="允许设置分享有效期"
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          分享限制
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>默认分享有效期</InputLabel>
          <Select defaultValue="7" label="默认分享有效期">
            <MenuItem value="1">1天</MenuItem>
            <MenuItem value="3">3天</MenuItem>
            <MenuItem value="7">7天</MenuItem>
            <MenuItem value="30">30天</MenuItem>
            <MenuItem value="0">永久</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="最大分享文件大小限制（MB）"
          type="number"
          defaultValue="100"
          fullWidth
          margin="normal"
        />
        <TextField
          label="单日最大分享次数"
          type="number"
          defaultValue="10"
          fullWidth
          margin="normal"
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          分享链接设置
        </Typography>
        <TextField
          label="分享链接前缀"
          defaultValue="https://share.oplist.org/"
          fullWidth
          margin="normal"
        />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="启用短链接"
        />
        <br />
        <FormControlLabel
          control={<Switch />}
          label="允许自定义分享链接"
        />
      </Paper>

      <Button variant="contained" color="primary">
        保存配置
      </Button>
    </Box>
  );
};

export default ShareConfig;