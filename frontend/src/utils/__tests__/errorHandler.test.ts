/**
 * 错误处理工具测试
 */

import { message, notification } from 'antd';
import { handleError, withErrorHandling, handleComponentError } from '../errorHandler';
import { AuthErrorType } from '../../types/auth';

// Mock antd components
jest.mock('antd', () => ({
  message: {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
  },
  notification: {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock TokenManager
const mockTokenManager = {
  removeToken: jest.fn(),
  setRedirectPath: jest.fn(),
};

jest.mock('../tokenManager', () => ({
  __esModule: true,
  default: mockTokenManager,
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

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = '';
    mockLocation.pathname = '/test';
  });

  describe('handleError', () => {
    test('should handle network errors', () => {
      const networkError = {
        message: 'Network Error',
      };

      handleError(networkError);

      expect(message.error).toHaveBeenCalledWith('网络连接异常，请检查网络后重试');
    });

    test('should handle timeout errors', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
      };

      handleError(timeoutError);

      expect(message.error).toHaveBeenCalledWith('请求超时，请稍后重试');
    });

    test('should handle authentication errors', () => {
      const authError = {
        response: {
          status: 401,
          data: {
            type: AuthErrorType.TOKEN_EXPIRED,
          },
        },
      };

      handleError(authError);

      expect(mockTokenManager.removeToken).toHaveBeenCalled();
      expect(message.warning).toHaveBeenCalledWith('登录已过期，请重新登录');
    });

    test('should handle permission errors', () => {
      const permissionError = {
        response: {
          status: 403,
          data: {
            type: AuthErrorType.PERMISSION_DENIED,
            details: {
              required: ['admin', 'write'],
            },
          },
        },
      };

      handleError(permissionError);

      expect(notification.warning).toHaveBeenCalledWith({
        message: '权限不足',
        description: '需要权限: admin, write',
        duration: 5,
      });
    });

    test('should handle server errors', () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            message: 'Internal Server Error',
          },
        },
      };

      handleError(serverError);

      expect(message.error).toHaveBeenCalledWith('服务器异常，请稍后重试');
    });

    test('should handle validation errors', () => {
      const validationError = {
        response: {
          status: 422,
          data: {
            errors: ['Field is required', 'Invalid format'],
          },
        },
      };

      handleError(validationError);

      expect(message.error).toHaveBeenCalledTimes(2);
      expect(message.error).toHaveBeenCalledWith('Field is required');
      expect(message.error).toHaveBeenCalledWith('Invalid format');
    });

    test('should handle business errors', () => {
      const businessError = {
        code: 'DUPLICATE_ENTRY',
        message: 'Data already exists',
      };

      handleError(businessError);

      expect(message.warning).toHaveBeenCalledWith('数据已存在，请检查后重试');
    });

    test('should handle unknown errors gracefully', () => {
      const unknownError = {
        message: 'Unknown error',
      };

      handleError(unknownError);

      expect(message.error).toHaveBeenCalledWith('Unknown error');
    });
  });

  describe('withErrorHandling', () => {
    test('should wrap async function with error handling', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFn = withErrorHandling(mockFn);

      try {
        await wrappedFn('arg1', 'arg2');
      } catch (error) {
        // Expected to throw
      }

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(message.error).toHaveBeenCalledWith('Test error');
    });

    test('should return result when no error occurs', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = withErrorHandling(mockFn);

      const result = await wrappedFn('arg1');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1');
      expect(message.error).not.toHaveBeenCalled();
    });
  });

  describe('handleComponentError', () => {
    test('should handle component errors', () => {
      const error = new Error('Component error');
      const errorInfo = { componentStack: 'Component stack trace' };

      handleComponentError(error, errorInfo);

      expect(notification.error).toHaveBeenCalledWith({
        message: '页面渲染异常',
        description: '页面出现异常，请刷新页面重试',
        duration: 0,
        btn: expect.any(Object),
      });
    });
  });

  describe('Error Handler Factory', () => {
    test('should select correct handler for different error types', () => {
      // Test network error selection
      const networkError = { message: 'Network Error' };
      handleError(networkError);
      expect(message.error).toHaveBeenCalledWith('网络连接异常，请检查网络后重试');

      jest.clearAllMocks();

      // Test auth error selection
      const authError = {
        response: { status: 401, data: { type: AuthErrorType.TOKEN_INVALID } }
      };
      handleError(authError);
      expect(mockTokenManager.removeToken).toHaveBeenCalled();

      jest.clearAllMocks();

      // Test server error selection
      const serverError = {
        response: { status: 500, data: {} }
      };
      handleError(serverError);
      expect(message.error).toHaveBeenCalledWith('服务器异常，请稍后重试');
    });
  });

  describe('Error Handler Resilience', () => {
    test('should handle errors in error handler gracefully', () => {
      // Mock message.error to throw an error
      const originalError = message.error;
      (message.error as jest.Mock).mockImplementation(() => {
        throw new Error('Message error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      handleError({ message: 'Test error' });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error handler failed:', expect.any(Error));

      // Restore original implementation
      (message.error as jest.Mock).mockImplementation(originalError);
      consoleErrorSpy.mockRestore();
    });
  });
});