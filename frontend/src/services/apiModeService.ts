import axios from 'axios';

export interface ApiStatus {
  isAvailable: boolean;
  mode: 'demo' | 'real';
  lastChecked: number;
  error?: string;
  services?: {
    database?: string;
    auth?: string;
    filesystem?: string;
  };
}

export interface ApiModeConfig {
  mode: 'demo' | 'real';
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  healthCheckInterval: number;
  fallbackToDemo: boolean;
}

const API_MODE_CONFIG: Record<string, ApiModeConfig> = {
  demo: {
    mode: 'demo',
    baseUrl: 'mock://localhost',
    timeout: 1000,
    retryAttempts: 0,
    healthCheckInterval: 0,
    fallbackToDemo: false
  },
  real: {
    mode: 'real',
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3002/api',
    timeout: 30000,
    retryAttempts: 3,
    healthCheckInterval: 60000,
    fallbackToDemo: true
  }
};

const STORAGE_KEYS = {
  API_MODE: 'api_mode',
  API_STATUS: 'api_status',
  LAST_HEALTH_CHECK: 'last_health_check'
};

class ApiModeService {
  private static instance: ApiModeService;
  private currentMode: 'demo' | 'real' = 'real';
  private lastStatus: ApiStatus | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): ApiModeService {
    if (!ApiModeService.instance) {
      ApiModeService.instance = new ApiModeService();
    }
    return ApiModeService.instance;
  }

  constructor() {
    this.loadStoredMode();
    this.startHealthCheck();
  }

  /**
   * 检查API健康状态
   */
  async checkApiHealth(): Promise<ApiStatus> {
    const config = API_MODE_CONFIG.real;
    
    try {
      const response = await axios.get(`${config.baseUrl}/health`, {
        timeout: config.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const healthData = response.data;
      
      const status: ApiStatus = {
        isAvailable: healthData.status === 'ok',
        mode: 'real',
        lastChecked: Date.now(),
        services: healthData.services
      };

      if (healthData.status !== 'ok') {
        status.error = healthData.error || 'API服务异常';
      }

      this.lastStatus = status;
      this.saveStatus(status);
      
      return status;
    } catch (error: any) {
      const status: ApiStatus = {
        isAvailable: false,
        mode: 'demo',
        lastChecked: Date.now(),
        error: this.getErrorMessage(error)
      };

      this.lastStatus = status;
      this.saveStatus(status);
      
      return status;
    }
  }

  /**
   * 获取当前API模式
   */
  getCurrentMode(): 'demo' | 'real' {
    return this.currentMode;
  }

  /**
   * 设置API模式
   */
  async setMode(mode: 'demo' | 'real'): Promise<boolean> {
    if (mode === 'real') {
      // 检查真实API是否可用
      const status = await this.checkApiHealth();
      if (!status.isAvailable) {
        throw new Error(status.error || '真实API不可用');
      }
    }

    this.currentMode = mode;
    localStorage.setItem(STORAGE_KEYS.API_MODE, mode);
    
    return true;
  }

  /**
   * 切换到真实API模式
   */
  async switchToRealApi(): Promise<boolean> {
    try {
      return await this.setMode('real');
    } catch (error) {
      console.error('切换到真实API失败:', error);
      return false;
    }
  }

  /**
   * 是否为真实API模式
   */
  isRealApiMode(): boolean {
    return this.currentMode === 'real';
  }

  /**
   * 是否为演示模式
   */
  isDemoMode(): boolean {
    return this.currentMode === 'demo';
  }

  /**
   * 获取最后的健康检查状态
   */
  getLastStatus(): ApiStatus | null {
    return this.lastStatus;
  }

  /**
   * 获取API配置
   */
  getConfig(): ApiModeConfig {
    return API_MODE_CONFIG[this.currentMode];
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    // 立即执行一次健康检查
    this.checkApiHealth();

    // 设置定期健康检查
    const config = API_MODE_CONFIG.real;
    if (config.healthCheckInterval > 0) {
      this.healthCheckInterval = setInterval(() => {
        this.checkApiHealth();
      }, config.healthCheckInterval);
    }
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 从本地存储加载模式
   */
  private loadStoredMode(): void {
    const storedMode = localStorage.getItem(STORAGE_KEYS.API_MODE) as 'demo' | 'real';
    if (storedMode && ['demo', 'real'].includes(storedMode)) {
      this.currentMode = storedMode;
    }

    // 加载上次的状态
    const storedStatus = localStorage.getItem(STORAGE_KEYS.API_STATUS);
    if (storedStatus) {
      try {
        this.lastStatus = JSON.parse(storedStatus);
      } catch (error) {
        console.warn('解析存储的API状态失败:', error);
      }
    }
  }

  /**
   * 保存状态到本地存储
   */
  private saveStatus(status: ApiStatus): void {
    localStorage.setItem(STORAGE_KEYS.API_STATUS, JSON.stringify(status));
    localStorage.setItem(STORAGE_KEYS.LAST_HEALTH_CHECK, status.lastChecked.toString());
  }

  /**
   * 获取错误信息
   */
  private getErrorMessage(error: any): string {
    if (error.code === 'ECONNABORTED') {
      return '请求超时，API服务可能不可用';
    } else if (error.message === 'Network Error') {
      return '网络连接失败，无法访问API服务';
    } else if (error.response?.status === 404) {
      return 'API端点不存在';
    } else if (error.response?.status >= 500) {
      return 'API服务器内部错误';
    } else {
      return error.message || '未知错误';
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopHealthCheck();
  }
}

export default ApiModeService;