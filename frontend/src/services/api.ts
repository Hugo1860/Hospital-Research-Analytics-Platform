import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import TokenManager from '../utils/tokenManager';
import { AuthErrorType, AUTH_ERROR_MESSAGES } from '../types/auth';

// API基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求重试配置
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition: (error: AxiosError) => boolean;
}

// 扩展的请求配置接口
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// 默认重试配置
const defaultRetryConfig: RetryConfig = {
  retries: 1,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // 只对401错误进行重试（token刷新后重试）
    return error.response?.status === 401;
  },
};

// 获取有效token的辅助函数
const getValidToken = (): string | null => {
  const token = TokenManager.getToken();
  if (!token || !TokenManager.isTokenValid()) {
    return null;
  }
  return token;
};

// 延迟函数
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// 处理认证错误的辅助函数
const handleAuthError = async (error: AxiosError): Promise<boolean> => {
  const errorData = error.response?.data as any;
  const errorCode = errorData?.code;
  
  console.log('🔍 处理认证错误:', {
    status: error.response?.status,
    code: errorCode,
    message: errorData?.error || errorData?.message,
    url: error.config?.url
  });
  
  switch (errorCode) {
    case 'TOKEN_EXPIRED':
      // 尝试刷新token
      try {
        const newToken = await TokenManager.refreshToken();
        if (newToken) {
          console.log('✅ Token刷新成功，准备重试请求');
          return true;
        } else {
          console.log('❌ Token刷新失败，需要重新登录');
          TokenManager.removeToken();
          redirectToLogin();
          message.error(AUTH_ERROR_MESSAGES[AuthErrorType.TOKEN_EXPIRED]);
          return false;
        }
      } catch (refreshError) {
        console.error('❌ Token刷新异常:', refreshError);
        TokenManager.removeToken();
        redirectToLogin();
        message.error(AUTH_ERROR_MESSAGES[AuthErrorType.TOKEN_EXPIRED]);
        return false;
      }
    
    case 'TOKEN_MISSING':
    case 'TOKEN_INVALID':
    case 'TOKEN_MALFORMED':
      // 对于明确的token问题，检查本地token状态
      const currentToken = TokenManager.getToken();
      if (!currentToken || !TokenManager.isTokenValid()) {
        console.log('❌ 本地token确实无效，需要重新登录');
        TokenManager.removeToken();
        redirectToLogin();
        message.error(AUTH_ERROR_MESSAGES[AuthErrorType.TOKEN_INVALID]);
      } else {
        // 本地token看起来有效，可能是网络或服务器问题
        console.warn('⚠️ 本地token有效但服务器拒绝，可能是临时问题');
        message.error('认证验证失败，请稍后重试');
      }
      return false;
    
    case 'USER_NOT_FOUND':
    case 'USER_INACTIVE':
      // 用户账户问题，需要重新登录
      console.log('❌ 用户账户问题:', errorData?.error);
      TokenManager.removeToken();
      redirectToLogin();
      message.error(errorData?.error || '用户账户异常，请重新登录');
      return false;
    
    case 'AUTHENTICATION_ERROR':
      // 一般认证错误，不立即登出
      console.warn('⚠️ 一般认证错误:', errorData?.error);
      message.error(errorData?.error || '认证失败，请稍后重试');
      return false;
    
    default:
      // 对于未知的认证错误，显示具体错误信息但不登出
      console.warn('⚠️ 未知认证错误:', errorData);
      const errorMessage = errorData?.error || errorData?.message || '认证失败，请稍后重试';
      message.error(errorMessage);
      return false;
  }
};

