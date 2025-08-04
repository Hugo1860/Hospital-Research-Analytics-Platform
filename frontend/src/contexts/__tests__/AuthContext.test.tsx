import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the API
jest.mock('../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const {
    state,
    login,
    logout,
    register,
    updateUser,
    hasPermission,
    hasRole,
  } = useAuth();

  return (
    <div>
      <div data-testid="loading">{state.loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{state.isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{state.user ? state.user.username : 'no-user'}</div>
      <div data-testid="error">{state.error || 'no-error'}</div>
      
      <button onClick={() => login('testuser', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password',
        role: 'user',
      })}>Register</button>
      <button onClick={() => updateUser({ username: 'updated' })}>Update User</button>
      
      <div data-testid="has-permission">
        {hasPermission('publications', 'read') ? 'has-permission' : 'no-permission'}
      </div>
      <div data-testid="has-role">
        {hasRole('admin') ? 'has-role' : 'no-role'}
      </div>
    </div>
  );
};

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin',
  departmentId: 1,
  departmentName: '心内科',
  isActive: true,
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('should provide initial state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  test('should initialize with token from localStorage', async () => {
    const { authAPI } = require('../../services/api');
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    authAPI.getCurrentUser.mockResolvedValue({ data: { user: mockUser } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should start loading
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(authAPI.getCurrentUser).toHaveBeenCalled();
  });

  test('should handle login successfully', async () => {
    const { authAPI } = require('../../services/api');
    authAPI.login.mockResolvedValue({
      data: {
        token: 'new-token',
        user: mockUser,
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');

    await act(async () => {
      loginButton.click();
    });

    expect(authAPI.login).toHaveBeenCalledWith('testuser', 'password');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
  });

  test('should handle login failure', async () => {
    const { authAPI } = require('../../services/api');
    authAPI.login.mockRejectedValue(new Error('Invalid credentials'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');

    await act(async () => {
      loginButton.click();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
  });

  test('should handle logout', async () => {
    const { authAPI } = require('../../services/api');
    authAPI.login.mockResolvedValue({
      data: {
        token: 'new-token',
        user: mockUser,
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // First login
    const loginButton = screen.getByText('Login');
    await act(async () => {
      loginButton.click();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');

    // Then logout
    const logoutButton = screen.getByText('Logout');
    await act(async () => {
      logoutButton.click();
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  test('should handle registration successfully', async () => {
    const { authAPI } = require('../../services/api');
    authAPI.register.mockResolvedValue({
      data: {
        token: 'new-token',
        user: {
          id: 2,
          username: 'newuser',
          email: 'new@example.com',
          role: 'user',
        },
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const registerButton = screen.getByText('Register');

    await act(async () => {
      registerButton.click();
    });

    expect(authAPI.register).toHaveBeenCalledWith({
      username: 'newuser',
      email: 'new@example.com',
      password: 'password',
      role: 'user',
    });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('newuser');
  });

  test('should handle registration failure', async () => {
    const { authAPI } = require('../../services/api');
    authAPI.register.mockRejectedValue(new Error('Username already exists'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const registerButton = screen.getByText('Register');

    await act(async () => {
      registerButton.click();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('error')).toHaveTextContent('Username already exists');
  });

  test('should update user information', async () => {
    const { authAPI } = require('../../services/api');
    authAPI.login.mockResolvedValue({
      data: {
        token: 'new-token',
        user: mockUser,
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // First login
    const loginButton = screen.getByText('Login');
    await act(async () => {
      loginButton.click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('testuser');

    // Update user
    const updateButton = screen.getByText('Update User');
    await act(async () => {
      updateButton.click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('updated');
  });

  test('should check permissions correctly', async () => {
    const { authAPI } = require('../../services/api');
    authAPI.login.mockResolvedValue({
      data: {
        token: 'new-token',
        user: mockUser, // admin user
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login as admin
    const loginButton = screen.getByText('Login');
    await act(async () => {
      loginButton.click();
    });

    // Admin should have all permissions
    expect(screen.getByTestId('has-permission')).toHaveTextContent('has-permission');
    expect(screen.getByTestId('has-role')).toHaveTextContent('has-role');
  });

  test('should check permissions for non-admin user', async () => {
    const { authAPI } = require('../../services/api');
    authAPI.login.mockResolvedValue({
      data: {
        token: 'new-token',
        user: {
          ...mockUser,
          role: 'user', // regular user
        },
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login as regular user
    const loginButton = screen.getByText('Login');
    await act(async () => {
      loginButton.click();
    });

    // Regular user should have read permission but not admin role
    expect(screen.getByTestId('has-permission')).toHaveTextContent('has-permission');
    expect(screen.getByTestId('has-role')).toHaveTextContent('no-role');
  });

  test('should handle token refresh', async () => {
    const { authAPI } = require('../../services/api');
    mockLocalStorage.getItem.mockReturnValue('expired-token');
    authAPI.getCurrentUser.mockRejectedValue(new Error('Token expired'));
    authAPI.refreshToken.mockResolvedValue({
      data: {
        token: 'new-token',
        user: mockUser,
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(authAPI.refreshToken).toHaveBeenCalled();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
  });

  test('should handle failed token refresh', async () => {
    const { authAPI } = require('../../services/api');
    mockLocalStorage.getItem.mockReturnValue('expired-token');
    authAPI.getCurrentUser.mockRejectedValue(new Error('Token expired'));
    authAPI.refreshToken.mockRejectedValue(new Error('Refresh failed'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
  });

  test('should handle permission check without user', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Without user, should not have permissions
    expect(screen.getByTestId('has-permission')).toHaveTextContent('no-permission');
    expect(screen.getByTestId('has-role')).toHaveTextContent('no-role');
  });

  test('should clear error on successful operation', async () => {
    const { authAPI } = require('../../services/api');
    
    // First, cause an error
    authAPI.login.mockRejectedValueOnce(new Error('Login failed'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');

    // First login attempt fails
    await act(async () => {
      loginButton.click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Login failed');

    // Second login attempt succeeds
    authAPI.login.mockResolvedValueOnce({
      data: {
        token: 'new-token',
        user: mockUser,
      },
    });

    await act(async () => {
      loginButton.click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
  });
});