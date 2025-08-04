/**
 * API拦截器认证逻辑测试
 */

import axios, { AxiosError } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { authAPI, publicationAPI } from '../api';
import TokenManager from '../../utils/tokenManager';
import { message } from 'antd';

// Mock dependencies
jest.mock('../../utils/tokenManager');
jest.mock('antd', () => ({
  message: {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
  },
}));

const mockTokenManager = TokenManager as jest.Mocked<typeof TokenManager>;
const mockMessage = message as jest.Mocked<typeof message>;

describe('API拦截器认证逻辑', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    // 创建新的axios实例用于测试
    mockAxios = new MockAdapter(axios);
    jest.clearAllMocks();
    
    // 默认mock返回值
    mockTokenManager.getToken.mockReturnValue('valid-token');
    mockTokenManager.isTokenValid.mockReturnValue(true);
    mockTokenManager.refreshToken.mockResolvedValue('new-token');
    mockTokenManager.removeToken.mockImplementation(() => {});
    mockTokenManager.setRedirectPath.mockImplementation(() => {});
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('请求拦截器', () => {
    test('应该自动添加Authorization头', async () => {
      mockAxios.onGet('/test').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer valid-token');
        return [200, { success: true }];
      });

      await axios.get('/test');
      expect(mockTokenManager.getToken).toHaveBeenCalled();
    });

    test('当token无效时不应该添加Authorization头', async () => {
      mockTokenManager.getToken.mockReturnValue(null);
      mockTokenManager.isTokenValid.mockReturnValue(false);

      mockAxios.onGet('/test').reply((config) => {
        expect(config.headers?.Authorization).toBeUndefined();
        return [200, { success: true }];
      });

      await axios.get('/test');
    });

    test('应该正确处理文件上传请求', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      mockAxios.onPost('/upload').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer valid-token');
        // 对于FormData，不应该设置Content-Type
        expect(config.headers?.['Content-Type']).toBeUndefined();
        return [200, { success: true }];
      });

      await axios.post('/upload', formData);
    });

    test('应该保留非FormData请求的Content-Type', async () => {
      const jsonData = { test: 'data' };

      mockAxios.onPost('/api/test').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer valid-token');
        expect(config.headers?.['Content-Type']).toBe('application/json');
        return [200, { success: true }];
      });

      await axios.post('/api/test', jsonData, {
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  describe('响应拦截器 - 401错误处理', () => {
    test('应该处理401错误并尝试刷新token', async () => {
      let requestCount = 0;
      
      mockAxios.onGet('/protected').reply(() => {
        requestCount++;
        if (requestCount === 1) {
          return [401, { 
            code: 'TOKEN_EXPIRED',
            message: 'Token expired' 
          }];
        }
        return [200, { success: true }];
      });

      // Mock token刷新成功
      mockTokenManager.refreshToken.mockResolvedValue('new-refreshed-token');

      const response = await axios.get('/protected');
      
      expect(response.status).toBe(200);
      expect(mockTokenManager.refreshToken).toHaveBeenCalled();
      expect(requestCount).toBe(2); // 原始请求 + 重试请求
    });

    test('当token刷新失败时应该重定向到登录页', async () => {
      mockAxios.onGet('/protected').reply(401, {
        code: 'TOKEN_EXPIRED',
        message: 'Token expired'
      });

      // Mock token刷新失败
      mockTokenManager.refreshToken.mockResolvedValue(null);

      // Mock window.location
      const mockLocation = {
        href: '',
        pathname: '/current-path'
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      try {
        await axios.get('/protected');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockTokenManager.removeToken).toHaveBeenCalled();
      expect(mockTokenManager.setRedirectPath).toHaveBeenCalledWith('/current-path');
      expect(mockMessage.error).toHaveBeenCalled();
    });

    test('应该限制重试次数', async () => {
      let requestCount = 0;
      
      mockAxios.onGet('/protected').reply(() => {
        requestCount++;
        return [401, { 
          code: 'TOKEN_EXPIRED',
          message: 'Token expired' 
        }];
      });

      // Mock token刷新总是成功，但服务器总是返回401
      mockTokenManager.refreshToken.mockResolvedValue('new-token');

      try {
        await axios.get('/protected');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      // 应该只重试一次（原始请求 + 1次重试）
      expect(requestCount).toBe(2);
      expect(mockTokenManager.refreshToken).toHaveBeenCalledTimes(1);
    });

    test('应该处理非TOKEN_EXPIRED的401错误', async () => {
      mockAxios.onGet('/protected').reply(401, {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid token'
      });

      try {
        await axios.get('/protected');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockTokenManager.removeToken).toHaveBeenCalled();
      expect(mockMessage.error).toHaveBeenCalled();
      expect(mockTokenManager.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('响应拦截器 - 403错误处理', () => {
    test('应该处理403权限不足错误', async () => {
      mockAxios.onGet('/admin-only').reply(403, {
        code: 'AUTHORIZATION_ERROR',
        message: '权限不足',
        details: {
          required: ['admin'],
          current: 'user'
        }
      });

      try {
        await axios.get('/admin-only');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('权限不足')
      );
    });
  });

  describe('响应拦截器 - 网络错误处理', () => {
    test('应该处理网络超时错误', async () => {
      mockAxios.onGet('/timeout').timeout();

      try {
        await axios.get('/timeout');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('请求超时')
      );
    });

    test('应该处理网络连接错误', async () => {
      mockAxios.onGet('/network-error').networkError();

      try {
        await axios.get('/network-error');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockMessage.error).toHaveBeenCalled();
    });
  });

  describe('响应拦截器 - 其他HTTP错误', () => {
    test('应该处理404错误', async () => {
      mockAxios.onGet('/not-found').reply(404, {
        message: '资源不存在'
      });

      try {
        await axios.get('/not-found');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockMessage.error).toHaveBeenCalledWith('请求的资源不存在');
    });

    test('应该处理422验证错误', async () => {
      mockAxios.onPost('/validate').reply(422, {
        errors: ['字段1不能为空', '字段2格式不正确']
      });

      try {
        await axios.post('/validate', {});
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockMessage.error).toHaveBeenCalledTimes(2);
      expect(mockMessage.error).toHaveBeenCalledWith('字段1不能为空');
      expect(mockMessage.error).toHaveBeenCalledWith('字段2格式不正确');
    });

    test('应该处理429限流错误', async () => {
      mockAxios.onGet('/rate-limited').reply(429, {
        message: '请求过于频繁'
      });

      try {
        await axios.get('/rate-limited');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockMessage.error).toHaveBeenCalledWith('请求过于频繁，请稍后重试');
    });

    test('应该处理500服务器错误', async () => {
      mockAxios.onGet('/server-error').reply(500, {
        message: '服务器内部错误'
      });

      try {
        await axios.get('/server-error');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockMessage.error).toHaveBeenCalled();
    });
  });

  describe('实际API调用测试', () => {
    test('authAPI.getCurrentUser应该正确处理认证', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };

      mockAxios.onGet('/auth/me').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer valid-token');
        return [200, { 
          success: true,
          data: { user: mockUser }
        }];
      });

      const response = await authAPI.getCurrentUser();
      
      expect(response.data.success).toBe(true);
      expect(response.data.data.user).toEqual(mockUser);
    });

    test('publicationAPI.importPublications应该正确处理文件上传认证', async () => {
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      mockAxios.onPost('/publications/import').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer valid-token');
        expect(config.data).toBeInstanceOf(FormData);
        return [200, { 
          success: true,
          data: { imported: 5, failed: 0 }
        }];
      });

      const response = await publicationAPI.importPublications(mockFile, 1);
      
      expect(response.data.success).toBe(true);
      expect(response.data.data.imported).toBe(5);
    });

    test('应该处理文件上传时的401错误', async () => {
      const mockFile = new File(['test'], 'test.xlsx');

      let requestCount = 0;
      mockAxios.onPost('/publications/import').reply(() => {
        requestCount++;
        if (requestCount === 1) {
          return [401, { code: 'TOKEN_EXPIRED' }];
        }
        return [200, { success: true }];
      });

      mockTokenManager.refreshToken.mockResolvedValue('new-token');

      const response = await publicationAPI.importPublications(mockFile, 1);
      
      expect(response.status).toBe(200);
      expect(requestCount).toBe(2);
    });
  });

  describe('边界情况测试', () => {
    test('应该处理空响应体的错误', async () => {
      mockAxios.onGet('/empty-error').reply(500);

      try {
        await axios.get('/empty-error');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockMessage.error).toHaveBeenCalled();
    });

    test('应该处理malformed JSON响应', async () => {
      mockAxios.onGet('/malformed').reply(400, 'not-json');

      try {
        await axios.get('/malformed');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockMessage.error).toHaveBeenCalled();
    });

    test('应该处理token刷新过程中的异常', async () => {
      mockAxios.onGet('/protected').reply(401, {
        code: 'TOKEN_EXPIRED'
      });

      // Mock token刷新抛出异常
      mockTokenManager.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      try {
        await axios.get('/protected');
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
      }

      expect(mockTokenManager.removeToken).toHaveBeenCalled();
      expect(mockMessage.error).toHaveBeenCalled();
    });
  });
});