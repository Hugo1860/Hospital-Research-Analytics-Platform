/**
 * Token管理工具类
 * 提供token的存储、验证、刷新等核心功能
 * 支持跨标签页状态同步
 */

import { message } from 'antd';

// Token数据接口
interface TokenData {
  token: string;
  expiry: number;
  refreshToken?: string;
  lastValidated: number;
}

// 缓存项接口
interface CacheItem<T> {
  data: T;
  expiry: number;
  lastAccessed: number;
}

// 请求去重接口
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

// 存储键名常量
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  TOKEN_DATA: 'auth_token_data',
  USER: 'auth_user',
  REDIRECT_PATH: 'auth_redirect_path'
} as const;

// 事件类型
type TokenEventType = 'token_updated' | 'token_removed' | 'token_expired' | 'user_updated';

// 事件监听器类型
type TokenEventListener = (eventType: TokenEventType, data?: any) => void;

/**
 * Token管理器单例类
 */
class TokenManager {
  private static instance: TokenManager;
  private listeners: Set<TokenEventListener> = new Set();
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private tokenCheckInterval: NodeJS.Timeout | null = null;
  private memoryCleanupInterval: NodeJS.Timeout | null = null;
  
  // 缓存相关
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
  private readonly MAX_CACHE_SIZE = 100;
  
  // 请求去重相关
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_TIMEOUT = 30 * 1000; // 30秒超时
  
