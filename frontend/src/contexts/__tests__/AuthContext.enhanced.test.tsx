/**
 * 重构后的AuthContext 单元测试
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock TokenManager
jest.mock('../../utils/tokenManager', () => ({
  __esModule: true,
  default: {
    getToken: jest.fn(() => null),
    setToken: jest.fn(),
    removeToken: jest.fn(),
    getTokenExpiry: jest.fn(() => null),
    isTokenValid: jest.fn(() => false),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

// Mock API
jest.mock('../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

// Mock antd message
jest.mock('antd', () => ({
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

// Test component that uses auth context
const TestComponent: React.FC = () => {
  const { 
    state, 
    login, 
    logout, 
    refreshToken,
    validateToken,
    hasPermission, 
    hasRole, 
    isTokenValid 
  } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-state">
        {state.isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user-role">
        {state.user?.role || 'no-role'}
      </div>
      <div data-testid="loading">
        {state.isLoading ? 'loading' : 'not-loading'}
      </div>
      <div data-testid="token-valid">
        {isTokenValid() ? 'valid' : 'invalid'}
      </div>
      <div data-testid="token-expiry">
        {state.tokenExpiry || 'no-expiry'}
      </div>
      <button 
        data-testid="login-btn" 
        onClick={() => login('admin', 'password123')}
      >
        Login
      </button>
      <button 
        data-testid="logout-btn" 
        onClick={logout}
      >
        Logout
      </button>
      <button 
        data-testid="refresh-btn" 
        onClick={refreshToken}
      >
        Refresh Token
      </button>
      <button 
        data-testid="validate-btn" 
        onClick={validateToken}
      >
        Validate Token
      </button>
      <div data-testid="has-admin-permission">
        {hasPermission('publications', 'create') ? 'has-permission' : 'no-permission'}
      </div>
      <div data-testid="has-admin-role">
        {hasRole('admin') ? 'has-role' : 'no-role'}
      </div>
    </div>
  );
};

describe('Enhanced AuthContext', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    const TokenManager = require('../../utils/tokenManager').default;
    TokenManager.getToken.mockReturnValue(null);
    TokenManager.getTokenExpiry.mockReturnValue(null);
    TokenManager.isTokenValid.mockReturnValue(false);
  });

  test('should provide initial auth state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user-role')).toHaveTextContent('no-role');
    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('token-valid')).toHaveTextContent('invalid');
    expect(screen.getByTestId('token-expiry')).toHaveTextContent('no-expiry');
  });

  test('should handle successful demo login', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginBtn = screen.getByTestId('login-btn');
    await user.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
    expect(screen.getByTestId('has-admin-permission')).toHaveTextContent('has-permission');
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('has-role');
    const TokenManager = require('../../utils/tokenManager').default;
    expect(TokenManager.setToken).toHaveBeenCalledWith(
      'mock-jwt-token-for-demo',
      expect.any(Number)
    );
  });

  test('should handle logout', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    const loginBtn = screen.getByTestId('login-btn');
    await user.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
    });

    // Then logout
    const logoutBtn = screen.getByTestId('logout-btn');
    await user.click(logoutBtn);

    expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user-role')).toHaveTextContent('no-role');
    const TokenManager = require('../../utils/tokenManager').default;
    expect(TokenManager.removeToken).toHaveBeenCalled();
  });

  test('should check permissions correctly for different roles', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially no permissions
    expect(screen.getByTestId('has-admin-permission')).toHaveTextContent('no-permission');
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('no-role');

    // Login as admin
    const loginBtn = screen.getByTestId('login-btn');
    await user.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('has-admin-permission')).toHaveTextContent('has-permission');
      expect(screen.getByTestId('has-admin-role')).toHaveTextContent('has-role');
    });
  });

  test('should initialize with existing token', async () => {
    const { authAPI } = require('../../services/api');
    const TokenManager = require('../../utils/tokenManager').default;
    
    // Mock existing token
    TokenManager.getToken.mockReturnValue('mock-jwt-token-for-demo');
    TokenManager.getTokenExpiry.mockReturnValue(Date.now() + 3600000);
    TokenManager.isTokenValid.mockReturnValue(true);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
  });

  test('should handle token refresh', async () => {
    const TokenManager = require('../../utils/tokenManager').default;
    TokenManager.refreshToken.mockResolvedValue('new-token');
    TokenManager.getTokenExpiry.mockReturnValue(Date.now() + 3600000);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const refreshBtn = screen.getByTestId('refresh-btn');
    await user.click(refreshBtn);

    expect(TokenManager.refreshToken).toHaveBeenCalled();
  });

  test('should handle token validation', async () => {
    const { authAPI } = require('../../services/api');
    const TokenManager = require('../../utils/tokenManager').default;
    
    TokenManager.isTokenValid.mockReturnValue(true);
    TokenManager.getToken.mockReturnValue('valid-token');
    authAPI.getCurrentUser.mockResolvedValue({
      data: {
        data: {
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'admin',
            isActive: true,
          }
        }
      }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const validateBtn = screen.getByTestId('validate-btn');
    await user.click(validateBtn);

    expect(authAPI.getCurrentUser).toHaveBeenCalled();
  });

  test('should handle TokenManager events', async () => {
    const TokenManager = require('../../utils/tokenManager').default;
    let eventHandler: (eventType: string) => void;
    
    TokenManager.addEventListener.mockImplementation((handler) => {
      eventHandler = handler;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate token_removed event
    eventHandler!('token_removed');

    expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated');
  });

  test('should handle API login with real backend', async () => {
    const { authAPI } = require('../../services/api');
    
    authAPI.login.mockResolvedValue({
      data: {
        data: {
          user: {
            id: 1,
            username: 'realuser',
            email: 'real@example.com',
            role: 'department_admin',
            isActive: true,
          },
          token: 'real-jwt-token'
        }
      }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Mock non-demo credentials
    const TestComponentWithRealLogin: React.FC = () => {
      const { login } = useAuth();
      return (
        <button 
          data-testid="real-login-btn" 
          onClick={() => login('realuser', 'realpassword')}
        >
          Real Login
        </button>
      );
    };

    render(
      <AuthProvider>
        <TestComponentWithRealLogin />
        <TestComponent />
      </AuthProvider>
    );

    const realLoginBtn = screen.getByTestId('real-login-btn');
    await user.click(realLoginBtn);

    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith({
        username: 'realuser',
        password: 'realpassword'
      });
    });

    const TokenManager = require('../../utils/tokenManager').default;
    expect(TokenManager.setToken).toHaveBeenCalledWith(
      'real-jwt-token',
      expect.any(Number)
    );
  });

  test('should handle login failure', async () => {
    const { authAPI } = require('../../services/api');
    
    authAPI.login.mockRejectedValue(new Error('Invalid credentials'));

    const TestComponentWithFailingLogin: React.FC = () => {
      const { login } = useAuth();
      return (
        <button 
          data-testid="failing-login-btn" 
          onClick={() => login('wronguser', 'wrongpassword')}
        >
          Failing Login
        </button>
      );
    };

    render(
      <AuthProvider>
        <TestComponentWithFailingLogin />
        <TestComponent />
      </AuthProvider>
    );

    const failingLoginBtn = screen.getByTestId('failing-login-btn');
    await user.click(failingLoginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated');
    });
  });
});