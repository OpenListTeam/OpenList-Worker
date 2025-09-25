import React from 'react';
import { Box, Typography, Paper, FormControlLabel, Switch, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';

const PreviewSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          文件预览配置
        </Typography>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="启用图片预览"
        />
        <br />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="启用文档预览"
        />
        <br />
        <FormControlLabel
          control={<Switch />}
          label="启用视频预览"
        />
        <br />
        <FormControlLabel
          control={<Switch />}
          label="启用音频预览"
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          预览限制
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>最大预览文件大小</InputLabel>
          <Select defaultValue="50" label="最大预览文件大小">
            <MenuItem value="10">10MB</MenuItem>
            <MenuItem value="50">50MB</MenuItem>
            <MenuItem value="100">100MB</MenuItem>
            <MenuItem value="500">500MB</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>图片预览质量</InputLabel>
          <Select defaultValue="high" label="图片预览质量">
            <MenuItem value="low">低质量</MenuItem>
            <MenuItem value="medium">中等质量</MenuItem>
            <MenuItem value="high">高质量</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          第三方预览服务
        </Typography>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="启用Office文档在线预览"
        />
        <br />
        <FormControlLabel
          control={<Switch />}
          label="启用PDF在线预览"
        />
        <br />
        <FormControlLabel
          control={<Switch />}
          label="启用代码高亮预览"
        />
      </Paper>

      <Button variant="contained" color="primary">
        保存设置
      </Button>
    </Box>
  );
};

export default PreviewSettings;