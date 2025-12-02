import axios from 'axios';
import { downloadManager } from './downloadManager';

// 文件信息接口
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  created_at: string;
  modified_at: string;
  hash?: string | { md5?: string; sha1?: string; sha256?: string; [key: string]: any };
  mime_type?: string;
  is_dir: boolean;
}

// 从URL路径解析文件路径
export const parseFilePathFromUrl = (pathname: string): string => {
  try {
    // 先对URL进行解码处理中文字符
    const decodedPathname = decodeURIComponent(pathname);
    
    // 个人文件路径: /@pages/myfile/sub/file.txt -> /sub/file.txt
    if (decodedPathname.startsWith('/@pages/myfile/')) {
      const filePath = decodedPathname.substring(15); // 去掉 '/@pages/myfile/' 前缀
      return filePath || '/';
    }
    // 个人文件根路径: /@pages/myfile -> /
    if (decodedPathname === '/@pages/myfile') {
      return '/';
    }
    // 公共文件路径: 直接使用路径
    return decodedPathname === '/' ? '/' : decodedPathname;
  } catch (error) {
    console.error('URL解码失败:', error, 'pathname:', pathname);
    // 如果解码失败，使用原始路径
    if (pathname.startsWith('/@pages/myfile/')) {
      const filePath = pathname.substring(15);
      return filePath || '/';
    }
    if (pathname === '/@pages/myfile') {
      return '/';
    }
    return pathname === '/' ? '/' : pathname;
  }
};

// 检查是否为个人文件路径
export const isPersonalFile = (pathname: string): boolean => {
  try {
    const decodedPathname = decodeURIComponent(pathname);
    return decodedPathname.startsWith('/@pages/myfile');
  } catch (error) {
    console.error('URL解码失败:', error, 'pathname:', pathname);
    return pathname.startsWith('/@pages/myfile');
  }
};

// 构建后端API路径
export const buildBackendPath = (filePath: string, pathname: string, username: string = 'testuser'): string => {
  // 直接使用路径，不添加前缀
  return filePath;
};

// 下载文件的参数接口
export interface DownloadFileParams {
  fileInfo: FileInfo;
  currentPath: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

// 通用文件下载函数
export const downloadFile = async ({
  fileInfo,
  currentPath,
  onError,
  onSuccess
}: DownloadFileParams): Promise<void> => {
  if (!fileInfo) {
    onError?.('文件信息不存在');
    return;
  }

  try {
    // 获取当前文件的目录路径
    const filePath = parseFilePathFromUrl(currentPath);
    const directoryPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
    
    // 构建下载API路径
    const backendPath = buildBackendPath(directoryPath, currentPath);
    // 确保路径格式正确，去掉末尾的斜杠（除非是根路径）
    const cleanBackendPath = backendPath === '/' ? '' : backendPath.replace(/\/$/, '');
    // 构建下载API URL，确保路径正确分隔，避免双斜杠
    let downloadApiUrl: string;
    if (cleanBackendPath === '' || cleanBackendPath === '/') {
      // 根路径情况
      downloadApiUrl = `/@files/link/path/${fileInfo.name}`;
    } else {
      // 子路径情况，确保有正确的斜杠分隔，避免双斜杠
      const normalizedPath = cleanBackendPath.startsWith('/') ? cleanBackendPath : `/${cleanBackendPath}`;
      // 移除路径中的双斜杠
      const cleanPath = normalizedPath.replace(/\/+/g, '/');
      downloadApiUrl = `/@files/link/path${cleanPath}/${fileInfo.name}`;
    }
    
    console.log('下载API URL:', downloadApiUrl);
    
    // 使用fetch获取响应，支持流式下载
    const response = await fetch(downloadApiUrl);
    
    // 检查响应类型
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      // JSON响应，按原来的方式处理
      const responseData = await response.json();
      
      if (responseData && responseData.flag && responseData.data && responseData.data.length > 0) {
        const downloadData = responseData.data[0];
        const directUrl = downloadData.direct;
        const headers = downloadData.header || {};
        
        if (directUrl) {
          // 检查header字段是否不为空
          const hasHeaders = headers && Object.keys(headers).length > 0;
          
          if (hasHeaders) {
            // 如果有header，使用fetch下载并保存到本地，显示进度条
            const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            try {
              console.log('使用fetch下载，携带headers:', headers);
              
              // 开始下载，显示进度条，获取AbortController
              const abortController = downloadManager.startDownload(downloadId, fileInfo.name);
              
              const fetchResponse = await fetch(directUrl, {
                method: 'GET',
                headers: headers,
                signal: abortController.signal
              });
              
              if (!fetchResponse.ok) {
                throw new Error(`下载失败: ${fetchResponse.status} ${fetchResponse.statusText}`);
              }
              
              // 获取文件总大小
              const contentLength = fetchResponse.headers.get('content-length');
              const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
              
              if (!fetchResponse.body) {
                throw new Error('响应体为空');
              }
              
              // 创建可读流来跟踪下载进度
              const reader = fetchResponse.body.getReader();
              const chunks: Uint8Array[] = [];
              let receivedLength = 0;
              
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                // 更新进度条（仅当知道总大小时）
                if (totalSize > 0) {
                  const progress = Math.round((receivedLength / totalSize) * 100);
                  downloadManager.updateProgress(downloadId, progress);
                } else {
                  // 如果不知道总大小，显示一个动态进度
                  const progress = Math.min(90, (receivedLength / (1024 * 1024)) * 10); // 假设每MB增加10%
                  downloadManager.updateProgress(downloadId, progress);
                }
              }
              
              // 合并所有数据块
              const allChunks = new Uint8Array(receivedLength);
              let position = 0;
              for (const chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
              }
              
              // 创建blob并下载
              const blob = new Blob([allChunks]);
              
              // 创建下载链接并触发下载
              const downloadUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = fileInfo.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              // 清理URL对象
              window.URL.revokeObjectURL(downloadUrl);
              
              // 完成下载
              downloadManager.completeDownload(downloadId);
              
              console.log('文件下载成功');
              onSuccess?.();
            } catch (fetchError) {
              console.error('Fetch下载失败:', fetchError);
              
              // 检查是否是用户取消的错误
              if ((fetchError as Error).name === 'AbortError') {
                console.log('下载已被用户取消');
                // 不需要调用failDownload，因为downloadManager.cancelDownload已经处理了状态
              } else {
                downloadManager.failDownload(downloadId, '下载文件失败: ' + (fetchError as Error).message);
                onError?.('下载文件失败: ' + (fetchError as Error).message);
              }
            }
          } else {
            // 如果没有header，按原来的方式跳转
            console.log('没有header，使用原方式下载');
            window.open(directUrl, '_blank');
            onSuccess?.();
          }
        } else {
          onError?.('获取下载链接失败');
        }
      } else {
        onError?.('获取下载链接失败');
      }
    } else {
      // 流式响应，直接处理
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }
      
