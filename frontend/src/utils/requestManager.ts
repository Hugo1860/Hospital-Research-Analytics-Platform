/**
 * 请求管理器
 * 提供API请求的缓存、去重、重试等功能
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { message } from 'antd';
import tokenManager from './tokenManager';

// 缓存配置
interface CacheConfig {
  ttl: number; // 缓存时间（毫秒）
  key?: string; // 自定义缓存键
  enabled: boolean; // 是否启用缓存
}

// 重试配置
interface RetryConfig {
  times: number; // 重试次数
  delay: number; // 重试延迟（毫秒）
  condition?: (error: AxiosError) => boolean; // 重试条件
}

// 请求配置扩展
interface EnhancedRequestConfig extends AxiosRequestConfig {
  cache?: Partial<CacheConfig>;
  retry?: Partial<RetryConfig>;
  deduplication?: boolean; // 是否启用请求去重
  loadingId?: string; // 加载状态ID
  silent?: boolean; // 是否静默请求（不显示错误提示）
}

// 缓存项
interface CacheItem {
  data: any;
  expiry: number;
  etag?: string;
  lastModified?: string;
}

// 默认配置
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5分钟
  enabled: true,
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  times: 3,
  delay: 1000,
  condition: (error) => {
    // 只对网络错误和5xx错误重试
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  },
};

/**
 * 请求管理器类
 */
class RequestManager {
  private static instance: RequestManager;
  private cache: Map<string, CacheItem> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private maxConcurrentRequests = 6;
  private activeRequests = 0;

