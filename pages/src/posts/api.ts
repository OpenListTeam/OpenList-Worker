import axios from 'axios';
import type {AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError} from 'axios';

// API响应格式
interface ApiResponse<T = any> {
    code: number;
    message: string;
    data: T;
    success: boolean;
}

// API错误类
class ApiError extends Error {
    constructor(
        message: string,
        code: number,
        response?: AxiosResponse
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// API服务类
class ApiService {
    private instance: AxiosInstance;

    constructor() {
        // 安全获取API基础URL，提供默认值
        let baseURL: string;
        try {
            baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
        } catch (error) {
            console.warn('无法读取环境变量，使用默认API地址');
            baseURL = '/api';
        }

        this.instance = axios.create({
            baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    // 全局错误处理工具函数
    private handleError(error: any): ApiError {
        if (error instanceof ApiError) {
            return error;
        }

        if (error instanceof Error) {
            return new ApiError(error.message, -1);
        }

        return new ApiError('未知错误', -1);
    }

    private setupInterceptors() {
        // 请求拦截器
        this.instance.interceptors.request.use(
            (config) => {
                // 添加认证token
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // 响应拦截器
        this.instance.interceptors.response.use(
            (response: AxiosResponse<ApiResponse>) => {
                const {data} = response;

                // 统一处理响应格式
                if (data.success) {
                    return data.data;
                } else {
                    throw new ApiError(data.message, data.code, response);
                }
            },
            (error: AxiosError<ApiResponse>) => {
                if (error.response) {
                    // 服务器响应错误
                    const {data, status} = error.response;
                    throw new ApiError(
                        data?.message || '服务器错误',
                        data?.code || status,
                        error.response
                    );
                } else if (error.request) {
                    // 请求发送失败
                    throw new ApiError('网络连接失败', 0);
                } else {
                    // 其他错误
                    throw new ApiError('请求配置错误', -1);
                }
            }
        );
    }

    // GET请求
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.get(url, config);
    }

    // POST请求
    async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.post(url, data, config);
    }

    // PUT请求
    async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.put(url, data, config);
    }

    // DELETE请求
    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.delete(url, config);
    }

    // 上传文件
    async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
        const formData = new FormData();
        formData.append('file', file);

        return this.instance.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });
    }

    // 文件下载
    async download(url: string, config?: AxiosRequestConfig): Promise<Blob> {
        const response = await this.instance.get(url, {
            ...config,
            responseType: 'blob'
        });
        return response.data as Blob;
    }
}

// 创建API服务实例
export const apiService = new ApiService();

// 文件管理相关API
export const fileApi = {
    // 获取文件列表 - 使用新的后端API
    getFileList: (filePath: string = '/', action: string = 'list', method: string = 'path') => {
        const encodedPath = encodeURIComponent(filePath);
        return apiService.get(`/@files/${action}/${method}${filePath}`, {
            params: { target: filePath }
        });
    },

    // 获取文件列表 (旧版本兼容)
    getFiles: (params?: { path?: string; type?: string }) =>
        apiService.get('/files', {params}),

    // 创建文件夹
    createFolder: (name: string, path: string) =>
        apiService.post('/files/folder', {name, path}),

    // 上传文件
    uploadFile: (file: File, path: string, onProgress?: (progress: number) => void) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);
        return apiService.upload('/files/upload', file, onProgress);
    },

    // 下载文件
    downloadFile: (path: string) =>
        apiService.download(`/files/download?path=${encodeURIComponent(path)}`),

    // 删除文件
    deleteFile: (path: string) =>
        apiService.delete('/files', {data: {path}}),

    // 移动文件
    moveFile: (fromPath: string, toPath: string) =>
        apiService.put('/files/move', {fromPath, toPath}),

    // 重命名文件
    renameFile: (path: string, newName: string) =>
        apiService.put('/files/rename', {path, newName}),

    // 分享文件
    shareFile: (path: string, expiresIn?: number) =>
        apiService.post('/files/share', {path, expiresIn}),
};

// 用户管理相关API
export const userApi = {
    // 获取用户信息
    getUserInfo: () => apiService.get('/user/info'),

    // 更新用户信息
    updateUserInfo: (data: any) => apiService.put('/user/info', data),

    // 修改密码
    changePassword: (oldPassword: string, newPassword: string) =>
        apiService.put('/user/password', {oldPassword, newPassword}),

    // 获取用户列表（管理员）
    getUsers: (params?: { page?: number; size?: number; keyword?: string }) =>
        apiService.get('/admin/users', {params}),

    // 创建用户（管理员）
    createUser: (userData: any) => apiService.post('/admin/users', userData),

    // 更新用户（管理员）
    updateUser: (userId: string, userData: any) =>
        apiService.put(`/admin/users/${userId}`, userData),

    // 删除用户（管理员）
    deleteUser: (userId: string) => apiService.delete(`/admin/users/${userId}`),
};

// 系统管理相关API
export const systemApi = {
    // 获取系统信息
    getSystemInfo: () => apiService.get('/system/info'),

    // 获取系统设置
    getSettings: () => apiService.get('/system/settings'),

    // 更新系统设置
    updateSettings: (settings: any) => apiService.put('/system/settings', settings),

    // 备份系统
    backupSystem: () => apiService.post('/system/backup'),

    // 恢复系统
    restoreSystem: (backupFile: File) => apiService.upload('/system/restore', backupFile),

    // 获取日志
    getLogs: (params?: { level?: string; startTime?: string; endTime?: string; page?: number; size?: number }) =>
        apiService.get('/system/logs', {params}),
};

export default apiService;