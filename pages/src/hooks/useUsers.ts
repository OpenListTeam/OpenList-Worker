import { useState, useCallback } from 'react';
import axios from 'axios';
import { 
  UsersResult, 
  UsersConfig, 
  LoginRequest, 
  CreateUserRequest, 
  UpdateUserRequest 
} from '../types';

// API基础URL
const API_BASE_URL = '/@users';

export const useUsers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取认证token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // 设置认证token
  const setAuthToken = (token: string) => {
    localStorage.setItem('token', token);
  };

  // 清除认证token
  const clearAuthToken = () => {
    localStorage.removeItem('token');
  };

  // 获取认证头
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 处理API响应
  const handleResponse = (response: any): UsersResult => {
    if (response.data) {
      return response.data;
    }
    return {
      flag: false,
      text: '响应格式错误'
    };
  };

  // 处理API错误
  const handleError = (err: any): UsersResult => {
    console.error('API Error:', err);
    const errorMessage = err.response?.data?.text || err.message || '网络错误';
    setError(errorMessage);
    return {
      flag: false,
      text: errorMessage
    };
  };

  // 用户登录
  const login = useCallback(async (loginData: LoginRequest): Promise<UsersResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/login/post`, loginData);
      const result = handleResponse(response);
      
      if (result.flag && result.token) {
        setAuthToken(result.token);
      }
      
      return result;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 用户登出
  const logout = useCallback(async (): Promise<UsersResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/logout/post`, {}, {
        headers: getAuthHeaders()
      });
      const result = handleResponse(response);
      
      if (result.flag) {
        clearAuthToken();
      }
      
      return result;
    } catch (err) {
      clearAuthToken(); // 即使请求失败也清除本地token
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取用户列表
  const getUsers = useCallback(async (username?: string): Promise<UsersResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const url = username 
        ? `${API_BASE_URL}/select/none/${encodeURIComponent(username)}`
        : `${API_BASE_URL}/select/none`;
      
      const response = await axios.get(url, {
        headers: getAuthHeaders()
      });
      
      return handleResponse(response);
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建用户
  const createUser = useCallback(async (userData: CreateUserRequest): Promise<UsersResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/create/none`, userData, {
        headers: getAuthHeaders()
      });
      
      return handleResponse(response);
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新用户
  const updateUser = useCallback(async (userData: UpdateUserRequest): Promise<UsersResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/config/name`, userData, {
        headers: getAuthHeaders()
      });
      
      return handleResponse(response);
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除用户
  const deleteUser = useCallback(async (username: string): Promise<UsersResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/remove/post`, {
        users_name: username
      }, {
        headers: getAuthHeaders()
      });
      
      return handleResponse(response);
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 验证当前用户权限
  const checkAuth = useCallback(async (): Promise<UsersResult> => {
    const token = getAuthToken();
    if (!token) {
      return {
        flag: false,
        text: '用户未登录'
      };
    }

    setLoading(true);
    setError(null);
    
    try {
      // 通过获取用户信息来验证token有效性
      const response = await axios.get(`${API_BASE_URL}/select/none`, {
        headers: getAuthHeaders()
      });
      
      return handleResponse(response);
    } catch (err) {
      clearAuthToken(); // token无效时清除
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    login,
    logout,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    checkAuth,
    getAuthToken,
    setAuthToken,
    clearAuthToken
  };
};

export default useUsers;