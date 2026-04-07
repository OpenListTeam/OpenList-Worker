/**
 * 备份还原页面
 * 支持系统数据备份和恢复
 */
import React, { useState } from 'react';
import { Card, Button, Upload, message, Typography, Space, Alert, Popconfirm, List, Tag } from 'antd';
import { SaveOutlined, UploadOutlined, DownloadOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { apiService } from '../../posts/api';

const { Title, Text } = Typography;

const BackupRestore: React.FC = () => {
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const res: any = await apiService.get('/@system/backup/none');
      if (res.flag) {
        // 下载备份文件
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `openlist-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('备份文件已下载');
      } else {
        message.error(res.text || '备份失败');
      }
    } catch (error: any) {
      message.error(error.message || '备份失败');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (file: File) => {
    setRestoreLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res: any = await apiService.post('/@system/restore/none', { backup_data: data });
      if (res.flag) {
        message.success('数据恢复成功，请刷新页面');
      } else {
        message.error(res.text || '恢复失败');
      }
    } catch (error: any) {
      message.error(error.message || '恢复失败，请检查备份文件格式');
    } finally {
      setRestoreLoading(false);
    }
    return false; // 阻止自动上传
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <SaveOutlined style={{ marginRight: 12 }} />
        备份还原
      </Title>

      <Alert
        message="重要提示"
        description="备份将导出所有系统配置数据（不包含文件内容）。恢复操作将覆盖当前配置，请谨慎操作。"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title="数据备份" style={{ marginBottom: 24 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          导出当前系统的所有配置数据，包括挂载点、用户、分组、路径规则等。
        </Text>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={backupLoading}
          onClick={handleBackup}
          size="large"
        >
          创建备份
        </Button>
      </Card>

      <Card title="数据恢复">
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          从备份文件恢复系统配置。此操作将覆盖当前所有配置数据。
        </Text>
        <Popconfirm
          title="确认恢复"
          description="恢复操作将覆盖当前所有配置数据，确定继续？"
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          onConfirm={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e: any) => {
              const file = e.target.files?.[0];
              if (file) handleRestore(file);
            };
            input.click();
          }}
        >
          <Button
            danger
            icon={<UploadOutlined />}
            loading={restoreLoading}
            size="large"
          >
            恢复数据
          </Button>
        </Popconfirm>
      </Card>
    </div>
  );
};

export default BackupRestore;
