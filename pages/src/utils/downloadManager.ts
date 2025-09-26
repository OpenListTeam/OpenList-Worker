import { DownloadProgressInfo } from '../components/DownloadProgress';

type DownloadProgressCallback = (downloads: DownloadProgressInfo[]) => void;

class DownloadManager {
  private downloads: Map<string, DownloadProgressInfo> = new Map();
  private callbacks: Set<DownloadProgressCallback> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();

  // 订阅下载状态变化
  subscribe(callback: DownloadProgressCallback): () => void {
    this.callbacks.add(callback);
    // 立即调用一次回调，传递当前状态
    callback(Array.from(this.downloads.values()));
    
    // 返回取消订阅函数
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // 通知所有订阅者
  private notify(): void {
    const downloads = Array.from(this.downloads.values());
    this.callbacks.forEach(callback => callback(downloads));
  }

  // 开始下载
  startDownload(id: string, fileName: string): AbortController {
    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);
    
    const download: DownloadProgressInfo = {
      id,
      fileName,
      progress: 0,
      status: 'downloading'
    };
    this.downloads.set(id, download);
    this.notify();
    
    return abortController;
  }

  // 更新下载进度
  updateProgress(id: string, progress: number): void {
    const download = this.downloads.get(id);
    if (download) {
      download.progress = Math.min(100, Math.max(0, progress));
      this.downloads.set(id, download);
      this.notify();
    }
  }

  // 完成下载
  completeDownload(id: string): void {
    const download = this.downloads.get(id);
    if (download) {
      download.status = 'completed';
      download.progress = 100;
      this.downloads.set(id, download);
      this.notify();
      
      // 3秒后自动移除已完成的下载
      setTimeout(() => {
        this.removeDownload(id);
      }, 3000);
    }
  }

  // 下载失败
  failDownload(id: string, errorMessage: string): void {
    const download = this.downloads.get(id);
    if (download) {
      download.status = 'error';
      download.errorMessage = errorMessage;
      this.downloads.set(id, download);
      this.notify();
    }
  }

  // 取消下载
  cancelDownload(id: string): void {
    const abortController = this.abortControllers.get(id);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(id);
    }
    
    const download = this.downloads.get(id);
    if (download) {
      download.status = 'cancelled';
      this.downloads.set(id, download);
      this.notify();
      
      // 1秒后移除已取消的下载
      setTimeout(() => {
        this.removeDownload(id);
      }, 1000);
    }
  }

  // 移除下载记录
  removeDownload(id: string): void {
    if (this.downloads.has(id)) {
      this.downloads.delete(id);
      this.notify();
    }
    
    // 同时清理AbortController
    if (this.abortControllers.has(id)) {
      this.abortControllers.delete(id);
    }
  }

  // 获取当前所有下载
  getDownloads(): DownloadProgressInfo[] {
    return Array.from(this.downloads.values());
  }

  // 清除所有下载记录
  clearAll(): void {
    // 取消所有正在进行的下载
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    
    this.downloads.clear();
    this.notify();
  }
}

// 创建全局下载管理器实例
export const downloadManager = new DownloadManager();