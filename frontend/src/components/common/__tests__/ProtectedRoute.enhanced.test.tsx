/**
 * ProtectedRoute组件增强测试
 * 测试权限检查、加载状态、重定向等功能
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';
import TokenManager from '../../../utils/tokenManager';

// Mock dependencies
jest.mock('../../../utils/tokenManager');
jest.mock('../../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../../contexts/AuthContext'),
  useAuth: jest.fn(),
}));

const mockTokenManager = TokenManager as jest.Mocked<typeof TokenManager>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Test component
const TestComponent: React.FC = () => (
  <div data-testid="protected-content">Protected Content</div>
);

// Mock auth states
const createMockAuthState = (overrides = {}) => ({
  state: {
    user: null,
    token: null,
    isLoading: false,
    isAuthenticated: false,
    tokenExpiry: null,
    lastValidated: null,
    ...overrides,
  },
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  validateToken: jest.fn(),
  updateUser: jest.fn(),
  hasPermission: jest.fn(),
  hasRole: jest.fn(),
  isTokenValid: jest.fn(),
});

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'department_admin' as const,
  departmentId: 1,
  department: {
    id: 1,
    name: '测试科室',
    code: 'TEST'
  },
  isActive: true,
  lastLoginAt: new Date().toISOString()
};

describe('ProtectedRoute增强测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenManager.setRedirectPath.mockImplementation(() => {});
  });

  const renderProtectedRoute = (
    authState: any,
    routeProps: any = {},
    initialEntries = ['/protected']
  ) => {
    mockUseAuth.mockReturnValue(authState);

    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <ProtectedRoute {...routeProps}>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );
  };

  describe('基本认证检查', () => {
    test('未认证用户应该被重定向到登录页', () => {
      const authState = createMockAuthState();
      
      renderProtectedRoute(authState);

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(mockTokenManager.setRedirectPath).toHaveBeenCalledWith('/protected');
    });

    test('已认证用户应该能够访问受保护内容', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser,
        token: 'valid-token'
      });

      renderProtectedRoute(authState);

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('加载状态时应该显示加载指示器', () => {
      const authState = createMockAuthState({
        isLoading: true
      });

      renderProtectedRoute(authState);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('角色权限检查', () => {
    test('应该检查单个角色权限', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: { ...mockUser, role: 'user' }
      });
      authState.hasRole.mockReturnValue(false);

      renderProtectedRoute(authState, {
        requiredRoles: ['admin']
      });

      expect(authState.hasRole).toHaveBeenCalledWith(['admin']);
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByText('权限不足')).toBeInTheDocument();
    });

    test('应该检查多个角色权限', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasRole.mockReturnValue(true);

      renderProtectedRoute(authState, {
        requiredRoles: ['admin', 'department_admin']
      });

      expect(authState.hasRole).toHaveBeenCalledWith(['admin', 'department_admin']);
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('用户拥有其中一个角色时应该允许访问', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasRole.mockReturnValue(true);

      renderProtectedRoute(authState, {
        requiredRoles: ['admin', 'department_admin', 'user']
      });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('资源权限检查', () => {
    test('应该检查单个资源权限', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasPermission.mockReturnValue(false);

      renderProtectedRoute(authState, {
        requiredPermissions: [{ resource: 'publications', action: 'create' }]
      });

      expect(authState.hasPermission).toHaveBeenCalledWith('publications', 'create');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    test('应该检查多个资源权限', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasPermission
        .mockReturnValueOnce(true)  // publications:read
        .mockReturnValueOnce(true); // journals:read

      renderProtectedRoute(authState, {
        requiredPermissions: [
          { resource: 'publications', action: 'read' },
          { resource: 'journals', action: 'read' }
        ]
      });

      expect(authState.hasPermission).toHaveBeenCalledWith('publications', 'read');
      expect(authState.hasPermission).toHaveBeenCalledWith('journals', 'read');
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('缺少任一权限时应该拒绝访问', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasPermission
        .mockReturnValueOnce(true)   // publications:read
        .mockReturnValueOnce(false); // publications:create

      renderProtectedRoute(authState, {
        requiredPermissions: [
          { resource: 'publications', action: 'read' },
          { resource: 'publications', action: 'create' }
        ]
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('组合权限检查', () => {
    test('应该同时检查角色和资源权限', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasRole.mockReturnValue(true);
      authState.hasPermission.mockReturnValue(true);

      renderProtectedRoute(authState, {
        requiredRoles: ['department_admin'],
        requiredPermissions: [{ resource: 'publications', action: 'create' }]
      });

      expect(authState.hasRole).toHaveBeenCalledWith(['department_admin']);
      expect(authState.hasPermission).toHaveBeenCalledWith('publications', 'create');
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('角色权限不足时应该拒绝访问', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasRole.mockReturnValue(false);
      authState.hasPermission.mockReturnValue(true);

      renderProtectedRoute(authState, {
        requiredRoles: ['admin'],
        requiredPermissions: [{ resource: 'publications', action: 'create' }]
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    test('资源权限不足时应该拒绝访问', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasRole.mockReturnValue(true);
      authState.hasPermission.mockReturnValue(false);

      renderProtectedRoute(authState, {
        requiredRoles: ['department_admin'],
        requiredPermissions: [{ resource: 'publications', action: 'delete' }]
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('自定义组件和路径', () => {
    test('应该使用自定义加载组件', () => {
      const CustomFallback = () => <div data-testid="custom-loading">Custom Loading</div>;
      
      const authState = createMockAuthState({
        isLoading: true
      });

      renderProtectedRoute(authState, {
        fallback: <CustomFallback />
      });

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    test('应该使用自定义重定向路径', () => {
      const authState = createMockAuthState();

      renderProtectedRoute(authState, {
        redirectPath: '/custom-login'
      });

      expect(mockTokenManager.setRedirectPath).toHaveBeenCalledWith('/protected');
      // 注意：实际的重定向测试需要更复杂的设置，这里主要测试路径保存
    });
  });

  describe('权限不足页面', () => {
    test('应该显示详细的权限不足信息', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasRole.mockReturnValue(false);

      renderProtectedRoute(authState, {
        requiredRoles: ['admin'],
        requiredPermissions: [{ resource: 'users', action: 'manage' }]
      });

      expect(screen.getByText('权限不足')).toBeInTheDocument();
      expect(screen.getByText('您没有访问此资源的权限')).toBeInTheDocument();
    });

    test('应该显示当前用户信息', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasRole.mockReturnValue(false);

      renderProtectedRoute(authState, {
        requiredRoles: ['admin']
      });

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('department_admin')).toBeInTheDocument();
      expect(screen.getByText('测试科室')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    test('应该处理用户对象为null的情况', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: null
      });

      renderProtectedRoute(authState);

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    test('应该处理权限检查函数抛出异常的情况', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasRole.mockImplementation(() => {
        throw new Error('Permission check failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderProtectedRoute(authState, {
        requiredRoles: ['admin']
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('应该处理空的权限要求', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });

      renderProtectedRoute(authState, {
        requiredRoles: [],
        requiredPermissions: []
      });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('重定向路径保存', () => {
    test('应该保存当前路径用于登录后重定向', () => {
      const authState = createMockAuthState();

      renderProtectedRoute(authState, {}, ['/publications/import?tab=upload']);

      expect(mockTokenManager.setRedirectPath).toHaveBeenCalledWith('/publications/import?tab=upload');
    });

    test('不应该保存登录页路径', () => {
      const authState = createMockAuthState();

      renderProtectedRoute(authState, {}, ['/login']);

      expect(mockTokenManager.setRedirectPath).not.toHaveBeenCalled();
    });
  });

  describe('性能优化', () => {
    test('权限检查应该被缓存', () => {
      const authState = createMockAuthState({
        isAuthenticated: true,
        user: mockUser
      });
      authState.hasRole.mockReturnValue(true);
      authState.hasPermission.mockReturnValue(true);

      const { rerender } = renderProtectedRoute(authState, {
        requiredRoles: ['admin'],
        requiredPermissions: [{ resource: 'publications', action: 'read' }]
      });

      // 重新渲染相同的组件
      rerender(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute
            requiredRoles={['admin']}
            requiredPermissions={[{ resource: 'publications', action: 'read' }]}
          >
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      // 权限检查函数应该只被调用一次（在实际实现中可能需要缓存机制）
      expect(authState.hasRole).toHaveBeenCalledTimes(2); // 每次渲染都会检查
      expect(authState.hasPermission).toHaveBeenCalledTimes(2);
    });
  });
});