// 重定向到登录页面的辅助函数
const redirectToLogin = (): void => {
  // 保存当前路径用于登录后重定向
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== '/login') {
    TokenManager.setRedirectPath(currentPath);
  }
  
  // 避免在登录页面时重复重定向
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getValidToken();
    if (token) {
      // 确保headers对象存在
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 特殊处理文件上传请求
    if (config.data instanceof FormData) {
      // 对于FormData，不设置Content-Type，让浏览器自动设置
      // 这样可以正确设置multipart/form-data的boundary
      if (config.headers['Content-Type'] === 'application/json') {
        delete config.headers['Content-Type'];
      }
    }
    
    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理通用错误和重试
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    // 网络错误处理
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        message.error('请求超时，请稍后重试');
      } else if (error.message === 'Network Error') {
        message.error(AUTH_ERROR_MESSAGES[AuthErrorType.NETWORK_ERROR]);
      } else {
        message.error('网络连接异常，请检查网络后重试');
      }
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const responseData = data as any;

    // 处理401认证错误，支持重试
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      // 如果重试次数超过限制，直接拒绝
      if (originalRequest._retryCount > defaultRetryConfig.retries) {
        TokenManager.removeToken();
        redirectToLogin();
        message.error(AUTH_ERROR_MESSAGES[AuthErrorType.TOKEN_EXPIRED]);
        return Promise.reject(error);
      }

      // 尝试处理认证错误（可能包含token刷新）
      const canRetry = await handleAuthError(error);
      
      if (canRetry) {
        // 等待一段时间后重试
        await delay(defaultRetryConfig.retryDelay);
        
        // 更新请求头中的token
        const newToken = getValidToken();
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        
        // 重新发送请求
        return apiClient(originalRequest);
      }
      
      return Promise.reject(error);
    }

    // 处理其他错误状态码
    switch (status) {
      case 403:
        // 权限不足错误
        const permissionError = responseData?.details;
        if (permissionError) {
          message.error(`权限不足：需要 ${permissionError.required?.join(', ')} 权限`);
        } else {
          message.error(AUTH_ERROR_MESSAGES[AuthErrorType.PERMISSION_DENIED]);
        }
        break;
      
      case 404:
        message.error('请求的资源不存在');
        break;
      
      case 422:
        // 验证错误
        const validationErrors = responseData?.errors;
        if (validationErrors && Array.isArray(validationErrors)) {
          validationErrors.forEach((err: string) => message.error(err));
        } else {
          message.error('请求数据格式错误');
        }
        break;
      
      case 429:
        message.error('请求过于频繁，请稍后重试');
        break;
      
      case 500:
      case 502:
      case 503:
      case 504:
        message.error(AUTH_ERROR_MESSAGES[AuthErrorType.SERVER_ERROR]);
        break;
      
      default:
        // 其他错误
        const errorMessage = responseData?.message || responseData?.error || '请求失败，请稍后重试';
        message.error(errorMessage);
        break;
    }
    
    return Promise.reject(error);
  }
);

// 通用API接口类型
interface ApiResponse<T = any> {
  data: T;
  message?: string;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// 认证相关API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post<ApiResponse<{ user: any; token: string }>>('/auth/login', credentials),
  
  register: (userData: {
    username: string;
    password: string;
    email: string;
    role?: string;
    departmentId?: number;
  }) =>
    apiClient.post<ApiResponse<{ user: any; token: string }>>('/auth/register', userData),
  
  getCurrentUser: () =>
    apiClient.get<ApiResponse<{ user: any }>>('/auth/me'),
  
  changePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) =>
    apiClient.put<ApiResponse>('/auth/password', passwordData),
  
  logout: () =>
    apiClient.post<ApiResponse>('/auth/logout'),
};

// 用户管理API
export const userAPI = {
  getUsers: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<any>>('/users', { params }),
  
  getUser: (id: number) =>
    apiClient.get<ApiResponse<any>>(`/users/${id}`),
  
  createUser: (userData: any) =>
    apiClient.post<ApiResponse<any>>('/users', userData),
  
  updateUser: (id: number, userData: any) =>
    apiClient.put<ApiResponse<any>>(`/users/${id}`, userData),
  
  deleteUser: (id: number) =>
    apiClient.delete<ApiResponse>(`/users/${id}`),
};

// 科室管理API
export const departmentAPI = {
  getDepartments: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<any>>('/departments', { params }),
  
  getDepartment: (id: number) =>
    apiClient.get<ApiResponse<any>>(`/departments/${id}`),
  
  createDepartment: (deptData: any) =>
    apiClient.post<ApiResponse<any>>('/departments', deptData),
  
  updateDepartment: (id: number, deptData: any) =>
    apiClient.put<ApiResponse<any>>(`/departments/${id}`, deptData),
  
  deleteDepartment: (id: number) =>
    apiClient.delete<ApiResponse>(`/departments/${id}`),
  
  getDepartmentStatistics: (id: number, year?: number) =>
    apiClient.get<ApiResponse<any>>(`/departments/${id}/statistics`, {
      params: { year }
    }),
};

