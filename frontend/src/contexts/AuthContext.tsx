import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { authAPI } from '../services/api';
import TokenManager from '../utils/tokenManager';
import { User, AuthState, AuthContextType, AuthErrorType, AUTH_ERROR_MESSAGES } from '../types/auth';

// 导出User类型供其他组件使用
export type { User };

// 认证动作类型
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string; expiry?: number } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'TOKEN_REFRESH'; payload: { token: string; expiry?: number } }
  | { type: 'SET_TOKEN_INFO'; payload: { expiry: number | null; lastValidated: number | null } };

// 初始状态
const initialState: AuthState = {
  user: null,
  token: TokenManager.getToken(),
  isLoading: false,
  isAuthenticated: false,
  tokenExpiry: TokenManager.getTokenExpiry(),
  lastValidated: null,
};

// 认证状态reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        tokenExpiry: action.payload.expiry || null,
        lastValidated: Date.now(),
        isLoading: false,
        isAuthenticated: true,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        tokenExpiry: null,
        lastValidated: null,
        isLoading: false,
        isAuthenticated: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        tokenExpiry: null,
        lastValidated: null,
        isAuthenticated: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'TOKEN_REFRESH':
      return {
        ...state,
        token: action.payload.token,
        tokenExpiry: action.payload.expiry || null,
        lastValidated: Date.now(),
      };
    case 'SET_TOKEN_INFO':
      return {
        ...state,
        tokenExpiry: action.payload.expiry,
        lastValidated: action.payload.lastValidated,
      };
    default:
      return state;
  }
};

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 登录函数
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      // 优先尝试真实API登录
      try {
        const response = await authAPI.login({ username, password });
        const { user, token } = response.data.data || response.data;
        
        // 默认24小时过期时间
        const expiry = Date.now() + 24 * 60 * 60 * 1000;

        // 使用TokenManager保存token
        TokenManager.setToken(token, expiry);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token, expiry },
        });

        message.success('登录成功');
        return true;
      } catch (apiError: any) {
        console.log('🔄 真实API登录失败，尝试模拟登录模式:', apiError.message);
        
        // 如果真实API失败，尝试模拟登录模式
        if (username === 'admin' && password === 'password123') {
          const mockUser: User = {
            id: 1,
            username: 'admin',
            email: 'admin@hospital.com',
            role: 'admin',
            departmentId: 1,
            department: {
              id: 1,
              name: '系统管理科',
              code: 'ADMIN'
            },
            isActive: true,
            lastLoginAt: new Date().toISOString()
          };

          const mockToken = 'mock-jwt-token-for-demo';
          const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24小时过期
          
          // 使用TokenManager保存token
          TokenManager.setToken(mockToken, expiry);
          
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: mockUser, token: mockToken, expiry },
          });

          message.success('登录成功（演示模式）');
          return true;
        } else {
          // 既不是真实API成功，也不是有效的模拟登录
          dispatch({ type: 'LOGIN_FAILURE' });
          const errorMessage = apiError.response?.data?.error || '登录失败，请检查用户名和密码';
          message.error(errorMessage);
          return false;
        }
      }
    } catch (error: any) {
      dispatch({ type: 'LOGIN_FAILURE' });
      console.error('登录过程异常:', error);
      message.error('登录过程出现异常，请稍后重试');
      return false;
    }
  };

  // 登出函数
  const logout = () => {
    TokenManager.removeToken();
    dispatch({ type: 'LOGOUT' });
    message.success('已退出登录');
  };

  // 刷新token函数
  const refreshToken = async (): Promise<boolean> => {
    try {
      const newToken = await TokenManager.refreshToken();
      if (newToken) {
        dispatch({
          type: 'TOKEN_REFRESH',
          payload: { token: newToken, expiry: TokenManager.getTokenExpiry() || undefined },
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('刷新token失败:', error);
      return false;
    }
  };

  // 验证token函数
  const validateToken = async (): Promise<boolean> => {
    try {
      if (!TokenManager.isTokenValid()) {
        return false;
      }

      // 如果是模拟token，直接返回true
      const token = TokenManager.getToken();
      if (token === 'mock-jwt-token-for-demo') {
        return true;
      }

      // 调用后端验证token
      const response = await authAPI.getCurrentUser();
      const user = response.data.data.user;
      
      dispatch({ type: 'UPDATE_USER', payload: user });
      dispatch({
        type: 'SET_TOKEN_INFO',
        payload: {
          expiry: TokenManager.getTokenExpiry(),
          lastValidated: Date.now(),
        },
      });
      
      return true;
    } catch (error) {
      console.error('验证token失败:', error);
      return false;
    }
  };

  // 检查token是否有效
  const isTokenValid = (): boolean => {
    return TokenManager.isTokenValid();
  };

  // 更新用户信息
  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  // 权限检查函数
  const hasPermission = (resource: string, action: string): boolean => {
    if (!state.user) return false;

    const { role } = state.user;
    
    // 管理员拥有所有权限
    if (role === 'admin') return true;

    // 科室管理员权限
    if (role === 'department_admin') {
      const allowedPermissions = [
        'publications:read',
        'publications:create',
        'publications:update',
        'publications:delete',
        'journals:read',
        'statistics:read',
      ];
      return allowedPermissions.includes(`${resource}:${action}`);
    }

    // 普通用户权限
    if (role === 'user') {
      const allowedPermissions = [
        'publications:read',
        'journals:read',
        'statistics:read',
      ];
      return allowedPermissions.includes(`${resource}:${action}`);
    }

    return false;
  };

  // 角色检查函数
  const hasRole = (roles: string | string[]): boolean => {
    if (!state.user) return false;
    
    const userRole = state.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return allowedRoles.includes(userRole);
  };

  // 初始化时检查token有效性
  useEffect(() => {
    const initAuth = async () => {
      const token = TokenManager.getToken();
      if (token) {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          
          // 如果是模拟token，直接使用模拟用户
          if (token === 'mock-jwt-token-for-demo') {
            const mockUser: User = {
              id: 1,
              username: 'admin',
              email: 'admin@hospital.com',
              role: 'admin',
              departmentId: 1,
              department: {
                id: 1,
                name: '系统管理科',
                code: 'ADMIN'
              },
              isActive: true,
              lastLoginAt: new Date().toISOString()
            };

            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: { 
                user: mockUser, 
                token,
                expiry: TokenManager.getTokenExpiry() || undefined 
              },
            });
            return;
          }
          
          const response = await authAPI.getCurrentUser();
          const user = response.data.data.user;

          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { 
              user, 
              token,
              expiry: TokenManager.getTokenExpiry() || undefined 
            },
          });
        } catch (error) {
          // Token无效，清除本地存储
          TokenManager.removeToken();
          dispatch({ type: 'LOGIN_FAILURE' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    initAuth();
  }, []);

  // 监听TokenManager事件，实现跨标签页状态同步
  useEffect(() => {
    const handleTokenEvent = (eventType: string, data?: any) => {
      console.log(`[AuthContext] 收到TokenManager事件: ${eventType}`, data);
      
      switch (eventType) {
        case 'token_removed':
          // token被移除（登出或过期）
          if (data?.source === 'cross_tab') {
            console.log('[AuthContext] 跨标签页登出同步');
            message.info('您已在其他标签页中登出', 2);
          }
          dispatch({ type: 'LOGOUT' });
          break;
          
        case 'token_expired':
          // token过期
          dispatch({ type: 'LOGIN_FAILURE' });
          if (data?.source === 'cross_tab') {
            console.log('[AuthContext] 跨标签页token过期同步');
            message.warning('登录已在其他标签页中过期，请重新登录', 3);
          } else {
            message.warning(AUTH_ERROR_MESSAGES[AuthErrorType.TOKEN_EXPIRED]);
          }
          break;
          
        case 'token_updated':
          // token更新（登录或刷新）
          if (data?.source === 'cross_tab') {
            console.log('[AuthContext] 跨标签页登录同步');
            handleCrossTabLogin(data);
          }
          break;
          
        case 'user_updated':
          // 用户信息更新
          if (data?.source === 'cross_tab' && data?.user) {
            console.log('[AuthContext] 跨标签页用户信息同步');
            dispatch({ type: 'UPDATE_USER', payload: data.user });
            message.success('用户信息已同步更新', 2);
          }
          break;
          
        default:
          console.warn(`[AuthContext] 未处理的TokenManager事件: ${eventType}`);
          break;
      }
    };

    // 处理跨标签页登录同步
    const handleCrossTabLogin = async (data: any) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // 验证新的token并获取用户信息
        const token = TokenManager.getToken();
        if (!token) {
          console.warn('[AuthContext] 跨标签页同步时未找到token');
          return;
        }

        // 如果是模拟token，使用模拟用户信息
        if (token === 'mock-jwt-token-for-demo') {
          const mockUser: User = {
            id: 1,
            username: 'admin',
            email: 'admin@hospital.com',
            role: 'admin',
            departmentId: 1,
            department: {
              id: 1,
              name: '系统管理科',
              code: 'ADMIN'
            },
            isActive: true,
            lastLoginAt: new Date().toISOString()
          };

          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { 
              user: mockUser, 
              token,
              expiry: TokenManager.getTokenExpiry() || undefined 
            },
          });
          
          message.success('已同步其他标签页的登录状态', 2);
          return;
        }

        // 尝试获取真实用户信息
        try {
          const response = await authAPI.getCurrentUser();
          const user = response.data.data.user;

          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { 
              user, 
              token,
              expiry: TokenManager.getTokenExpiry() || undefined 
            },
          });
          
          message.success('已同步其他标签页的登录状态', 2);
        } catch (apiError) {
          console.warn('[AuthContext] 跨标签页同步时API调用失败，使用本地存储的用户信息');
          
          // API调用失败时，尝试从localStorage获取用户信息
          try {
            const userStr = localStorage.getItem('auth_user');
            if (userStr) {
              const user = JSON.parse(userStr);
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { 
                  user, 
                  token,
                  expiry: TokenManager.getTokenExpiry() || undefined 
                },
              });
              message.success('已同步其他标签页的登录状态', 2);
            }
          } catch (parseError) {
            console.error('[AuthContext] 解析本地用户信息失败:', parseError);
          }
        }
      } catch (error) {
        console.error('[AuthContext] 跨标签页登录同步失败:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    TokenManager.addEventListener(handleTokenEvent);

    return () => {
      TokenManager.removeEventListener(handleTokenEvent);
    };
  }, []);

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    refreshToken,
    validateToken,
    updateUser,
    hasPermission,
    hasRole,
    isTokenValid,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证上下文的Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};