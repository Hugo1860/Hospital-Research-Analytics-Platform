/**
 * 认证相关的类型定义
 */

// 认证错误类型枚举
export enum AuthErrorType {
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  USER_INACTIVE = 'USER_INACTIVE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

// 认证错误接口
export interface AuthError {
  code: 'AUTHENTICATION_ERROR' | 'AUTHORIZATION_ERROR' | 'TOKEN_EXPIRED';
  message: string;
  type?: AuthErrorType;
  details?: {
    required?: string[];
    current?: string;
    expiry?: number;
  };
}

// 用户友好的错误消息映射
export const AUTH_ERROR_MESSAGES = {
  [AuthErrorType.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [AuthErrorType.TOKEN_INVALID]: '登录状态异常，请重新登录',
  [AuthErrorType.TOKEN_MISSING]: '请先登录后再访问',
  [AuthErrorType.USER_INACTIVE]: '账户已被禁用，请联系管理员',
  [AuthErrorType.PERMISSION_DENIED]: '权限不足，无法访问此功能',
  [AuthErrorType.NETWORK_ERROR]: '网络连接异常，请检查网络后重试',
  [AuthErrorType.SERVER_ERROR]: '服务器异常，请稍后重试'
} as const;

// Token数据接口（从tokenManager中导出）
export interface TokenData {
  token: string;
  expiry: number;
  refreshToken?: string;
  lastValidated: number;
}

// 认证事件类型
export type AuthEventType = 'login' | 'logout' | 'token_refresh' | 'permission_change';

// 认证状态接口
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tokenExpiry: number | null;
  lastValidated: number | null;
}

// 用户接口
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'department_admin' | 'user';
  departmentId?: number;
  department?: {
    id: number;
    name: string;
    code: string;
  };
  isActive: boolean;
  lastLoginAt?: string;
}

// 认证上下文接口
export interface AuthContextType {
  state: AuthState;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  validateToken: () => Promise<boolean>;
  updateUser: (user: User) => void;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roles: string | string[]) => boolean;
  isTokenValid: () => boolean;
}