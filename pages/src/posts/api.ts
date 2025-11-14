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
            (response: AxiosResponse) => {
                const {data} = response;

                // 处理后端的响应格式 {flag: boolean, text: string, data?: any}
                if (data && typeof data === 'object') {
                    if (data.hasOwnProperty('flag')) {
                        // 后端格式：{flag: boolean, text: string, data?: any}
                        if (data.flag) {
                            return data; // 返回完整的响应数据
                        } else {
                            // 移除字符串判断，只通过HTTP状态码处理未登录状态
                            throw new ApiError(data.text || '操作失败', response.status, response);
                        }
                    } else if (data.hasOwnProperty('success')) {
                        // 标准格式：{success: boolean, message: string, data: any}
                        if (data.success) {
                            return data.data;
                        } else {
                            throw new ApiError(data.message, data.code, response);
                        }
                    }
                }
                
                // 直接返回数据（用于其他格式的响应）
                return data;
            },
            (error: AxiosError) => {
                if (error.response) {
                    // 服务器响应错误
                    const {data, status} = error.response;
                    
                    // 处理401未登录状态
                    if (status === 401) {
                        // 清除本地存储的token
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        
                        // 检查当前是否已经在登录页面，避免无限重定向
                        if (window.location.pathname !== '/login') {
                            // 跳转到登录页面
                            window.location.href = '/login';
                        }
                        
                        // 处理后端错误响应格式
                        if (data && typeof data === 'object') {
                            if (data.hasOwnProperty('flag') && data.hasOwnProperty('text')) {
                                throw new ApiError(data.text || '用户未登录', status, error.response);
                            }
                        }
                        
                        throw new ApiError('用户未登录', status, error.response);
                    }
                    
                    // 处理其他后端错误响应格式
                    if (data && typeof data === 'object') {
                        if (data.hasOwnProperty('flag') && data.hasOwnProperty('text')) {
                            throw new ApiError(data.text || '服务器错误', status, error.response);
                        } else if (data.hasOwnProperty('message')) {
                            throw new ApiError(data.message || '服务器错误', data.code || status, error.response);
                        }
                    }
                    
                    throw new ApiError('服务器错误', status, error.response);
                } else if (error.request) {
                    // 请求发送失败
                    throw new ApiError('网络连接失败，请检查网络设置', 0);
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

    // 通用请求方法
    async request<T = any>(url: string, method: string = 'GET', data?: any, config?: AxiosRequestConfig): Promise<T> {
        const upperMethod = method.toUpperCase();
        
        switch (upperMethod) {
            case 'GET':
                return this.instance.get(url, config);
            case 'POST':
                return this.instance.post(url, data, config);
            case 'PUT':
                return this.instance.put(url, data, config);
            case 'DELETE':
                return this.instance.delete(url, config);
            case 'PATCH':
                return this.instance.patch(url, data, config);
            default:
                throw new Error(`不支持的HTTP方法: ${method}`);
        }
    }
}

// 创建API服务实例
export const apiService = new ApiService();

// 路径处理辅助函数
const buildFilePath = (filePath: string, username?: string, isPersonalFile: boolean = false): string => {
    // 如果是个人文件，需要构建完整的/@home/用户名路径
    if (isPersonalFile && username) {
        // 如果是根路径，使用/@home/用户名
        if (filePath === '/') {
            return `/@home/${username}`;
        }
        // 如果是子路径，确保包含/@home/用户名前缀
        return filePath.startsWith('/@home/') ? filePath : `/@home/${username}${filePath}`;
    }
    // 公共文件直接使用原路径
    return filePath;
};

// 文件管理相关API
export const fileApi = {
    // 获取文件列表 - 使用新的后端API格式
    getFileList: (filePath: string = '/', username?: string, isPersonalFile: boolean = false) => {
        const fullPath = buildFilePath(filePath, username, isPersonalFile);
        return apiService.get(`/@files/list/path${fullPath}`);
    },

    // 获取文件列表 - 旧版本兼容
    getFileListOld: (filePath: string = '/', action: string = 'list', method: string = 'path') => {
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

    // 新的后端API格式的操作函数
    // 删除文件或文件夹
    removeFile: (filePath: string, username?: string, isPersonalFile: boolean = false) => {
        const fullPath = buildFilePath(filePath, username, isPersonalFile);
        return apiService.delete(`/@files/remove/path${fullPath}`);
    },

    // 移动文件或文件夹
    moveFileNew: (sourcePath: string, targetPath: string, username?: string, isPersonalFile: boolean = false) => {
        const fullSourcePath = buildFilePath(sourcePath, username, isPersonalFile);
        const fullTargetPath = buildFilePath(targetPath, username, isPersonalFile);
        return apiService.post(`/@files/move/path${fullSourcePath}?target=${encodeURIComponent(fullTargetPath)}`);
    },

    // 复制文件或文件夹
    copyFile: (sourcePath: string, targetPath: string, username?: string, isPersonalFile: boolean = false) => {
        const fullSourcePath = buildFilePath(sourcePath, username, isPersonalFile);
        const fullTargetPath = buildFilePath(targetPath, username, isPersonalFile);
        return apiService.post(`/@files/copy/path${fullSourcePath}?target=${encodeURIComponent(fullTargetPath)}`);
    },

    // 创建文件或文件夹
    createFileOrFolder: (path: string, target: string, username?: string, isPersonalFile: boolean = false) => {
        const fullPath = buildFilePath(path, username, isPersonalFile);
        return apiService.post(`/@files/create/path${fullPath}?target=${encodeURIComponent(target)}`);
    },

    // 重命名文件或文件夹
    renameFileNew: (filePath: string, newName: string, username?: string, isPersonalFile: boolean = false) => {
        const fullPath = buildFilePath(filePath, username, isPersonalFile);
        return apiService.post(`/@files/rename/path${fullPath}?target=${encodeURIComponent(newName)}`);
    },
};

// 用户相关API
export const userApi = {
    // 用户登录
    login: (loginData: { users_name: string; users_pass: string }) =>
        apiService.post('/@users/login/none', loginData),

    // 用户注册
    register: (registerData: { users_name: string; users_mail?: string; users_pass: string }) =>
        apiService.post('/@users/create/none', registerData),

    // 用户登出
    logout: () => apiService.post('/@users/logout/none', {}),

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
    getSystemInfo: () => apiService.get('/@system/info/none'),

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