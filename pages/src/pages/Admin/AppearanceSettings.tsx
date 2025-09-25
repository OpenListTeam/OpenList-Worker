import React from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Button, RadioGroup, FormControlLabel, Radio } from '@mui/material';

const AppearanceSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          主题设置
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup defaultValue="light" name="theme-radio-group">
            <FormControlLabel value="light" control={<Radio />} label="浅色主题" />
            <FormControlLabel value="dark" control={<Radio />} label="深色主题" />
            <FormControlLabel value="auto" control={<Radio />} label="跟随系统" />
          </RadioGroup>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          布局设置
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>侧边栏位置</InputLabel>
          <Select defaultValue="left" label="侧边栏位置">
            <MenuItem value="left">左侧</MenuItem>
            <MenuItem value="right">右侧</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>导航栏样式</InputLabel>
          <Select defaultValue="standard" label="导航栏样式">
            <MenuItem value="standard">标准</MenuItem>
            <MenuItem value="dense">紧凑</MenuItem>
            <MenuItem value="prominent">突出</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          自定义样式
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>主色调</InputLabel>
          <Select defaultValue="blue" label="主色调">
            <MenuItem value="blue">蓝色</MenuItem>
            <MenuItem value="green">绿色</MenuItem>
            <MenuItem value="purple">紫色</MenuItem>
            <MenuItem value="orange">橙色</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="启用圆角设计"
        />
      </Paper>

      <Button variant="contained" color="primary">
        应用设置
      </Button>
    </Box>
  );
};

export default AppearanceSettings;