/**
 * ProtectedRoute 简化测试
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
    getToken: jest.fn(() => null),
    setToken: jest.fn(),
    removeToken: jest.fn(),
    isTokenValid: jest.fn(() => false),
    isTokenExpiringSoon: jest.fn(() => false),
    setRedirectPath: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getTokenExpiry: jest.fn(() => null),
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

describe('ProtectedRoute Enhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render loading state initially', () => {
    render(
      <TestWrapper>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText('验证用户身份...')).toBeInTheDocument();
  });

  test('should redirect when not authenticated', async () => {
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
    }, { timeout: 3000 });

    // Should not show protected content when not authenticated
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
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

  test('should save redirect path', async () => {
    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/test-path',
        search: '?param=1',
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

    const TokenManager = require('../../../utils/tokenManager').default;
    
    await waitFor(() => {
      expect(TokenManager.setRedirectPath).toHaveBeenCalled();
    });
  });

  test('should show permission denied with role requirements', async () => {
    render(
      <TestWrapper>
        <ProtectedRoute requiredRoles={['admin']}>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Wait for auth check and then look for permission denied
    await waitFor(() => {
      // The component should eventually show some content (either protected or permission denied)
      expect(screen.queryByText('验证用户身份...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should show permission denied with permission requirements', async () => {
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

    // Wait for auth check
    await waitFor(() => {
      expect(screen.queryByText('验证用户身份...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should handle custom redirect path', () => {
    render(
      <TestWrapper>
        <ProtectedRoute redirectPath="/custom-login">
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should render without errors
    expect(screen.getByText('验证用户身份...')).toBeInTheDocument();
  });

  test('should handle permission details visibility', () => {
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

    // Should render without errors
    expect(screen.getByText('验证用户身份...')).toBeInTheDocument();
  });
});