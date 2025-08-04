/**
 * 增强的API服务
 * 集成缓存、去重、重试等性能优化功能
 */

import requestManager, { EnhancedRequestConfig } from '../utils/requestManager';
import TokenManager from '../utils/tokenManager';
import { useLoading } from '../components/common/LoadingManager';

// API基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

// 通用API接口类型
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
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

// 创建增强的API客户端
class EnhancedApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * 通用请求方法
   */
  private async request<T = any>(
    endpoint: string,
    config: EnhancedRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await requestManager.request<ApiResponse<T>>({
      url,
      ...config,
    });

    return response.data;
  }

  /**
   * GET请求
   */
  async get<T = any>(
    endpoint: string,
    params?: any,
    config: Partial<EnhancedRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      params,
      ...config,
    });
  }

  /**
   * POST请求
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config: Partial<EnhancedRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      data,
      ...config,
    });
  }

  /**
   * PUT请求
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    config: Partial<EnhancedRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      data,
      ...config,
    });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(
    endpoint: string,
    config: Partial<EnhancedRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...config,
    });
  }

  /**
   * 文件上传请求
   */
  async upload<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    config: Partial<EnhancedRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      cache: { enabled: false }, // 文件上传不缓存
      deduplication: false, // 文件上传不去重
      ...config,
    });
  }

  /**
   * 文件下载请求
   */
  async download(
    endpoint: string,
    params?: any,
    filename?: string,
    config: Partial<EnhancedRequestConfig> = {}
  ): Promise<void> {
    const response = await requestManager.request({
      url: `${this.baseURL}${endpoint}`,
      method: 'GET',
      params,
      responseType: 'blob',
      cache: { enabled: false }, // 下载不缓存
      ...config,
    });

    // 创建下载链接
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 尝试从响应头获取文件名
    const contentDisposition = response.headers['content-disposition'];
    let downloadFilename = filename;
    
    if (!downloadFilename && contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch) {
        downloadFilename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    
    link.download = downloadFilename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// 创建API客户端实例
const apiClient = new EnhancedApiClient();

// 认证相关API
export const enhancedAuthAPI = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post<{ user: any; token: string }>('/auth/login', credentials, {
      cache: { enabled: false },
      loadingId: 'auth-login',
    }),

  register: (userData: {
    username: string;
    password: string;
    email: string;
    role?: string;
    departmentId?: number;
  }) =>
    apiClient.post<{ user: any; token: string }>('/auth/register', userData, {
      cache: { enabled: false },
      loadingId: 'auth-register',
    }),

  getCurrentUser: () =>
    apiClient.get<{ user: any }>('/auth/me', undefined, {
      cache: { ttl: 5 * 60 * 1000 }, // 5分钟缓存
      loadingId: 'auth-user',
    }),

  validateToken: () =>
    apiClient.get<{ user: any }>('/auth/validate', undefined, {
      cache: { ttl: 2 * 60 * 1000 }, // 2分钟缓存
      silent: true,
    }),

  refreshToken: () =>
    apiClient.post<{ token: string }>('/auth/refresh', undefined, {
      cache: { enabled: false },
      silent: true,
    }),

  logout: () =>
    apiClient.post('/auth/logout', undefined, {
      cache: { enabled: false },
      silent: true,
    }),
};

// 用户管理API
export const enhancedUserAPI = {
  getUsers: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<any>>('/users', params, {
      cache: { ttl: 3 * 60 * 1000 }, // 3分钟缓存
      loadingId: 'users-list',
    }),

  getUser: (id: number) =>
    apiClient.get<any>(`/users/${id}`, undefined, {
      cache: { ttl: 5 * 60 * 1000 }, // 5分钟缓存
      loadingId: `user-${id}`,
    }),

  createUser: (userData: any) =>
    apiClient.post<any>('/users', userData, {
      cache: { enabled: false },
      loadingId: 'user-create',
    }),

  updateUser: (id: number, userData: any) =>
    apiClient.put<any>(`/users/${id}`, userData, {
      cache: { enabled: false },
      loadingId: `user-update-${id}`,
    }),

  deleteUser: (id: number) =>
    apiClient.delete(`/users/${id}`, {
      cache: { enabled: false },
      loadingId: `user-delete-${id}`,
    }),
};

// 期刊管理API
export const enhancedJournalAPI = {
  getJournals: (params?: any) =>
    apiClient.get<PaginatedResponse<any>>('/journals', params, {
      cache: { ttl: 10 * 60 * 1000 }, // 10分钟缓存
      loadingId: 'journals-list',
    }),

  getJournal: (id: number) =>
    apiClient.get<any>(`/journals/${id}`, undefined, {
      cache: { ttl: 15 * 60 * 1000 }, // 15分钟缓存
      loadingId: `journal-${id}`,
    }),

  searchJournals: (keyword: string, limit?: number) =>
    apiClient.get<any[]>('/journals/search', { q: keyword, limit }, {
      cache: { ttl: 5 * 60 * 1000 }, // 5分钟缓存
      loadingId: 'journals-search',
    }),

  importJournals: (file: File) =>
    apiClient.upload<any>('/journals/import', file, undefined, {
      loadingId: 'journals-import',
      timeout: 60000, // 1分钟超时
    }),

  downloadTemplate: () =>
    apiClient.download('/journals/template/download', undefined, 'journals-template.xlsx', {
      loadingId: 'journals-template',
    }),

  getJournalStatistics: () =>
    apiClient.get<any>('/journals/statistics', undefined, {
      cache: { ttl: 15 * 60 * 1000 }, // 15分钟缓存
      loadingId: 'journals-stats',
    }),
};

// 文献管理API
export const enhancedPublicationAPI = {
  getPublications: (params?: any) =>
    apiClient.get<PaginatedResponse<any>>('/publications', params, {
      cache: { ttl: 5 * 60 * 1000 }, // 5分钟缓存
      loadingId: 'publications-list',
    }),

  getPublication: (id: number) =>
    apiClient.get<any>(`/publications/${id}`, undefined, {
      cache: { ttl: 10 * 60 * 1000 }, // 10分钟缓存
      loadingId: `publication-${id}`,
    }),

  createPublication: (pubData: any) =>
    apiClient.post<any>('/publications', pubData, {
      cache: { enabled: false },
      loadingId: 'publication-create',
    }),

  updatePublication: (id: number, pubData: any) =>
    apiClient.put<any>(`/publications/${id}`, pubData, {
      cache: { enabled: false },
      loadingId: `publication-update-${id}`,
    }),

  deletePublication: (id: number) =>
    apiClient.delete(`/publications/${id}`, {
      cache: { enabled: false },
      loadingId: `publication-delete-${id}`,
    }),

  importPublications: (file: File, departmentId?: number) =>
    apiClient.upload<any>(
      '/publications/import',
      file,
      departmentId ? { departmentId } : undefined,
      {
        loadingId: 'publications-import',
        timeout: 120000, // 2分钟超时
      }
    ),

  matchJournals: (name: string, limit?: number) =>
    apiClient.get<any[]>('/publications/journals/match', { name, limit }, {
      cache: { ttl: 30 * 60 * 1000 }, // 30分钟缓存
      loadingId: 'journals-match',
    }),

  exportPublications: (params: any) =>
    apiClient.download('/publications/export', params, 'publications.xlsx', {
      loadingId: 'publications-export',
    }),
};

// 统计分析API
export const enhancedStatisticsAPI = {
  getDashboardStats: () =>
    apiClient.get<any>('/statistics/dashboard', undefined, {
      cache: { ttl: 5 * 60 * 1000 }, // 5分钟缓存
      loadingId: 'dashboard-stats',
    }),

  getDepartmentStatistics: (departmentId: number, params?: any) =>
    apiClient.get<any>(`/statistics/departments/${departmentId}`, params, {
      cache: { ttl: 10 * 60 * 1000 }, // 10分钟缓存
      loadingId: `dept-stats-${departmentId}`,
    }),

  getOverviewStatistics: (params?: any) =>
    apiClient.get<any>('/statistics/overview', params, {
      cache: { ttl: 15 * 60 * 1000 }, // 15分钟缓存
      loadingId: 'overview-stats',
    }),

  getYearlyTrends: (params?: any) =>
    apiClient.get<any>('/statistics/trends', params, {
      cache: { ttl: 30 * 60 * 1000 }, // 30分钟缓存
      loadingId: 'yearly-trends',
    }),

  getDepartmentsComparison: (params: any) =>
    apiClient.get<any>('/statistics/comparison', params, {
      cache: { ttl: 15 * 60 * 1000 }, // 15分钟缓存
      loadingId: 'dept-comparison',
    }),
};

// 搜索API
export const enhancedSearchAPI = {
  quickSearch: (query: string, type?: string, limit?: number) =>
    apiClient.get<any>('/search/quick', { q: query, type, limit }, {
      cache: { ttl: 5 * 60 * 1000 }, // 5分钟缓存
      loadingId: 'quick-search',
    }),

  advancedSearch: (params: any) =>
    apiClient.get<any>('/search/advanced', params, {
      cache: { ttl: 3 * 60 * 1000 }, // 3分钟缓存
      loadingId: 'advanced-search',
    }),

  getSearchSuggestions: (query: string, field?: string) =>
    apiClient.get<string[]>('/search/suggestions', { q: query, field }, {
      cache: { ttl: 10 * 60 * 1000 }, // 10分钟缓存
      silent: true,
    }),
};

// 报告生成API
export const enhancedReportAPI = {
  generateDepartmentReport: (params: any) =>
    apiClient.download('/reports/department', params, 'department-report.pdf', {
      loadingId: 'dept-report',
      timeout: 60000, // 1分钟超时
    }),

  generateHospitalReport: (params: any) =>
    apiClient.download('/reports/hospital', params, 'hospital-report.pdf', {
      loadingId: 'hospital-report',
      timeout: 120000, // 2分钟超时
    }),

  generateExcelReport: (params: any) =>
    apiClient.download('/reports/excel', params, 'report.xlsx', {
      loadingId: 'excel-report',
      timeout: 60000, // 1分钟超时
    }),
};

// 缓存管理工具
export const cacheManager = {
  clearAll: () => requestManager.clearCache(),
  clearPattern: (pattern: string) => requestManager.clearCache(pattern),
  getMetrics: () => requestManager.getMetrics(),
};

// 性能监控Hook
export const useApiMetrics = () => {
  return {
    getRequestMetrics: () => requestManager.getMetrics(),
    getTokenMetrics: () => TokenManager.getPerformanceMetrics(),
  };
};

export default apiClient;