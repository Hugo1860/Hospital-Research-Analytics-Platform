import axios from 'axios';
import ApiModeService, { ApiStatus } from '../apiModeService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ApiModeService', () => {
  let apiModeService: ApiModeService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Reset singleton instance
    (ApiModeService as any).instance = undefined;
    
    // Mock localStorage to return default values
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    if (apiModeService) {
      apiModeService.destroy();
    }
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ApiModeService.getInstance();
      const instance2 = ApiModeService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('API Health Check', () => {
    beforeEach(() => {
      apiModeService = ApiModeService.getInstance();
    });

    it('should return healthy status when API is available', async () => {
      const mockHealthResponse = {
        data: {
          status: 'ok',
          services: {
            database: 'connected',
            auth: 'active',
            filesystem: 'accessible',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(mockHealthResponse);

      const status = await apiModeService.checkApiHealth();

      expect(status.isAvailable).toBe(true);
      expect(status.mode).toBe('real');
      expect(status.services).toEqual(mockHealthResponse.data.services);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should return unhealthy status when API returns error status', async () => {
      const mockHealthResponse = {
        data: {
          status: 'error',
          error: 'Database connection failed',
          services: {
            database: 'disconnected',
            auth: 'active',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(mockHealthResponse);

      const status = await apiModeService.checkApiHealth();

      expect(status.isAvailable).toBe(false);
      expect(status.mode).toBe('real');
      expect(status.error).toBe('Database connection failed');
    });

    it('should return demo mode status when API is not reachable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      const status = await apiModeService.checkApiHealth();

      expect(status.isAvailable).toBe(false);
      expect(status.mode).toBe('demo');
      expect(status.error).toContain('网络连接失败');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);

      const status = await apiModeService.checkApiHealth();

      expect(status.isAvailable).toBe(false);
      expect(status.error).toContain('请求超时');
    });

    it('should handle 404 errors', async () => {
      const notFoundError = {
        response: { status: 404 },
        message: 'Not Found',
      };
      mockedAxios.get.mockRejectedValue(notFoundError);

      const status = await apiModeService.checkApiHealth();

      expect(status.isAvailable).toBe(false);
      expect(status.error).toBe('API端点不存在');
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      };
      mockedAxios.get.mockRejectedValue(serverError);

      const status = await apiModeService.checkApiHealth();

      expect(status.isAvailable).toBe(false);
      expect(status.error).toBe('API服务器内部错误');
    });
  });

  describe('Mode Management', () => {
    beforeEach(() => {
      apiModeService = ApiModeService.getInstance();
    });

    it('should start in real mode by default', () => {
      expect(apiModeService.getCurrentMode()).toBe('real');
      expect(apiModeService.isRealApiMode()).toBe(true);
      expect(apiModeService.isDemoMode()).toBe(false);
    });

    it('should load stored mode from localStorage', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'api_mode') return 'demo';
        return null;
      });

      const service = ApiModeService.getInstance();
      expect(service.getCurrentMode()).toBe('demo');
    });

    it('should set mode to demo without API check', async () => {
      const success = await apiModeService.setMode('demo');

      expect(success).toBe(true);
      expect(apiModeService.getCurrentMode()).toBe('demo');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('api_mode', 'demo');
    });

    it('should set mode to real with successful API check', async () => {
      const mockHealthResponse = {
        data: { status: 'ok', services: {} },
      };
      mockedAxios.get.mockResolvedValue(mockHealthResponse);

      const success = await apiModeService.setMode('real');

      expect(success).toBe(true);
      expect(apiModeService.getCurrentMode()).toBe('real');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('api_mode', 'real');
    });

    it('should fail to set mode to real when API is unavailable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      await expect(apiModeService.setMode('real')).rejects.toThrow();
      expect(apiModeService.getCurrentMode()).toBe('real'); // Should remain unchanged
    });

    it('should switch to real API successfully', async () => {
      const mockHealthResponse = {
        data: { status: 'ok', services: {} },
      };
      mockedAxios.get.mockResolvedValue(mockHealthResponse);

      const success = await apiModeService.switchToRealApi();

      expect(success).toBe(true);
      expect(apiModeService.getCurrentMode()).toBe('real');
    });

    it('should fail to switch to real API when unavailable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      const success = await apiModeService.switchToRealApi();

      expect(success).toBe(false);
    });
  });

  describe('Status Storage', () => {
    beforeEach(() => {
      apiModeService = ApiModeService.getInstance();
    });

    it('should save status to localStorage', async () => {
      const mockHealthResponse = {
        data: {
          status: 'ok',
          services: { database: 'connected' },
        },
      };
      mockedAxios.get.mockResolvedValue(mockHealthResponse);

      await apiModeService.checkApiHealth();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'api_status',
        expect.stringContaining('"isAvailable":true')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'last_health_check',
        expect.any(String)
      );
    });

    it('should load stored status from localStorage', () => {
      const mockStatus: ApiStatus = {
        isAvailable: true,
        mode: 'real',
        lastChecked: Date.now(),
        services: { database: 'connected' },
      };
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'api_status') return JSON.stringify(mockStatus);
        return null;
      });

      const service = ApiModeService.getInstance();
      const lastStatus = service.getLastStatus();

      expect(lastStatus).toEqual(mockStatus);
    });

    it('should handle invalid stored status gracefully', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'api_status') return 'invalid-json';
        return null;
      });

      // Should not throw error
      const service = ApiModeService.getInstance();
      const lastStatus = service.getLastStatus();

      expect(lastStatus).toBeNull();
    });
  });

  describe('Configuration', () => {
    beforeEach(() => {
      apiModeService = ApiModeService.getInstance();
    });

    it('should return correct config for real mode', () => {
      const config = apiModeService.getConfig();

      expect(config.mode).toBe('real');
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.fallbackToDemo).toBe(true);
    });

    it('should return correct config for demo mode', async () => {
      await apiModeService.setMode('demo');
      const config = apiModeService.getConfig();

      expect(config.mode).toBe('demo');
      expect(config.timeout).toBe(1000);
      expect(config.retryAttempts).toBe(0);
      expect(config.fallbackToDemo).toBe(false);
    });
  });

  describe('Health Check Interval', () => {
    it('should start health check interval', () => {
      const service = ApiModeService.getInstance();
      
      // Fast forward time to trigger interval
      jest.advanceTimersByTime(60000);
      
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should stop health check interval on destroy', () => {
      const service = ApiModeService.getInstance();
      service.destroy();
      
      // Clear previous calls
      mockedAxios.get.mockClear();
      
      // Fast forward time
      jest.advanceTimersByTime(60000);
      
      // Should not make additional calls after destroy
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});