/**
 * API拦截器测试
 */

import axios from 'axios';
import { message } from 'antd';
import apiClient from '../api';

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

describe('API Interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenManager.getToken.mockReturnValue(null);
    mockTokenManager.isTokenValid.mockReturnValue(false);
    mockLocation.href = '';
    mockLocation.pathname = '/test';
  });

  describe('Request Interceptor', () => {
    test('should add Authorization header when token is valid', async () => {
      mockTokenManager.getToken.mockReturnValue('valid-token');
      mockTokenManager.isTokenValid.mockReturnValue(true);

      // Mock axios request
      const mockAdapter = jest.fn().mockResolvedValue({ data: 'success' });
      apiClient.defaults.adapter = mockAdapter;

      await apiClient.get('/test');

      expect(mockAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );
    });

    test('should not add Authorization header when token is invalid', async () => {
      mockTokenManager.getToken.mockReturnValue(null);
      mockTokenManager.isTokenValid.mockReturnValue(false);

      const mockAdapter = jest.fn().mockResolvedValue({ data: 'success' });
      apiClient.defaults.adapter = mockAdapter;

      await apiClient.get('/test');

      expect(mockAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });

    test('should handle FormData requests correctly', async () => {
      mockTokenManager.getToken.mockReturnValue('valid-token');
      mockTokenManager.isTokenValid.mockReturnValue(true);

      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      const mockAdapter = jest.fn().mockResolvedValue({ data: 'success' });
      apiClient.defaults.adapter = mockAdapter;

      await apiClient.post('/upload', formData);

      expect(mockAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );

      // Should not have Content-Type for FormData
      const callArgs = mockAdapter.mock.calls[0][0];
      expect(callArgs.headers['Content-Type']).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    test('should handle 401 error with token refresh', async () => {
      mockTokenManager.refreshToken.mockResolvedValue('new-token');
      mockTokenManager.getToken.mockReturnValue('new-token');
      mockTokenManager.isTokenValid.mockReturnValue(true);

      let callCount = 0;
      const mockAdapter = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call returns 401
          return Promise.reject({
            response: {
              status: 401,
              data: { code: 'TOKEN_EXPIRED' },
            },
            config: { headers: {} },
          });
        } else {
          // Second call (retry) succeeds
          return Promise.resolve({ data: 'success' });
        }
      });

      apiClient.defaults.adapter = mockAdapter;

      const result = await apiClient.get('/test');

      expect(result.data).toBe('success');
      expect(mockTokenManager.refreshToken).toHaveBeenCalled();
      expect(mockAdapter).toHaveBeenCalledTimes(2);
    });

    test('should redirect to login when token refresh fails', async () => {
      mockTokenManager.refreshToken.mockResolvedValue(null);

      const mockAdapter = jest.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { code: 'TOKEN_EXPIRED' },
        },
        config: { headers: {} },
      });

      apiClient.defaults.adapter = mockAdapter;

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw
      }

      expect(mockTokenManager.removeToken).toHaveBeenCalled();
      expect(mockTokenManager.setRedirectPath).toHaveBeenCalledWith('/test');
      expect(mockLocation.href).toBe('/login');
      expect(message.error).toHaveBeenCalled();
    });

    test('should handle 403 permission error', async () => {
      const mockAdapter = jest.fn().mockRejectedValue({
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
      });

      apiClient.defaults.adapter = mockAdapter;

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw
      }

      expect(message.error).toHaveBeenCalledWith('权限不足：需要 admin, write 权限');
    });

    test('should handle network errors', async () => {
      const mockAdapter = jest.fn().mockRejectedValue({
        message: 'Network Error',
        config: {},
      });

      apiClient.defaults.adapter = mockAdapter;

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw
      }

      expect(message.error).toHaveBeenCalledWith('网络连接异常，请检查网络后重试');
    });

    test('should handle timeout errors', async () => {
      const mockAdapter = jest.fn().mockRejectedValue({
        code: 'ECONNABORTED',
        config: {},
      });

      apiClient.defaults.adapter = mockAdapter;

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw
      }

      expect(message.error).toHaveBeenCalledWith('请求超时，请稍后重试');
    });

    test('should handle server errors', async () => {
      const mockAdapter = jest.fn().mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
        config: {},
      });

      apiClient.defaults.adapter = mockAdapter;

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw
      }

      expect(message.error).toHaveBeenCalledWith('服务器异常，请稍后重试');
    });

    test('should handle validation errors', async () => {
      const mockAdapter = jest.fn().mockRejectedValue({
        response: {
          status: 422,
          data: {
            errors: ['Field is required', 'Invalid format'],
          },
        },
        config: {},
      });

      apiClient.defaults.adapter = mockAdapter;

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw
      }

      expect(message.error).toHaveBeenCalledTimes(2);
      expect(message.error).toHaveBeenCalledWith('Field is required');
      expect(message.error).toHaveBeenCalledWith('Invalid format');
    });

    test('should limit retry attempts', async () => {
      mockTokenManager.refreshToken.mockResolvedValue('new-token');

      let callCount = 0;
      const mockAdapter = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject({
          response: {
            status: 401,
            data: { code: 'TOKEN_EXPIRED' },
          },
          config: { headers: {}, _retryCount: callCount - 1 },
        });
      });

      apiClient.defaults.adapter = mockAdapter;

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to throw after max retries
      }

      // Should try original request + 1 retry = 2 calls max
      expect(mockAdapter).toHaveBeenCalledTimes(2);
      expect(mockTokenManager.removeToken).toHaveBeenCalled();
      expect(mockLocation.href).toBe('/login');
    });
  });
});