// 期刊管理API
export const journalAPI = {
  getJournals: (params?: any) =>
    apiClient.get<PaginatedResponse<any>>('/journals', { params }),
  
  getJournal: (id: number) =>
    apiClient.get<ApiResponse<any>>(`/journals/${id}`),
  
  createJournal: (journalData: any) =>
    apiClient.post<ApiResponse<any>>('/journals', journalData),
  
  updateJournal: (id: number, journalData: any) =>
    apiClient.put<ApiResponse<any>>(`/journals/${id}`, journalData),
  
  deleteJournal: (id: number) =>
    apiClient.delete<ApiResponse>(`/journals/${id}`),
  
  searchJournals: (keyword: string, limit?: number) =>
    apiClient.get<ApiResponse<any[]>>('/journals/search', {
      params: { q: keyword, limit }
    }),
  
  getJournalStatistics: () =>
    apiClient.get<ApiResponse<any>>('/journals/statistics'),
  
  getJournalCategories: () =>
    apiClient.get<ApiResponse<string[]>>('/journals/categories'),
  
  importJournals: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<any>>('/journals/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  downloadTemplate: () =>
    apiClient.get('/journals/template/download', {
      responseType: 'blob'
    }),
};

// 文献管理API
export const publicationAPI = {
  getPublications: (params?: any) =>
    apiClient.get<PaginatedResponse<any>>('/publications', { params }),
  
  getPublication: (id: number) =>
    apiClient.get<ApiResponse<any>>(`/publications/${id}`),
  
  createPublication: (pubData: any) =>
    apiClient.post<ApiResponse<any>>('/publications', pubData),
  
  updatePublication: (id: number, pubData: any) =>
    apiClient.put<ApiResponse<any>>(`/publications/${id}`, pubData),
  
  deletePublication: (id: number) =>
    apiClient.delete<ApiResponse>(`/publications/${id}`),
  
  matchJournals: (name: string, limit?: number) =>
    apiClient.get<ApiResponse<any[]>>('/publications/journals/match', {
      params: { name, limit }
    }),
  
  getPublicationStatistics: (params?: any) =>
    apiClient.get<ApiResponse<any>>('/publications/statistics', { params }),
  
  importPublications: (file: File, departmentId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (departmentId) {
      formData.append('departmentId', departmentId.toString());
    }
    
    // 让请求拦截器自动添加Authorization头
    // 不设置Content-Type，让浏览器自动设置multipart/form-data的boundary
    return apiClient.post<ApiResponse<any>>('/publications/import', formData);
  },
  
  downloadTemplate: () =>
    apiClient.get('/publications/template/download', {
      responseType: 'blob'
    }),
  
  exportPublications: (params: any) =>
    apiClient.get('/publications/export', {
      params,
      responseType: 'blob'
    }),
};

// 统计分析API
export const statisticsAPI = {
  getDepartmentStatistics: (departmentId: number, params?: any) =>
    apiClient.get<ApiResponse<any>>(`/statistics/departments/${departmentId}`, { params }),
  
  getDepartmentsComparison: (params: any) =>
    apiClient.get<ApiResponse<any>>('/statistics/comparison', { params }),
  
  getYearlyTrends: (params?: any) =>
    apiClient.get<ApiResponse<any>>('/statistics/trends', { params }),
  
  getOverviewStatistics: (params?: any) =>
    apiClient.get<ApiResponse<any>>('/statistics/overview', { params }),
  
  getDashboardStats: () =>
    apiClient.get<ApiResponse<any>>('/statistics/dashboard'),
};

// 搜索API
export const searchAPI = {
  advancedSearch: (params: any) =>
    apiClient.get<ApiResponse<any>>('/search/advanced', { params }),
  
  quickSearch: (query: string, type?: string, limit?: number) =>
    apiClient.get<ApiResponse<any>>('/search/quick', {
      params: { q: query, type, limit }
    }),
  
  getSearchSuggestions: (query: string, field?: string) =>
    apiClient.get<ApiResponse<string[]>>('/search/suggestions', {
      params: { q: query, field }
    }),
  
  saveSearchHistory: (searchData: any) =>
    apiClient.post<ApiResponse>('/search/history', searchData),
  
  getPopularSearches: () =>
    apiClient.get<ApiResponse<any[]>>('/search/popular'),
};

// 导出API
export const exportAPI = {
  exportPublications: (params: any) =>
    apiClient.get('/export/publications', {
      params,
      responseType: 'blob'
    }),
  
  exportJournals: (params: any) =>
    apiClient.get('/export/journals', {
      params,
      responseType: 'blob'
    }),
  
  exportStatistics: (params: any) =>
    apiClient.get('/export/statistics', {
      params,
      responseType: 'blob'
    }),
};

// 报告生成API
export const reportAPI = {
  generateDepartmentReport: (params: any) =>
    apiClient.get('/reports/department', {
      params,
      responseType: params.format === 'pdf' ? 'blob' : 'json'
    }),
  
  generateHospitalReport: (params: any) =>
    apiClient.get('/reports/hospital', {
      params,
      responseType: params.format === 'pdf' ? 'blob' : 'json'
    }),
  
  generateCustomReport: (reportData: any) =>
    apiClient.post('/reports/custom', reportData, {
      responseType: reportData.format === 'pdf' ? 'blob' : 'json'
    }),
  
  generateExcelReport: (params: any) =>
    apiClient.get('/reports/excel', {
      params,
      responseType: 'blob'
    }),
  
  downloadReportTemplate: () =>
    apiClient.get('/reports/template', {
      responseType: 'blob'
    }),
};

// 文件下载辅助函数
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default apiClient;