      console.log('收到流式响应，直接下载');
      
      // 从Content-Disposition头中获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = fileInfo.name;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          fileName = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // 开始下载，显示进度条
        const abortController = downloadManager.startDownload(downloadId, fileName);
        
        if (!response.body) {
          throw new Error('响应体为空');
        }
        
        // 获取文件总大小
        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
        
        // 创建可读流来跟踪下载进度
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let receivedLength = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          chunks.push(value);
          receivedLength += value.length;
          
          // 更新进度条（仅当知道总大小时）
          if (totalSize > 0) {
            const progress = Math.round((receivedLength / totalSize) * 100);
            downloadManager.updateProgress(downloadId, progress);
          } else {
            // 如果不知道总大小，显示一个动态进度
            const progress = Math.min(90, (receivedLength / (1024 * 1024)) * 10); // 假设每MB增加10%
            downloadManager.updateProgress(downloadId, progress);
          }
        }
        
        // 合并所有数据块
        const allChunks = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          allChunks.set(chunk, position);
          position += chunk.length;
        }
        
        // 创建blob并下载
        const blob = new Blob([allChunks]);
        
        // 创建下载链接并触发下载
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理URL对象
        window.URL.revokeObjectURL(downloadUrl);
        
        // 完成下载
        downloadManager.completeDownload(downloadId);
        
        console.log('流式文件下载成功');
        onSuccess?.();
      } catch (streamError) {
        console.error('流式下载失败:', streamError);
        
        // 检查是否是用户取消的错误
        if ((streamError as Error).name === 'AbortError') {
          console.log('下载已被用户取消');
        } else {
          downloadManager.failDownload(downloadId, '流式下载失败: ' + (streamError as Error).message);
          onError?.('流式下载失败: ' + (streamError as Error).message);
        }
      }
    }
  } catch (err) {
    console.error('下载文件错误:', err);
    onError?.('下载文件失败，请检查网络连接');
  }
};

// 批量下载文件函数
export const downloadMultipleFiles = async (
  files: FileInfo[],
  currentPath: string,
  onError?: (error: string) => void,
  onProgress?: (completed: number, total: number) => void,
  onSuccess?: () => void
): Promise<void> => {
  let completed = 0;
  const total = files.length;
  
  for (const file of files) {
    try {
      await downloadFile({
        fileInfo: file,
        currentPath,
        onError: (error) => {
          console.error(`下载文件 ${file.name} 失败:`, error);
          onError?.(error);
        }
      });
      completed++;
      onProgress?.(completed, total);
    } catch (error) {
      console.error(`下载文件 ${file.name} 失败:`, error);
      onError?.(`下载文件 ${file.name} 失败`);
    }
  }
  
  if (completed === total) {
    onSuccess?.();
  }
};