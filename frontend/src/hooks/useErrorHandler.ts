import { useCallback } from 'react';
import { message, notification } from 'antd';
import { AuthErrorType, AUTH_ERROR_MESSAGES } from '../types/auth';

// Hook选项接口
interface UseErrorHandlerOptions {
  showMessage?: boolean;
  showNotification?: boolean;
  onError?: (error: any) => void;
}

interface ErrorHandlerResult {
  handleError: (error: any) => void;
  handleAuthError: (error: any) => void;
  handleNetworkError: (error: any) => void;
  handleValidationError: (errors: string[]) => void;
  showErrorMessage: (message: string) => void;
  showErrorNotification: (title: string, description?: string) => void;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}): ErrorHandlerResult => {
  const {
    showMessage = true,
    showNotification = false,
    onError
  } = options;

  const handleErrorCallback = useCallback((error: any) => {
    console.error('Error handled:', error);
    
    // 调用全局错误处理
    if (showMessage || showNotification) {
      // 这里可以添加具体的错误处理逻辑
    }
    
    if (onError) {
      onError(error);
    }
  }, [showMessage, showNotification, onError]);

  const handleAuthError = useCallback((error: any) => {
    console.error('Auth error:', error);
    const errorType = error.type || AuthErrorType.TOKEN_INVALID;
    const errorMessage = AUTH_ERROR_MESSAGES[errorType as keyof typeof AUTH_ERROR_MESSAGES] || '认证失败';
    
    if (showNotification) {
      notification.error({
        message: '认证错误',
        description: errorMessage,
        duration: 4,
      });
    } else if (showMessage) {
      message.error(errorMessage);
    }
    
    if (onError) {
      onError({ type: 'auth', error });
    }
  }, [showMessage, showNotification, onError]);

  const handleNetworkError = useCallback((error: any) => {
    console.error('Network error:', error);
    let errorMessage = '网络连接异常';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时，请稍后重试';
    } else if (error.message === 'Network Error') {
      errorMessage = '网络连接失败，请检查网络设置';
    }
    
    if (showNotification) {
      notification.error({
        message: '网络错误',
        description: errorMessage,
        duration: 4,
      });
    } else if (showMessage) {
      message.error(errorMessage);
    }
    
    if (onError) {
      onError({ type: 'network', error });
    }
  }, [showMessage, showNotification, onError]);

  const handleValidationError = useCallback((errors: string[]) => {
    console.error('Validation errors:', errors);
    if (showNotification) {
      notification.error({
        message: '数据验证失败',
        description: errors.join(', '),
        duration: 6,
      });
    } else if (showMessage) {
      errors.forEach(error => message.error(error));
    }

    if (onError) {
      onError({ type: 'validation', errors });
    }
  }, [showMessage, showNotification, onError]);

  const showErrorMessage = useCallback((msg: string) => {
    message.error(msg);
  }, []);

  const showErrorNotification = useCallback((title: string, description?: string) => {
    notification.error({
      message: title,
      description,
      duration: 4,
    });
  }, []);

  return {
    handleError: handleErrorCallback,
    handleAuthError,
    handleNetworkError,
    handleValidationError,
    showErrorMessage,
    showErrorNotification,
  };
};