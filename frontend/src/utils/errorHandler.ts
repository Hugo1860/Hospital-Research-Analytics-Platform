/**
 * 错误处理工具函数
 */

import React from 'react';
import { message, notification, Button } from 'antd';

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  BUSINESS = 'BUSINESS',
  UNKNOWN = 'UNKNOWN'
}

// 认证错误类型
export enum AuthErrorType {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_MISSING = 'TOKEN_MISSING',
  USER_INACTIVE = 'USER_INACTIVE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

// 认证错误消息映射
export const AUTH_ERROR_MESSAGES = {
  [AuthErrorType.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [AuthErrorType.TOKEN_INVALID]: '登录状态异常，请重新登录',
  [AuthErrorType.TOKEN_MISSING]: '请先登录后再访问',
  [AuthErrorType.USER_INACTIVE]: '账户已被禁用，请联系管理员',
  [AuthErrorType.PERMISSION_DENIED]: '权限不足，无法访问此功能',
  [AuthErrorType.NETWORK_ERROR]: '网络连接异常，请检查网络后重试',
  [AuthErrorType.SERVER_ERROR]: '服务器异常，请稍后重试'
} as const;

// 错误处理配置
export interface ErrorHandlerConfig {
  showMessage?: boolean;
  showNotification?: boolean;
  logError?: boolean;
  context?: string;
}

// 默认配置
const defaultConfig: ErrorHandlerConfig = {
  showMessage: true,
  showNotification: false,
  logError: true
};

/**
 * 通用错误处理函数
 */
export const handleError = (error: any, config: ErrorHandlerConfig | string = {}) => {
  // 如果第二个参数是字符串，则作为context处理
  const finalConfig = typeof config === 'string' 
    ? { ...defaultConfig, context: config }
    : { ...defaultConfig, ...config };
  
  if (finalConfig.logError) {
    console.error('Error:', error, finalConfig.context ? `Context: ${finalConfig.context}` : '');
  }
  
  const errorMessage = getErrorMessage(error);
  
  if (finalConfig.showNotification) {
    notification.error({
      message: '操作失败',
      description: errorMessage,
      duration: 4
    });
  } else if (finalConfig.showMessage) {
    message.error(errorMessage);
  }
};

/**
 * 获取错误消息
 */
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return '操作失败，请稍后重试';
};

/**
 * 网络错误处理
 */
export const handleNetworkError = (error: any) => {
  let errorMessage = '网络连接异常';
  
  if (error.code === 'ECONNABORTED') {
    errorMessage = '请求超时，请稍后重试';
  } else if (error.message === 'Network Error') {
    errorMessage = '网络连接失败，请检查网络设置';
  }
  
  message.error(errorMessage);
};

/**
 * 认证错误处理
 */
export const handleAuthError = (error: any, showNotification: boolean = false) => {
  console.error('Auth error:', error);
  const errorType = error.type || AuthErrorType.TOKEN_INVALID;
  const errorMessage = AUTH_ERROR_MESSAGES[errorType as keyof typeof AUTH_ERROR_MESSAGES] || '认证失败';
  
  if (showNotification) {
    notification.error({
      message: '认证失败',
      description: errorMessage,
      duration: 4
    });
  } else {
    message.error(errorMessage);
  }
};

/**
 * 组件错误处理
 */
export const handleComponentError = (error: Error, errorInfo: React.ErrorInfo) => {
  console.error('Component error:', error, errorInfo);
  handleError(error, { showNotification: true });
};

/**
 * 验证错误处理
 */
export const handleValidationError = (errors: string[]) => {
  if (errors.length === 1) {
    message.error(errors[0]);
  } else {
    notification.error({
      message: '数据验证失败',
      description: errors.join(', '),
      duration: 6
    });
  }
};

/**
 * 高阶函数：为异步函数添加错误处理
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: ErrorHandlerConfig | string = {}
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, config);
      throw error; // 重新抛出错误，让调用者可以处理
    }
  }) as T;
};

/**
 * 错误边界组件
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    handleComponentError(error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return React.createElement('div', 
        { style: { padding: '20px', textAlign: 'center' } },
        React.createElement('h3', null, '出现了一些问题'),
        React.createElement('p', null, '页面加载失败，请刷新页面重试'),
        React.createElement(Button, 
          { onClick: () => window.location.reload() }, 
          '刷新页面'
        )
      );
    }

    return this.props.children;
  }
}

/**
 * 高阶组件：为组件添加错误边界
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    return React.createElement(ErrorBoundary, null,
      React.createElement(Component, { ...props, ref } as any)
    );
  });
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default {
  handleError,
  handleNetworkError,
  handleAuthError,
  handleValidationError,
  handleComponentError,
  getErrorMessage,
  withErrorHandling,
  withErrorBoundary,
  ErrorType,
  AuthErrorType,
  AUTH_ERROR_MESSAGES
};