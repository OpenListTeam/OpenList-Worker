import { useState, useEffect } from 'react';
import { downloadManager } from '../utils/downloadManager';
import { DownloadProgressInfo } from '../components/DownloadProgress';

export const useDownloadProgress = () => {
  const [downloads, setDownloads] = useState<DownloadProgressInfo[]>([]);

  useEffect(() => {
    // 订阅下载状态变化
    const unsubscribe = downloadManager.subscribe((newDownloads) => {
      setDownloads(newDownloads);
    });

    // 清理函数
    return unsubscribe;
  }, []);

  const removeDownload = (id: string) => {
    downloadManager.removeDownload(id);
  };

  const cancelDownload = (id: string) => {
    downloadManager.cancelDownload(id);
  };

  const clearAllDownloads = () => {
    downloadManager.clearAll();
  };

  return {
    downloads,
    removeDownload,
    cancelDownload,
    clearAllDownloads
  };
};