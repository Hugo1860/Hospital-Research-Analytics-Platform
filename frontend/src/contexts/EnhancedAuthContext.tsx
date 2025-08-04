/**
 * 增强的认证上下文
 * 集成性能优化、缓存管理和内存优化功能
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { message } from 'antd';
import { enhancedAuthAPI } from '../services/enhancedApi';
import tokenManager from '../utils/tokenManager';
import memoryOptimizer from '../utils/memoryOptimizer';
import { useLoading } from '../components/common/LoadingManager';
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
  token: tokenManager.getToken(),
  isLoading: false,
  isAuthenticated: false,
  tokenExpiry: tokenManager.getTokenExpiry(),
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
const EnhancedAuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export const EnhancedAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const loading = useLoading();

  // 使用useCallback优化函数引用
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'LOGIN_START' });
      loading.startLoading('auth-login', {
        message: '正在登录...',
        type: 'spin',
        priority: 10,
      });
      
      // 模拟登录模式 - 用于演示界面效果
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
        tokenManager.setToken(mockToken, expiry);
        tokenManager.setUser(mockUser);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: mockUser, token: mockToken, expiry },
        });

        message.success('登录成功（演示模式）');
        return true;
      }

      // 尝试真实API登录
      const response = await enhancedAuthAPI.login({ username, password });
      const { user, token } = response.data;
      
      // 默认24小时过期时间
      const expiry = Date.now() + 24 * 60 * 60 * 1000;

      // 使用TokenManager保存token和用户信息
      tokenManager.setToken(token, expiry);
      tokenManager.setUser(user);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token, expiry },
      });

      message.success('登录成功');
      return true;
    } catch (error: any) {
      dispatch({ type: 'LOGIN_FAILURE' });
      
      // 如果是模拟模式下的错误用户名密码
      if (username === 'admin' && password !== 'password123') {
        message.error('演示模式：请使用 admin / password123 登录');
      } else {
        const errorMessage = error.response?.data?.message || '后端服务未启动，请使用演示账户：admin / password123';
        message.error(errorMessage);
      }
      return false;
    } finally {
      loading.stopLoading('auth-login');
    }
  }, [loading]);

  // 登出函数
  const logout = useCallback(() => {
    tokenManager.removeToken();
    dispatch({ type: 'LOGOUT' });
    
    // 清理相关缓存
    setTimeout(() => {
      memoryOptimizer.performCleanup();
    }, 100);
    
    message.success('已退出登录');
  }, []);

  // 刷新token函数
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      loading.startLoading('auth-refresh', {
        message: '刷新登录状态...',
        type: 'silent',
        priority: 5,
      });

      const response = await enhancedAuthAPI.refreshToken();
      const { token } = response.data;
      
      if (token) {
        const expiry = Date.now() + 24 * 60 * 60 * 1000;
        tokenManager.setToken(token, expiry);
        
        dispatch({
          type: 'TOKEN_REFRESH',
          payload: { token, expiry },
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('刷新token失败:', error);
      return false;
    } finally {
      loading.stopLoading('auth-refresh');
    }
  }, [loading]);

  // 验证token函数（带缓存）
  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      if (!tokenManager.isTokenValid()) {
        return false;
      }

      const token = tokenManager.getToken();
      if (!token) {
        return false;
      }

      // 检查缓存的验证结果
      const cachedResult = tokenManager.getCachedTokenValidation(token);
      if (cachedResult !== null) {
        console.log('[EnhancedAuthContext] 使用缓存的token验证结果:', cachedResult);
        return cachedResult;
      }

      // 如果是模拟token，直接返回true
      if (token === 'mock-jwt-token-for-demo') {
        tokenManager.cacheTokenValidation(token, true);
        return true;
      }

      // 使用去重机制调用后端验证
      const response = await tokenManager.deduplicateRequest(
        `validate_token_${token.substring(0, 10)}`,
        () => enhancedAuthAPI.validateToken()
      );
      
      const user = response.data.user;
      
      dispatch({ type: 'UPDATE_USER', payload: user });
      dispatch({
        type: 'SET_TOKEN_INFO',
        payload: {
          expiry: tokenManager.getTokenExpiry(),
          lastValidated: Date.now(),
        },
      });
      
      // 缓存验证结果
      tokenManager.cacheTokenValidation(token, true);
      
      return true;
    } catch (error) {
      console.error('验证token失败:', error);
      
      // 缓存失败结果（较短的缓存时间）
      const token = tokenManager.getToken();
      if (token) {
        tokenManager.cacheTokenValidation(token, false, 30 * 1000); // 30秒缓存
      }
      
      return false;
    }
  }, []);

  // 检查token是否有效
  const isTokenValid = useCallback((): boolean => {
    return tokenManager.isTokenValid();
  }, []);

  // 更新用户信息
  const updateUser = useCallback((user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
    tokenManager.setUser(user);
  }, []);

  // 权限检查函数（带缓存）
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!state.user) return false;

    const { role } = state.user;
    const permissionKey = `${role}:${resource}:${action}`;
    
    // 简单的权限缓存（内存中）
    const cachedPermission = (window as any).__PERMISSION_CACHE__?.[permissionKey];
    if (cachedPermission !== undefined) {
      return cachedPermission;
    }

    let hasAccess = false;
    
    // 管理员拥有所有权限
    if (role === 'admin') {
      hasAccess = true;
    } else if (role === 'department_admin') {
      // 科室管理员权限
      const allowedPermissions = [
        'publications:read',
        'publications:create',
        'publications:update',
        'publications:delete',
        'journals:read',
        'statistics:read',
      ];
      hasAccess = allowedPermissions.includes(`${resource}:${action}`);
    } else if (role === 'user') {
      // 普通用户权限
      const allowedPermissions = [
        'publications:read',
        'journals:read',
        'statistics:read',
      ];
      hasAccess = allowedPermissions.includes(`${resource}:${action}`);
    }

    // 缓存权限结果
    if (!(window as any).__PERMISSION_CACHE__) {
      (window as any).__PERMISSION_CACHE__ = {};
    }
    (window as any).__PERMISSION_CACHE__[permissionKey] = hasAccess;

    return hasAccess;
  }, [state.user]);

  // 角色检查函数
  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!state.user) return false;
    
    const userRole = state.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return allowedRoles.includes(userRole);
  }, [state.user]);

  // 初始化时检查token有效性
  useEffect(() => {
    const initAuth = async () => {
      const token = tokenManager.getToken();
      if (token) {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          loading.startLoading('auth-init', {
            message: '初始化用户状态...',
            type: 'silent',
            priority: 1,
          });
          
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
                expiry: tokenManager.getTokenExpiry() || undefined 
              },
            });
            return;
          }
          
          // 尝试从缓存获取用户信息
          const cachedUser = tokenManager.getUser();
          if (cachedUser) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: { 
                user: cachedUser, 
                token,
                expiry: tokenManager.getTokenExpiry() || undefined 
              },
            });
            
            // 后台验证token有效性
            validateToken().catch(error => {
              console.warn('后台token验证失败:', error);
            });
            return;
          }
          
          // 调用API获取用户信息
          const response = await enhancedAuthAPI.getCurrentUser();
          const user = response.data.user;

          tokenManager.setUser(user);
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { 
              user, 
              token,
              expiry: tokenManager.getTokenExpiry() || undefined 
            },
          });
        } catch (error) {
          // Token无效，清除本地存储
          tokenManager.removeToken();
          dispatch({ type: 'LOGIN_FAILURE' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
          loading.stopLoading('auth-init');
        }
      }
    };

    initAuth();
  }, [loading, validateToken]);

  // 监听TokenManager事件，实现跨标签页状态同步
  useEffect(() => {
    const handleTokenEvent = (eventType: string, data?: any) => {
      console.log(`[EnhancedAuthContext] 收到TokenManager事件: ${eventType}`, data);
      
      switch (eventType) {
        case 'token_removed':
          // token被移除（登出或过期）
          if (data?.source === 'cross_tab') {
            console.log('[EnhancedAuthContext] 跨标签页登出同步');
            message.info('您已在其他标签页中登出', 2);
          }
          dispatch({ type: 'LOGOUT' });
          
          // 清理权限缓存
          if ((window as any).__PERMISSION_CACHE__) {
            delete (window as any).__PERMISSION_CACHE__;
          }
          break;
          
        case 'token_expired':
          // token过期
          dispatch({ type: 'LOGIN_FAILURE' });
          if (data?.source === 'cross_tab') {
            console.log('[EnhancedAuthContext] 跨标签页token过期同步');
            message.warning('登录已在其他标签页中过期，请重新登录', 3);
          } else {
            message.warning(AUTH_ERROR_MESSAGES[AuthErrorType.TOKEN_EXPIRED]);
          }
          
          // 清理权限缓存
          if ((window as any).__PERMISSION_CACHE__) {
            delete (window as any).__PERMISSION_CACHE__;
          }
          break;
          
        case 'token_updated':
          // token更新（登录或刷新）
          if (data?.source === 'cross_tab') {
            console.log('[EnhancedAuthContext] 跨标签页登录同步');
            handleCrossTabLogin(data);
          }
          break;
          
        case 'user_updated':
          // 用户信息更新
          if (data?.source === 'cross_tab' && data?.user) {
            console.log('[EnhancedAuthContext] 跨标签页用户信息同步');
            dispatch({ type: 'UPDATE_USER', payload: data.user });
            message.success('用户信息已同步更新', 2);
            
            // 清理权限缓存以重新计算
            if ((window as any).__PERMISSION_CACHE__) {
              delete (window as any).__PERMISSION_CACHE__;
            }
          }
          break;
          
        default:
          console.warn(`[EnhancedAuthContext] 未处理的TokenManager事件: ${eventType}`);
          break;
      }
    };

    // 处理跨标签页登录同步
    const handleCrossTabLogin = async (data: any) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        loading.startLoading('cross-tab-sync', {
          message: '同步登录状态...',
          type: 'silent',
          priority: 5,
        });
        
        // 验证新的token并获取用户信息
        const token = tokenManager.getToken();
        if (!token) {
          console.warn('[EnhancedAuthContext] 跨标签页同步时未找到token');
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
              expiry: tokenManager.getTokenExpiry() || undefined 
            },
          });
          
          message.success('已同步其他标签页的登录状态', 2);
          return;
        }

        // 尝试从缓存获取用户信息
        const cachedUser = tokenManager.getUser();
        if (cachedUser) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { 
              user: cachedUser, 
              token,
              expiry: tokenManager.getTokenExpiry() || undefined 
            },
          });
          
          message.success('已同步其他标签页的登录状态', 2);
          return;
        }

        // 尝试获取真实用户信息
        try {
          const response = await enhancedAuthAPI.getCurrentUser();
          const user = response.data.user;

          tokenManager.setUser(user);
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { 
              user, 
              token,
              expiry: tokenManager.getTokenExpiry() || undefined 
            },
          });
          
          message.success('已同步其他标签页的登录状态', 2);
        } catch (apiError) {
          console.warn('[EnhancedAuthContext] 跨标签页同步时API调用失败');
        }
      } catch (error) {
        console.error('[EnhancedAuthContext] 跨标签页登录同步失败:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        loading.stopLoading('cross-tab-sync');
      }
    };

    tokenManager.addEventListener(handleTokenEvent);

    return () => {
      tokenManager.removeEventListener(handleTokenEvent);
    };
  }, [loading]);

  // 内存优化：定期清理权限缓存
  useEffect(() => {
    const cleanupPermissionCache = () => {
      if ((window as any).__PERMISSION_CACHE__) {
        const cacheSize = Object.keys((window as any).__PERMISSION_CACHE__).length;
        if (cacheSize > 100) { // 如果缓存项超过100个，清理一半
          const entries = Object.entries((window as any).__PERMISSION_CACHE__);
          const keepCount = Math.floor(entries.length / 2);
          const newCache: any = {};
          
          entries.slice(-keepCount).forEach(([key, value]) => {
            newCache[key] = value;
          });
          
          (window as any).__PERMISSION_CACHE__ = newCache;
          console.log(`[EnhancedAuthContext] 清理了 ${cacheSize - keepCount} 个权限缓存项`);
        }
      }
    };

    // 添加到内存优化器的清理任务
    memoryOptimizer.addCleanupTask(cleanupPermissionCache);

    return () => {
      memoryOptimizer.removeCleanupTask(cleanupPermissionCache);
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
    <EnhancedAuthContext.Provider value={contextValue}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};

// 使用增强认证上下文的Hook
export const useEnhancedAuth = (): AuthContextType => {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

export default EnhancedAuthProvider;