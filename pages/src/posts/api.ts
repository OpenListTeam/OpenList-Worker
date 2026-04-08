import axios from 'axios';
import type {AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError} from 'axios';
import { useAuthStore } from '../store';

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
            baseURL = import.meta.env.VITE_API_BASE_URL || '';
        } catch (error) {
            console.warn('无法读取环境变量，使用默认API地址');
            baseURL = '';
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
                // 从 Zustand 持久化存储中读取 token
                const token = useAuthStore.getState().token;
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

                // 处理后端的响应格式
                if (data && typeof data === 'object') {
                    if (data.hasOwnProperty('flag')) {
                        // 旧版格式：{flag: boolean, text: string, data?: any}
                        // 直接返回完整响应，让业务代码自行判断 flag
                        return data;
                    } else if (data.hasOwnProperty('code') && data.hasOwnProperty('message')) {
                        // 新版 Go 后端格式：{code: number, message: string, data?: any}
                        if (data.code === 200) {
                            // 成功时返回 data 字段内容（若无 data 则返回空对象）
                            return data.data !== undefined ? data.data : {};
                        } else {
                            throw new ApiError(data.message, data.code, response);
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
                        // 清除 Zustand 认证状态（同时会清除 localStorage 中的持久化数据）
                        useAuthStore.getState().logout();
                        
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
    // 获取文件列表 - 新版 /api/fs/list
    getFileList: (filePath: string = '/', password?: string, page: number = 1, perPage: number = 0, refresh: boolean = false) => {
        return apiService.post('/api/fs/list', { path: filePath, password: password || '', page, per_page: perPage, refresh });
    },

    // 获取文件/目录详情
    getFileInfo: (filePath: string, password?: string) =>
        apiService.post('/api/fs/get', { path: filePath, password: password || '' }),

    // 搜索文件
    searchFiles: (path: string, keywords: string, scope: number = 0, page: number = 1, perPage: number = 0, password?: string) =>
        apiService.post('/api/fs/search', { parent: path, keywords, scope, page, per_page: perPage, password: password || '' }),

    // 获取目录列表（用于选择目标目录）
    getDirs: (path: string, password?: string, forceRoot: boolean = false) =>
        apiService.get('/api/fs/dirs', { params: { path, password: password || '', force_root: forceRoot } }),

    // 创建文件夹
    mkdir: (path: string) =>
        apiService.post('/api/fs/mkdir', { path }),

    // 重命名
    rename: (path: string, name: string) =>
        apiService.post('/api/fs/rename', { path, name }),

    // 移动文件
    move: (srcDir: string, dstDir: string, names: string[]) =>
        apiService.post('/api/fs/move', { src_dir: srcDir, dst_dir: dstDir, names }),

    // 复制文件
    copy: (srcDir: string, dstDir: string, names: string[]) =>
        apiService.post('/api/fs/copy', { src_dir: srcDir, dst_dir: dstDir, names }),

    // 删除文件
    remove: (dir: string, names: string[]) =>
        apiService.post('/api/fs/remove', { dir, names }),

    // 获取下载链接
    getLink: (path: string, password?: string) =>
        apiService.post('/api/fs/link', { path, password: password || '' }),

    // 添加离线下载
    addOfflineDownload: (path: string, urls: string[], tool: string = 'aria2', deletePolicy: string = 'delete_on_upload_succeed') =>
        apiService.post('/api/fs/add_offline_download', { path, urls, tool, delete_policy: deletePolicy }),

    // 批量重命名
    batchRename: (srcDir: string, renameObjects: Array<{ src_name: string; new_name: string }>) =>
        apiService.post('/api/fs/batch_rename', { src_dir: srcDir, rename_objects: renameObjects }),

    // 上传文件（PUT 方式）
    uploadFile: (filePath: string, file: File, onProgress?: (progress: number) => void) => {
        const token = (apiService as any).instance?.defaults?.headers?.Authorization || '';
        return apiService.put('/api/fs/put', file, {
            headers: {
                'File-Path': encodeURIComponent(filePath),
                'Content-Type': file.type || 'application/octet-stream',
                'Content-Length': String(file.size),
            },
            onUploadProgress: (progressEvent: any) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });
    },

    // 下载文件（直接下载路径）
    getDownloadUrl: (path: string) => `/d${path}`,

    // 代理下载路径
    getProxyUrl: (path: string) => `/p${path}`,

    // 旧版兼容（保留，逐步迁移）
    getFiles: (params?: { path?: string; type?: string }) =>
        apiService.post('/api/fs/list', { path: params?.path || '/', page: 1, per_page: 0 }),

    downloadFile: (path: string) =>
        apiService.download(`/d${path}`),
};

// 用户相关API
export const userApi = {
    // 用户登录
    login: (loginData: { username: string; password: string }) =>
        apiService.post('/api/auth/login', loginData),

    // 用户登录（哈希密码）
    loginHash: (loginData: { username: string; password: string; otp_code?: string }) =>
        apiService.post('/api/auth/login/hash', loginData),

    // 用户登出
    logout: () => apiService.get('/api/auth/logout'),

    // 获取当前用户信息
    getMe: () => apiService.get('/api/me'),

    // 更新当前用户信息
    updateMe: (data: any) => apiService.post('/api/me/update', data),

    // 管理员：获取用户列表
    getUsers: (params?: { page?: number; per_page?: number }) =>
        apiService.get('/api/admin/user/list', { params }),

    // 管理员：获取单个用户
    getUser: (id: number) =>
        apiService.get('/api/admin/user/get', { params: { id } }),

    // 管理员：创建用户
    createUser: (userData: any) =>
        apiService.post('/api/admin/user/create', userData),

    // 管理员：更新用户
    updateUser: (userData: any) =>
        apiService.post('/api/admin/user/update', userData),

    // 管理员：删除用户
    deleteUser: (id: number) =>
        apiService.post('/api/admin/user/delete', { id }),

    // 管理员：取消2FA
    cancel2FA: (id: number) =>
        apiService.post('/api/admin/user/cancel_2fa', { id }),

    // 用户注册（公开接口）
    register: (data: { username: string; password: string; email?: string }) =>
        apiService.post('/api/auth/register', data),
};

// 存储管理相关API
export const storageApi = {
    // 获取存储列表
    list: (params?: { page?: number; per_page?: number }) =>
        apiService.get('/api/admin/storage/list', { params }),

    // 获取单个存储
    get: (id: number) =>
        apiService.get('/api/admin/storage/get', { params: { id } }),

    // 创建存储
    create: (data: any) =>
        apiService.post('/api/admin/storage/create', data),

    // 更新存储
    update: (data: any) =>
        apiService.post('/api/admin/storage/update', data),

    // 删除存储
    delete: (id: number) =>
        apiService.post('/api/admin/storage/delete', { id }),

    // 启用存储
    enable: (id: number) =>
        apiService.post('/api/admin/storage/enable', { id }),

    // 禁用存储
    disable: (id: number) =>
        apiService.post('/api/admin/storage/disable', { id }),

    // 重载所有存储
    loadAll: () =>
        apiService.post('/api/admin/storage/load_all', {}),

    // 获取驱动列表
    getDrivers: () =>
        apiService.get('/api/admin/driver/list'),

    // 获取驱动名称列表
    getDriverNames: () =>
        apiService.get('/api/admin/driver/names'),

    // 获取驱动信息
    getDriverInfo: (driverName: string) =>
        apiService.get('/api/admin/driver/info', { params: { driver: driverName } }),
};

// 系统设置相关API
export const settingApi = {
    // 获取公开设置
    getPublicSettings: () =>
        apiService.get('/api/public/settings'),

    // 获取设置列表
    list: (params?: { group?: number }) =>
        apiService.get('/api/admin/setting/list', { params }),

    // 获取单个设置
    get: (key: string) =>
        apiService.get('/api/admin/setting/get', { params: { key } }),

    // 保存设置
    save: (settings: Array<{ key: string; value: string; type?: string }>) =>
        apiService.post('/api/admin/setting/save', settings),

    // 删除设置
    delete: (key: string) =>
        apiService.post('/api/admin/setting/delete', { key }),

    // 重置 token
    resetToken: () =>
        apiService.post('/api/admin/setting/reset_token', {}),
};

// 元信息（路径规则）相关API
export const metaApi = {
    // 获取元信息列表
    list: (params?: { page?: number; per_page?: number }) =>
        apiService.get('/api/admin/meta/list', { params }),

    // 获取单个元信息
    get: (id: number) =>
        apiService.get('/api/admin/meta/get', { params: { id } }),

    // 创建元信息
    create: (data: any) =>
        apiService.post('/api/admin/meta/create', data),

    // 更新元信息
    update: (data: any) =>
        apiService.post('/api/admin/meta/update', data),

    // 删除元信息
    delete: (id: number) =>
        apiService.post('/api/admin/meta/delete', { id }),
};

// 分享相关API
export const shareApi = {
    // 获取分享列表
    list: () =>
        apiService.get('/api/share/list'),

    // 获取单个分享
    get: (id: number) =>
        apiService.get('/api/share/get', { params: { id } }),

    // 创建分享
    create: (data: any) =>
        apiService.post('/api/share/create', data),

    // 更新分享
    update: (data: any) =>
        apiService.post('/api/share/update', data),

    // 删除分享
    delete: (id: number) =>
        apiService.post('/api/share/delete', { id }),

    // 启用分享
    enable: (id: number) =>
        apiService.post('/api/share/enable', { id }),

    // 禁用分享
    disable: (id: number) =>
        apiService.post('/api/share/disable', { id }),
};

// 任务管理相关API
export const taskApi = {
    // 获取未完成任务
    undone: (type: string) =>
        apiService.get(`/api/task/${type}/undone`),

    // 获取已完成任务
    done: (type: string) =>
        apiService.get(`/api/task/${type}/done`),

    // 取消任务
    cancel: (type: string, tid: string) =>
        apiService.post(`/api/task/${type}/cancel`, { tid }),

    // 删除任务
    delete: (type: string, tid: string) =>
        apiService.post(`/api/task/${type}/delete`, { tid }),

    // 重试任务
    retry: (type: string, tid: string) =>
        apiService.post(`/api/task/${type}/retry`, { tid }),

    // 清除已完成任务
    clearDone: (type: string) =>
        apiService.post(`/api/task/${type}/clear_done`, {}),

    // 清除已成功任务
    clearSucceeded: (type: string) =>
        apiService.post(`/api/task/${type}/clear_succeeded`, {}),

    // 重试失败任务
    retryFailed: (type: string) =>
        apiService.post(`/api/task/${type}/retry_failed`, {}),
};

// 系统管理相关API
export const systemApi = {
    // 获取系统信息（需认证）
    getSystemInfo: () => apiService.get('/@setup/info/none'),

    // 检查系统初始化状态（公开）
    getSetupStatus: () => apiService.get('/@setup/status/none'),

    // 系统初始化（公开）
    init: (data: { username: string; password: string; email?: string }) =>
        apiService.post('/@setup/init/none', data),

    // ping
    ping: () => apiService.get('/ping'),
};

export default apiService;