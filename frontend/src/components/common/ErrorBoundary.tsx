/**
 * React错误边界组件
 */

import React, { Component, ReactNode } from 'react';
import { Result, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { handleComponentError } from '../../utils/errorHandler';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新state以显示错误UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // 记录错误信息
    this.setState({ error, errorInfo });
    
    // 调用全局错误处理
    handleComponentError(error, errorInfo);
    
    // 调用自定义错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误UI
      return (
        <div style={{ padding: '50px 20px', minHeight: '60vh' }}>
          <Result
            status="error"
            title="页面渲染异常"
            subTitle="抱歉，页面出现了异常。您可以尝试刷新页面或返回首页。"
            icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            extra={[
              <div key="error-details" style={{ marginBottom: 24 }}>
                <details style={{ textAlign: 'left', maxWidth: 600, margin: '0 auto' }}>
                  <summary style={{ cursor: 'pointer', marginBottom: 8 }}>
                    查看错误详情
                  </summary>
                  <div style={{ 
                    background: '#f5f5f5', 
                    padding: 12, 
                    borderRadius: 4, 
                    fontSize: 12,
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    maxHeight: 200
                  }}>
                    <div><strong>错误信息:</strong></div>
                    <div style={{ color: '#ff4d4f', marginBottom: 8 }}>
                      {this.state.error?.message || '未知错误'}
                    </div>
                    <div><strong>错误堆栈:</strong></div>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {this.state.error?.stack || '无堆栈信息'}
                    </pre>
                  </div>
                </details>
              </div>,
              <div key="actions" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Button onClick={this.handleRetry}>
                  重试
                </Button>
                <Button onClick={this.handleReload}>
                  刷新页面
                </Button>
                <Button type="primary" onClick={this.handleGoHome}>
                  返回首页
                </Button>
              </div>
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;