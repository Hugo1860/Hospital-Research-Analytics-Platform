/**
 * 简化的AuthContext测试
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

// Test component
const TestComponent: React.FC = () => {
  const { state, login, logout, hasPermission, hasRole, isTokenValid } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-state">
        {state.isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user-role">
        {state.user?.role || 'no-role'}
      </div>
      <div data-testid="token-valid">
        {isTokenValid() ? 'valid' : 'invalid'}
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
      <div data-testid="has-permission">
        {hasPermission('publications', 'create') ? 'has-permission' : 'no-permission'}
      </div>
      <div data-testid="has-role">
        {hasRole('admin') ? 'has-role' : 'no-role'}
      </div>
    </div>
  );
};

describe('AuthContext Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const TokenManager = require('../../utils/tokenManager').default;
    TokenManager.getToken.mockReturnValue(null);
    TokenManager.getTokenExpiry.mockReturnValue(null);
    TokenManager.isTokenValid.mockReturnValue(false);
  });

  test('should provide initial state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state').textContent).toBe('not-authenticated');
    expect(screen.getByTestId('user-role').textContent).toBe('no-role');
    expect(screen.getByTestId('token-valid').textContent).toBe('invalid');
    expect(screen.getByTestId('has-permission').textContent).toBe('no-permission');
    expect(screen.getByTestId('has-role').textContent).toBe('no-role');
  });

  test('should handle demo login', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginBtn = screen.getByTestId('login-btn');
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    });

    expect(screen.getByTestId('user-role').textContent).toBe('admin');
    expect(screen.getByTestId('has-permission').textContent).toBe('has-permission');
    expect(screen.getByTestId('has-role').textContent).toBe('has-role');

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
    fireEvent.click(screen.getByTestId('login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    });

    // Then logout
    fireEvent.click(screen.getByTestId('logout-btn'));

    expect(screen.getByTestId('auth-state').textContent).toBe('not-authenticated');
    expect(screen.getByTestId('user-role').textContent).toBe('no-role');

    const TokenManager = require('../../utils/tokenManager').default;
    expect(TokenManager.removeToken).toHaveBeenCalled();
  });

  test('should integrate with TokenManager', () => {
    const TokenManager = require('../../utils/tokenManager').default;
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should call TokenManager methods during initialization
    expect(TokenManager.getToken).toHaveBeenCalled();
    expect(TokenManager.addEventListener).toHaveBeenCalled();
  });
});