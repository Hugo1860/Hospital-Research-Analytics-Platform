/**
 * AuthContext 跨标签页同步测试
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import TokenManager from '../../utils/tokenManager';
import { authAPI } from '../../services/api';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('../../utils/tokenManager');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>;
const mockTokenManager = TokenManager as jest.Mocked<typeof TokenManager>;

// Test component to access auth context
const TestComponent: React.FC = () => {
  const { state, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">
        {state.isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user-info">
        {state.user ? state.user.username : 'no-user'}
      </div>
      <div data-testid="loading-status">
        {state.isLoading ? 'loading' : 'not-loading'}
      </div>
      <button data-testid="login-btn" onClick={() => login('admin', 'password123')}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext 跨标签页同步', () => {
  let mockEventListener: (eventType: string, data?: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock TokenManager methods
    mockTokenManager.getToken.mockReturnValue(null);
    mockTokenManager.isTokenValid.mockReturnValue(false);
    mockTokenManager.getTokenExpiry.mockReturnValue(null);
    mockTokenManager.addEventListener.mockImplementation((listener) => {
      mockEventListener = listener;
    });
    mockTokenManager.removeEventListener.mockImplementation(() => {});
    mockTokenManager.setToken.mockImplementation(() => {});
    mockTokenManager.removeToken.mockImplementation(() => {});
    mockTokenManager.setUser.mockImplementation(() => {});
    mockTokenManager.getUser.mockReturnValue(null);
  });

  const renderAuthProvider = () => {
    return render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
  };

  describe('跨标签页登录同步', () => {
    test('应该响应其他标签页的登录事件', async () => {
      renderAuthProvider();

      // 初始状态应该是未认证
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');

      // 模拟其他标签页登录事件
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        departmentId: 1,
        department: { id: 1, name: '管理科', code: 'ADMIN' },
        isActive: true,
        lastLoginAt: new Date().toISOString()
      };

      // Mock TokenManager返回有效token
      mockTokenManager.getToken.mockReturnValue('mock-jwt-token-for-demo');
      mockTokenManager.getTokenExpiry.mockReturnValue(Date.now() + 3600000);

      // Mock API调用
      mockAuthAPI.getCurrentUser.mockResolvedValue({
        data: { data: { user: mockUser } }
      } as any);

      // 触发跨标签页token更新事件
      act(() => {
        mockEventListener('token_updated', {
          source: 'cross_tab',
          timestamp: Date.now(),
          token: 'mock-jwt-token-for-demo'
        });
      });

      // 等待状态更新
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      expect(screen.getByTestId('user-info')).toHaveTextContent('admin');
    });

    test('应该处理模拟token的跨标签页登录', async () => {
      renderAuthProvider();

      // Mock TokenManager返回模拟token
      mockTokenManager.getToken.mockReturnValue('mock-jwt-token-for-demo');
      mockTokenManager.getTokenExpiry.mockReturnValue(Date.now() + 3600000);

      // 触发跨标签页token更新事件
      act(() => {
        mockEventListener('token_updated', {
          source: 'cross_tab',
          timestamp: Date.now(),
          token: 'mock-jwt-token-for-demo'
        });
      });

      // 等待状态更新
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // 应该使用模拟用户信息
      expect(screen.getByTestId('user-info')).toHaveTextContent('admin');
    });

    test('应该处理API调用失败时的降级方案', async () => {
      renderAuthProvider();

      const mockUser = { id: 1, username: 'localuser' };

      // Mock TokenManager返回有效token
      mockTokenManager.getToken.mockReturnValue('valid-token');
      mockTokenManager.getTokenExpiry.mockReturnValue(Date.now() + 3600000);

      // Mock API调用失败
      mockAuthAPI.getCurrentUser.mockRejectedValue(new Error('API Error'));

      // Mock localStorage中有用户信息
      const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
      mockGetItem.mockImplementation((key) => {
        if (key === 'auth_user') {
          return JSON.stringify(mockUser);
        }
        return null;
      });

      // 触发跨标签页token更新事件
      act(() => {
        mockEventListener('token_updated', {
          source: 'cross_tab',
          timestamp: Date.now(),
          token: 'valid-token'
        });
      });

      // 等待状态更新
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      expect(screen.getByTestId('user-info')).toHaveTextContent('localuser');

      mockGetItem.mockRestore();
    });
  });

  describe('跨标签页登出同步', () => {
    test('应该响应其他标签页的登出事件', async () => {
      renderAuthProvider();

      // 先设置为已登录状态
      const mockUser = { id: 1, username: 'testuser', role: 'admin' };
      mockTokenManager.getToken.mockReturnValue('valid-token');
      mockTokenManager.isTokenValid.mockReturnValue(true);

      // 手动触发登录状态
      act(() => {
        mockEventListener('token_updated', {
          source: 'local',
          timestamp: Date.now(),
          tokenData: { token: 'valid-token', expiry: Date.now() + 3600000 }
        });
      });

      // 触发跨标签页登出事件
      act(() => {
        mockEventListener('token_removed', {
          source: 'cross_tab',
          timestamp: Date.now()
        });
      });

      // 等待状态更新
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });

      expect(screen.getByTestId('user-info')).toHaveTextContent('no-user');
    });
  });

  describe('跨标签页token过期同步', () => {
    test('应该响应其他标签页的token过期事件', async () => {
      renderAuthProvider();

      // 触发跨标签页token过期事件
      act(() => {
        mockEventListener('token_expired', {
          source: 'cross_tab',
          timestamp: Date.now(),
          expiry: Date.now() - 1000
        });
      });

      // 等待状态更新
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });
    });

    test('应该响应本标签页的token过期事件', async () => {
      renderAuthProvider();

      // 触发本标签页token过期事件
      act(() => {
        mockEventListener('token_expired', {
          source: 'local',
          timestamp: Date.now()
        });
      });

      // 等待状态更新
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });
    });
  });

  describe('跨标签页用户信息同步', () => {
    test('应该响应其他标签页的用户信息更新事件', async () => {
      renderAuthProvider();

      const updatedUser = {
        id: 1,
        username: 'updateduser',
        email: 'updated@example.com',
        role: 'department_admin'
      };

      // 触发跨标签页用户信息更新事件
      act(() => {
        mockEventListener('user_updated', {
          source: 'cross_tab',
          timestamp: Date.now(),
          user: updatedUser
        });
      });

      // 等待状态更新
      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('updateduser');
      });
    });

    test('应该忽略本标签页的用户信息更新事件', async () => {
      renderAuthProvider();

      const originalUser = { id: 1, username: 'original' };
      const updatedUser = { id: 1, username: 'updated' };

      // 设置初始用户
      act(() => {
        mockEventListener('user_updated', {
          source: 'cross_tab',
          timestamp: Date.now(),
          user: originalUser
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('original');
      });

      // 触发本标签页用户信息更新事件（应该被忽略）
      act(() => {
        mockEventListener('user_updated', {
          source: 'local',
          timestamp: Date.now(),
          user: updatedUser
        });
      });

      // 用户信息不应该改变
      expect(screen.getByTestId('user-info')).toHaveTextContent('original');
    });
  });

  describe('未知事件处理', () => {
    test('应该正确处理未知事件类型', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      renderAuthProvider();

      // 触发未知事件类型
      act(() => {
        mockEventListener('unknown_event', {
          source: 'cross_tab',
          timestamp: Date.now()
        });
      });

      // 应该记录警告日志
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('未处理的TokenManager事件: unknown_event')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('事件监听器清理', () => {
    test('组件卸载时应该清理事件监听器', () => {
      const { unmount } = renderAuthProvider();

      // 验证添加了事件监听器
      expect(mockTokenManager.addEventListener).toHaveBeenCalled();

      // 卸载组件
      unmount();

      // 验证移除了事件监听器
      expect(mockTokenManager.removeEventListener).toHaveBeenCalled();
    });
  });
});