  // 性能指标
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    deduplicatedRequests: 0,
    retriedRequests: 0,
    failedRequests: 0,
  };

  private constructor() {
    this.setupCacheCleanup();
  }

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  /**
   * 发送请求
   */
  async request<T = any>(config: EnhancedRequestConfig): Promise<AxiosResponse<T>> {
    this.metrics.totalRequests++;

    // 生成请求键用于缓存和去重
    const requestKey = this.generateRequestKey(config);

    // 检查缓存
    if (this.shouldUseCache(config)) {
      const cachedResponse = this.getFromCache<T>(requestKey);
      if (cachedResponse) {
        this.metrics.cacheHits++;
        console.log(`[RequestManager] 缓存命中: ${requestKey}`);
        return cachedResponse;
      }
      this.metrics.cacheMisses++;
    }

    // 请求去重
    if (config.deduplication !== false) {
      const pendingRequest = this.pendingRequests.get(requestKey);
      if (pendingRequest) {
        this.metrics.deduplicatedRequests++;
        console.log(`[RequestManager] 请求去重: ${requestKey}`);
        return pendingRequest;
      }
    }

    // 创建请求Promise
    const requestPromise = this.executeRequest<T>(config, requestKey);

    // 添加到待处理请求
    if (config.deduplication !== false) {
      this.pendingRequests.set(requestKey, requestPromise);
    }

    try {
      const response = await requestPromise;

      // 缓存响应
      if (this.shouldUseCache(config) && response.status === 200) {
        this.setCache(requestKey, response, config.cache);
      }

      return response;
    } finally {
      // 清理待处理请求
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, config?: EnhancedRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: EnhancedRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: EnhancedRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: EnhancedRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * 清除缓存
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache.entries()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    console.log(`[RequestManager] 缓存已清除${pattern ? ` (模式: ${pattern})` : ''}`);
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      pendingRequestsCount: this.pendingRequests.size,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
    };
  }

  /**
   * 执行请求
   */
  private async executeRequest<T>(config: EnhancedRequestConfig, requestKey: string): Promise<AxiosResponse<T>> {
    // 并发控制
    if (this.activeRequests >= this.maxConcurrentRequests) {
      await this.queueRequest(() => this.executeRequestInternal<T>(config, requestKey));
    }

    return this.executeRequestInternal<T>(config, requestKey);
  }

  /**
   * 内部执行请求
   */
  private async executeRequestInternal<T>(config: EnhancedRequestConfig, requestKey: string): Promise<AxiosResponse<T>> {
    this.activeRequests++;

    try {
      // 添加认证头
      const enhancedConfig = await this.addAuthHeader(config);

      // 执行请求（带重试）
      const response = await this.executeWithRetry<T>(enhancedConfig);

      return response;
    } catch (error) {
      this.metrics.failedRequests++;
      
      if (!config.silent) {
        this.handleRequestError(error as AxiosError);
      }
      
      throw error;
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  /**
   * 带重试的请求执行
   */
  private async executeWithRetry<T>(config: EnhancedRequestConfig): Promise<AxiosResponse<T>> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
    let lastError: AxiosError;

    for (let attempt = 0; attempt <= retryConfig.times; attempt++) {
      try {
        const response = await axios(config);
        
        if (attempt > 0) {
          this.metrics.retriedRequests++;
          console.log(`[RequestManager] 重试成功: ${config.url}, 尝试次数: ${attempt}`);
        }
        
        return response;
      } catch (error) {
        lastError = error as AxiosError;

        // 检查是否应该重试
        if (attempt < retryConfig.times && retryConfig.condition?.(lastError)) {
          const delay = retryConfig.delay * Math.pow(2, attempt); // 指数退避
          console.log(`[RequestManager] 请求失败，${delay}ms后重试: ${config.url}, 尝试次数: ${attempt + 1}`);
          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    throw lastError!;
  }

  /**
   * 添加认证头
   */
  private async addAuthHeader(config: EnhancedRequestConfig): Promise<AxiosRequestConfig> {
    const token = tokenManager.getToken();
    
    if (token) {
      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }

    return config;
  }

  /**
   * 生成请求键
   */
  private generateRequestKey(config: EnhancedRequestConfig): string {
    if (config.cache?.key) {
      return config.cache.key;
    }

    const { method = 'GET', url, params, data } = config;
    const paramsStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    
    return `${method}:${url}:${paramsStr}:${dataStr}`;
  }

  /**
   * 检查是否应该使用缓存
   */
  private shouldUseCache(config: EnhancedRequestConfig): boolean {
    const cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config.cache };
    return cacheConfig.enabled && (config.method === 'GET' || !config.method);
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache<T>(key: string): AxiosResponse<T> | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    // 构造响应对象
    return {
      data: item.data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    } as AxiosResponse<T>;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, response: AxiosResponse, cacheConfig?: Partial<CacheConfig>): void {
    const config = { ...DEFAULT_CACHE_CONFIG, ...cacheConfig };
    
    const item: CacheItem = {
      data: response.data,
      expiry: Date.now() + config.ttl,
      etag: response.headers.etag,
      lastModified: response.headers['last-modified'],
    };

    this.cache.set(key, item);
  }

  /**
   * 请求队列管理
   */
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * 处理请求队列
   */
  private processQueue(): void {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    if (this.activeRequests < this.maxConcurrentRequests) {
      this.isProcessingQueue = true;
      const nextRequest = this.requestQueue.shift();
      
      if (nextRequest) {
        nextRequest().finally(() => {
          this.isProcessingQueue = false;
          this.processQueue();
        });
      } else {
        this.isProcessingQueue = false;
      }
    }
  }

  /**
   * 处理请求错误
   */
  private handleRequestError(error: AxiosError): void {
    if (error.response) {
      // 服务器响应错误
      const status = error.response.status;
      const data = error.response.data as any;
      
      switch (status) {
        case 401:
          message.error('登录已过期，请重新登录');
          break;
        case 403:
          message.error('权限不足');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 500:
          message.error('服务器内部错误');
          break;
        default:
          message.error(data?.message || `请求失败 (${status})`);
      }
    } else if (error.request) {
      // 网络错误
      message.error('网络连接异常，请检查网络设置');
    } else {
      // 其他错误
      message.error('请求配置错误');
    }
  }

  /**
   * 设置缓存清理定时器
   */
  private setupCacheCleanup(): void {
    // 每10分钟清理一次过期缓存
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`[RequestManager] 清理了 ${cleanedCount} 个过期缓存项`);
      }
    }, 10 * 60 * 1000);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例实例
export default RequestManager.getInstance();

// 导出类型
export type { EnhancedRequestConfig, CacheConfig, RetryConfig };