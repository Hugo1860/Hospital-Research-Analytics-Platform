/**
 * ProtectedRoute 组件测试
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock TokenManager
jest.mock('../../../utils/tokenManager', () => ({
  __esModule: true,
  default: {
    getToken: jest.fn(),
    setToken: jest.fn(),
    removeToken: jest.fn(),
    isTokenValid: jest.fn(),
    isTokenExpiringSoon: jest.fn(),
    setRedirectPath: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

// Mock API
jest.mock('../../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

// Test child component
const TestChild: React.FC = () => <div data-testid="protected-content">Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const TokenManager = require('../../../utils/tokenManager').default;
    TokenManager.getToken.mockReturnValue(null);
    TokenManager.isTokenValid.mockReturnValue(false);
    TokenManager.isTokenExpiringSoon.mockReturnValue(false);
  });

  test('should show loading state initially', () => {
    render(
      <TestWrapper>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText('验证用户身份...')).toBeInTheDocument();
  });

  test('should redirect to login when not authenticated', async () => {
    render(
      <TestWrapper>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('验证用户身份...')).not.toBeInTheDocument();
    });

    // Should not show protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('should show protected content when authenticated', async () => {
    // Mock authenticated state
    const TokenManager = require('../../../utils/tokenManager').default;
    TokenManager.getToken.mockReturnValue('valid-token');
    TokenManager.isTokenValid.mockReturnValue(true);

    render(
      <TestWrapper>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  test('should show permission denied for insufficient roles', async () => {
    // Mock authenticated state with user role
    mockTokenManager.getToken.mockReturnValue('valid-token');
    mockTokenManager.isTokenValid.mockReturnValue(true);

    render(
      <TestWrapper>
        <ProtectedRoute requiredRoles={['admin']}>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('访问被拒绝')).toBeInTheDocument();
      expect(screen.getByText('您没有访问此页面的权限')).toBeInTheDocument();
    });
  });

  test('should show permission denied for insufficient permissions', async () => {
    // Mock authenticated state
    mockTokenManager.getToken.mockReturnValue('valid-token');
    mockTokenManager.isTokenValid.mockReturnValue(true);

    const requiredPermissions = [
      { resource: 'publications', action: 'delete' }
    ];

    render(
      <TestWrapper>
        <ProtectedRoute requiredPermissions={requiredPermissions}>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('操作权限不足')).toBeInTheDocument();
      expect(screen.getByText('您没有执行此操作的权限')).toBeInTheDocument();
    });
  });

  test('should use custom fallback component', () => {
    const CustomFallback = () => <div data-testid="custom-loading">Custom Loading...</div>;

    render(
      <TestWrapper>
        <ProtectedRoute fallback={<CustomFallback />}>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
  });

  test('should save redirect path when not authenticated', async () => {
    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/publications/import',
        search: '?test=1',
      },
      writable: true,
    });

    render(
      <TestWrapper>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockTokenManager.setRedirectPath).toHaveBeenCalledWith('/publications/import?test=1');
    });
  });

  test('should handle token expiring soon', async () => {
    mockTokenManager.getToken.mockReturnValue('expiring-token');
    mockTokenManager.isTokenValid.mockReturnValue(true);
    mockTokenManager.isTokenExpiringSoon.mockReturnValue(true);

    render(
      <TestWrapper>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should show validation message
    await waitFor(() => {
      expect(screen.getByText('正在验证访问权限...')).toBeInTheDocument();
    });
  });

  test('should show detailed permission information when enabled', async () => {
    mockTokenManager.getToken.mockReturnValue('valid-token');
    mockTokenManager.isTokenValid.mockReturnValue(true);

    render(
      <TestWrapper>
        <ProtectedRoute 
          requiredRoles={['admin']} 
          showPermissionDetails={true}
        >
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('当前角色：')).toBeInTheDocument();
      expect(screen.getByText('需要角色：')).toBeInTheDocument();
    });
  });

  test('should hide permission details when disabled', async () => {
    mockTokenManager.getToken.mockReturnValue('valid-token');
    mockTokenManager.isTokenValid.mockReturnValue(true);

    render(
      <TestWrapper>
        <ProtectedRoute 
          requiredRoles={['admin']} 
          showPermissionDetails={false}
        >
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('当前角色：')).not.toBeInTheDocument();
      expect(screen.queryByText('需要角色：')).not.toBeInTheDocument();
    });
  });

  test('should use custom redirect path', async () => {
    render(
      <TestWrapper>
        <ProtectedRoute redirectPath="/custom-login">
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should redirect to custom path (tested through navigation behavior)
    await waitFor(() => {
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });
});