  // 性能监控
  private performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    duplicateRequestsPrevented: 0,
    memoryCleanups: 0
  };

  private constructor() {
    this.setupStorageListener();
    this.startTokenValidationCheck();
    this.startMemoryCleanup();
  }

  /**
   * 获取TokenManager单例实例
   */
  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * 获取当前token
   */
  getToken(): string | null {
    try {
      const tokenData = this.getTokenData();
      if (!tokenData) {
        return null;
      }

      // 检查token是否过期
      if (this.isTokenExpired(tokenData)) {
        this.removeToken();
        this.notifyListeners('token_expired');
        return null;
      }

      return tokenData.token;
    } catch (error) {
      console.error('获取token失败:', error);
      this.removeToken();
      return null;
    }
  }

  /**
   * 设置token
   */
  setToken(token: string, expiry?: number): void {
    try {
      const now = Date.now();
      const tokenExpiry = expiry || (now + 24 * 60 * 60 * 1000); // 默认24小时过期

      const tokenData: TokenData = {
        token,
        expiry: tokenExpiry,
        lastValidated: now
      };

      // 保存到localStorage
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.TOKEN_DATA, JSON.stringify(tokenData));

      this.notifyListeners('token_updated', {
        source: 'local',
        timestamp: now,
        tokenData
      });
    } catch (error) {
      console.error('设置token失败:', error);
      message.error('保存登录状态失败');
    }
  }

  /**
   * 设置用户信息
   */
  setUser(user: any): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      this.notifyListeners('user_updated', {
        source: 'local',
        timestamp: Date.now(),
        user
      });
    } catch (error) {
      console.error('设置用户信息失败:', error);
    }
  }

  /**
   * 获取用户信息
   */
  getUser(): any | null {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 移除token
   */
  removeToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_DATA);
      localStorage.removeItem(STORAGE_KEYS.USER);
      
      this.notifyListeners('token_removed', {
        source: 'local',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('移除token失败:', error);
    }
  }

  /**
   * 检查token是否有效
   */
  isTokenValid(): boolean {
    const tokenData = this.getTokenData();
    if (!tokenData) {
      return false;
    }

    return !this.isTokenExpired(tokenData);
  }

  /**
   * 检查token是否过期
   */
  isTokenExpired(tokenData?: TokenData): boolean {
    const data = tokenData || this.getTokenData();
    if (!data) {
      return true;
    }

    const now = Date.now();
    return now >= data.expiry;
  }

  /**
   * 获取token过期时间
   */
  getTokenExpiry(): number | null {
    const tokenData = this.getTokenData();
    return tokenData?.expiry || null;
  }

  /**
   * 获取token剩余有效时间（毫秒）
   */
  getTokenRemainingTime(): number {
    const tokenData = this.getTokenData();
    if (!tokenData) {
      return 0;
    }

    const now = Date.now();
    const remaining = tokenData.expiry - now;
    return Math.max(0, remaining);
  }

  /**
   * 检查token是否即将过期（默认5分钟内）
   */
  isTokenExpiringSoon(thresholdMs: number = 5 * 60 * 1000): boolean {
    const remaining = this.getTokenRemainingTime();
    return remaining > 0 && remaining <= thresholdMs;
  }

  /**
   * 刷新token（预留接口，需要后端支持）
   */
  async refreshToken(): Promise<string | null> {
    try {
      const tokenData = this.getTokenData();
      if (!tokenData || !tokenData.refreshToken) {
        return null;
      }

      // TODO: 实现实际的token刷新逻辑
      // const response = await authAPI.refreshToken(tokenData.refreshToken);
      // const newToken = response.data.token;
      // this.setToken(newToken, response.data.expiry);
      // return newToken;

      console.warn('Token刷新功能尚未实现');
      return null;
    } catch (error) {
      console.error('刷新token失败:', error);
      return null;
    }
  }

  /**
   * 保存重定向路径
   */
  setRedirectPath(path: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.REDIRECT_PATH, path);
    } catch (error) {
      console.error('保存重定向路径失败:', error);
    }
  }

  /**
   * 获取重定向路径（不清除）
   */
  getRedirectPath(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.REDIRECT_PATH);
    } catch (error) {
      console.error('获取重定向路径失败:', error);
      return null;
    }
  }

  /**
   * 获取并清除重定向路径
   */
  getAndClearRedirectPath(): string | null {
    try {
      const path = localStorage.getItem(STORAGE_KEYS.REDIRECT_PATH);
      if (path) {
        localStorage.removeItem(STORAGE_KEYS.REDIRECT_PATH);
      }
      return path;
    } catch (error) {
      console.error('获取重定向路径失败:', error);
      return null;
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: TokenEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: TokenEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * 缓存token验证结果
   */
  cacheTokenValidation(token: string, isValid: boolean, ttl: number = this.CACHE_TTL): void {
    const cacheKey = `token_validation_${token.substring(0, 10)}`;
    this.setCache(cacheKey, isValid, ttl);
  }

  /**
   * 获取缓存的token验证结果
   */
  getCachedTokenValidation(token: string): boolean | null {
    const cacheKey = `token_validation_${token.substring(0, 10)}`;
    return this.getCache(cacheKey);
  }

  /**
   * 请求去重装饰器
   */
  async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // 检查是否有相同的请求正在进行
    const existingRequest = this.pendingRequests.get(key);
    if (existingRequest) {
      // 检查请求是否超时
      if (Date.now() - existingRequest.timestamp < this.REQUEST_TIMEOUT) {
        this.performanceMetrics.duplicateRequestsPrevented++;
        console.log(`[TokenManager] 请求去重: ${key}`);
        return existingRequest.promise as Promise<T>;
      } else {
        // 清除超时的请求
        this.pendingRequests.delete(key);
      }
    }

    // 创建新请求
    const promise = requestFn().finally(() => {
      // 请求完成后清除
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.cache.size,
      pendingRequestsCount: this.pendingRequests.size,
      cacheHitRate: this.performanceMetrics.cacheHits / 
        (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0
    };
  }

  /**
   * 清理资源
   */
  destroy(): void {
    // 移除storage监听器
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }

    // 清除定时器
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }

    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }

    // 清除缓存和待处理请求
    this.cache.clear();
    this.pendingRequests.clear();

    // 清除监听器
    this.listeners.clear();
  }

  /**
   * 获取token数据
   */
  private getTokenData(): TokenData | null {
    try {
      const tokenDataStr = localStorage.getItem(STORAGE_KEYS.TOKEN_DATA);
      if (!tokenDataStr) {
        return null;
      }

      const tokenData = JSON.parse(tokenDataStr) as TokenData;
      
      // 验证数据结构
      if (!tokenData.token || !tokenData.expiry) {
        return null;
      }

      return tokenData;
    } catch (error) {
      console.error('解析token数据失败:', error);
      return null;
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(eventType: TokenEventType, data?: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Token事件监听器执行失败:', error);
      }
    });
  }

  /**
   * 设置localStorage监听器，实现跨标签页同步
   */
  private setupStorageListener(): void {
    this.storageListener = (event: StorageEvent) => {
      // 只处理token相关的存储变化
      if (!event.key || !Object.values(STORAGE_KEYS).includes(event.key as any)) {
        return;
      }

      // 防止处理自己触发的事件
      if (event.storageArea !== localStorage) {
        return;
      }

      console.log(`[TokenManager] 跨标签页存储事件: ${event.key}`, {
        oldValue: event.oldValue,
        newValue: event.newValue,
        url: event.url
      });

      switch (event.key) {
        case STORAGE_KEYS.TOKEN:
          this.handleTokenChange(event);
          break;
        case STORAGE_KEYS.TOKEN_DATA:
          this.handleTokenDataChange(event);
          break;
        case STORAGE_KEYS.USER:
          this.handleUserChange(event);
          break;
        default:
          break;
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  /**
   * 处理token变化事件
   */
  private handleTokenChange(event: StorageEvent): void {
    if (event.newValue === null && event.oldValue !== null) {
      // token被删除（用户在其他标签页登出）
      console.log('[TokenManager] 检测到其他标签页登出');
      this.notifyListeners('token_removed', {
        source: 'cross_tab',
        timestamp: Date.now()
      });
    } else if (event.newValue !== null && event.oldValue === null) {
      // token被添加（用户在其他标签页登录）
      console.log('[TokenManager] 检测到其他标签页登录');
      this.notifyListeners('token_updated', {
        source: 'cross_tab',
        timestamp: Date.now(),
        token: event.newValue
      });
    } else if (event.newValue !== event.oldValue && event.newValue !== null) {
      // token被更新（token刷新）
      console.log('[TokenManager] 检测到其他标签页token更新');
      this.notifyListeners('token_updated', {
        source: 'cross_tab',
        timestamp: Date.now(),
        token: event.newValue
      });
    }
  }

  /**
   * 处理token数据变化事件
   */
  private handleTokenDataChange(event: StorageEvent): void {
    try {
      if (event.newValue === null && event.oldValue !== null) {
        // token数据被删除
        console.log('[TokenManager] 检测到其他标签页清除token数据');
        this.notifyListeners('token_removed', {
          source: 'cross_tab',
          timestamp: Date.now()
        });
      } else if (event.newValue !== null) {
        // token数据被更新
        const newTokenData = JSON.parse(event.newValue) as TokenData;
        const oldTokenData = event.oldValue ? JSON.parse(event.oldValue) as TokenData : null;

        // 检查是否是token过期
        if (this.isTokenExpired(newTokenData)) {
          console.log('[TokenManager] 检测到其他标签页token过期');
          this.notifyListeners('token_expired', {
            source: 'cross_tab',
            timestamp: Date.now(),
            expiry: newTokenData.expiry
          });
        } else if (!oldTokenData || newTokenData.token !== oldTokenData.token) {
          // 新的token或token更新
          console.log('[TokenManager] 检测到其他标签页token数据更新');
          this.notifyListeners('token_updated', {
            source: 'cross_tab',
            timestamp: Date.now(),
            tokenData: newTokenData
          });
        }
      }
    } catch (error) {
      console.error('处理token数据变化事件失败:', error);
    }
  }

  /**
   * 处理用户信息变化事件
   */
  private handleUserChange(event: StorageEvent): void {
    try {
      if (event.newValue !== event.oldValue) {
        const newUser = event.newValue ? JSON.parse(event.newValue) : null;
        console.log('[TokenManager] 检测到其他标签页用户信息更新');
        this.notifyListeners('user_updated', {
          source: 'cross_tab',
          timestamp: Date.now(),
          user: newUser
        });
      }
    } catch (error) {
      console.error('处理用户信息变化事件失败:', error);
    }
  }

  /**
   * 启动token有效性检查定时器
   */
  private startTokenValidationCheck(): void {
    // 每分钟检查一次token有效性
    this.tokenCheckInterval = setInterval(() => {
      const tokenData = this.getTokenData();
      if (tokenData && this.isTokenExpired(tokenData)) {
        this.removeToken();
        this.notifyListeners('token_expired');
      }
    }, 60 * 1000);
  }

  /**
   * 启动内存清理定时器
   */
  private startMemoryCleanup(): void {
    // 每5分钟清理一次过期缓存和超时请求
    this.memoryCleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
      this.cleanupTimeoutRequests();
      this.performanceMetrics.memoryCleanups++;
    }, 5 * 60 * 1000);
  }

  /**
   * 设置缓存
   */
  private setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    // 如果缓存已满，清理最旧的项
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheItem();
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
      lastAccessed: Date.now()
    });
  }

  /**
   * 获取缓存
   */
  private getCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      this.performanceMetrics.cacheMisses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.performanceMetrics.cacheMisses++;
      return null;
    }

    // 更新访问时间
    item.lastAccessed = Date.now();
    this.performanceMetrics.cacheHits++;
    return item.data as T;
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[TokenManager] 清理了 ${cleanedCount} 个过期缓存项`);
    }
  }

  /**
   * 清理超时请求
   */
  private cleanupTimeoutRequests(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[TokenManager] 清理了 ${cleanedCount} 个超时请求`);
    }
  }

  /**
   * 驱逐最旧的缓存项
   */
  private evictOldestCacheItem(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[TokenManager] 驱逐最旧缓存项: ${oldestKey}`);
    }
  }
}

// 导出单例实例
export default TokenManager.getInstance();

// 导出类型
export type { TokenEventType, TokenEventListener, TokenData };