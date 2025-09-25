import React, { useState } from 'react';
import { Box, Typography, Paper, Button, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Delete, Download, Upload, Restore } from '@mui/icons-material';

const BackupRestore: React.FC = () => {
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const backups = [
    { id: 1, name: '系统备份_20240924', date: '2024-09-24 10:30:00', size: '45.2 MB', type: '完整备份' },
    { id: 2, name: '配置备份_20240920', date: '2024-09-20 15:45:00', size: '2.1 MB', type: '配置备份' },
    { id: 3, name: '数据备份_20240915', date: '2024-09-15 09:20:00', size: '156.8 MB', type: '数据备份' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" startIcon={<Download />} onClick={() => setBackupDialogOpen(true)}>
          创建备份
        </Button>
        <Button variant="outlined" startIcon={<Upload />} onClick={() => setRestoreDialogOpen(true)}>
          恢复备份
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          备份列表
        </Typography>
        <List>
          {backups.map((backup) => (
            <ListItem key={backup.id} divider>
              <ListItemText
                primary={backup.name}
                secondary={
                  <Box>
                    <Typography variant="body2" component="span">
                      日期: {backup.date}
                    </Typography>
                    <br />
                    <Typography variant="body2" component="span">
                      大小: {backup.size} | 类型: {backup.type}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" aria-label="restore">
                  <Restore />
                </IconButton>
                <IconButton edge="end" aria-label="delete">
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* 创建备份对话框 */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建系统备份</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="备份名称"
            fullWidth
            variant="outlined"
            defaultValue="系统备份_"
          />
          <TextField
            margin="dense"
            label="备份描述"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => setBackupDialogOpen(false)}>
            开始备份
          </Button>
        </DialogActions>
      </Dialog>

      {/* 恢复备份对话框 */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>恢复系统备份</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            选择要恢复的备份文件：
          </Typography>
          <Button variant="outlined" component="label">
            选择备份文件
            <input type="file" hidden />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => setRestoreDialogOpen(false)}>
            开始恢复
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupRestore;