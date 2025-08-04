/**
 * API拦截器集成测试
 */

import { message } from 'antd';

// Mock TokenManager
const mockTokenManager = {
  getToken: jest.fn(),
  setToken: jest.fn(),
  removeToken: jest.fn(),
  isTokenValid: jest.fn(),
  refreshToken: jest.fn(),
  setRedirectPath: jest.fn(),
};

jest.mock('../../utils/tokenManager', () => ({
  __esModule: true,
  default: mockTokenManager,
}));

// Mock antd message
jest.mock('antd', () => ({
  message: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/test',
  search: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenManager.getToken.mockReturnValue(null);
    mockTokenManager.isTokenValid.mockReturnValue(false);
    mockLocation.href = '';
    mockLocation.pathname = '/test';
  });

  test('should integrate TokenManager with request interceptor', () => {
    // Import after mocks are set up
    const apiClient = require('../api').default;
    
    mockTokenManager.getToken.mockReturnValue('test-token');
    mockTokenManager.isTokenValid.mockReturnValue(true);

    // Test that the interceptor is properly configured
    expect(apiClient.interceptors.request.handlers).toHaveLength(1);
    expect(apiClient.interceptors.response.handlers).toHaveLength(1);
  });

  test('should handle token validation in request interceptor', () => {
    const apiClient = require('../api').default;
    
    // Test with valid token
    mockTokenManager.getToken.mockReturnValue('valid-token');
    mockTokenManager.isTokenValid.mockReturnValue(true);
    
    const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled;
    const config = { headers: {} };
    
    const result = requestInterceptor(config);
    
    expect(mockTokenManager.getToken).toHaveBeenCalled();
    expect(result.headers.Authorization).toBe('Bearer valid-token');
  });

  test('should handle FormData requests correctly', () => {
    const apiClient = require('../api').default;
    
    mockTokenManager.getToken.mockReturnValue('valid-token');
    mockTokenManager.isTokenValid.mockReturnValue(true);
    
    const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled;
    const formData = new FormData();
    const config = { 
      headers: { 'Content-Type': 'application/json' },
      data: formData 
    };
    
    const result = requestInterceptor(config);
    
    expect(result.headers.Authorization).toBe('Bearer valid-token');
    expect(result.headers['Content-Type']).toBeUndefined();
  });

  test('should handle network errors in response interceptor', async () => {
    const apiClient = require('../api').default;
    
    const responseInterceptor = apiClient.interceptors.response.handlers[0].rejected;
    const networkError = {
      message: 'Network Error',
      config: {},
    };
    
    try {
      await responseInterceptor(networkError);
    } catch (error) {
      // Expected to throw
    }
    
    expect(message.error).toHaveBeenCalledWith('网络连接异常，请检查网络后重试');
  });

  test('should handle timeout errors', async () => {
    const apiClient = require('../api').default;
    
    const responseInterceptor = apiClient.interceptors.response.handlers[0].rejected;
    const timeoutError = {
      code: 'ECONNABORTED',
      config: {},
    };
    
    try {
      await responseInterceptor(timeoutError);
    } catch (error) {
      // Expected to throw
    }
    
    expect(message.error).toHaveBeenCalledWith('请求超时，请稍后重试');
  });

  test('should handle 401 errors and redirect to login', async () => {
    const apiClient = require('../api').default;
    
    mockTokenManager.refreshToken.mockResolvedValue(null);
    
    const responseInterceptor = apiClient.interceptors.response.handlers[0].rejected;
    const authError = {
      response: {
        status: 401,
        data: { code: 'TOKEN_EXPIRED' },
      },
      config: { headers: {} },
    };
    
    try {
      await responseInterceptor(authError);
    } catch (error) {
      // Expected to throw
    }
    
    expect(mockTokenManager.removeToken).toHaveBeenCalled();
    expect(mockTokenManager.setRedirectPath).toHaveBeenCalledWith('/test');
    expect(mockLocation.href).toBe('/login');
  });

  test('should handle server errors', async () => {
    const apiClient = require('../api').default;
    
    const responseInterceptor = apiClient.interceptors.response.handlers[0].rejected;
    const serverError = {
      response: {
        status: 500,
        data: { message: 'Internal Server Error' },
      },
      config: {},
    };
    
    try {
      await responseInterceptor(serverError);
    } catch (error) {
      // Expected to throw
    }
    
    expect(message.error).toHaveBeenCalledWith('服务器异常，请稍后重试');
  });

  test('should handle permission errors with details', async () => {
    const apiClient = require('../api').default;
    
    const responseInterceptor = apiClient.interceptors.response.handlers[0].rejected;
    const permissionError = {
      response: {
        status: 403,
        data: {
          details: {
            required: ['admin', 'write'],
            current: 'user',
          },
        },
      },
      config: {},
    };
    
    try {
      await responseInterceptor(permissionError);
    } catch (error) {
      // Expected to throw
    }
    
    expect(message.error).toHaveBeenCalledWith('权限不足：需要 admin, write 权限');
  });
});