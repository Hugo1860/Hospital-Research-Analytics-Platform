/**
 * 通用错误页面组件
 */

import React from 'react';
import { Result, Button } from 'antd';
import { 
  ExclamationCircleOutlined, 
  LockOutlined, 
  DisconnectOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  ReloadOutlined
} from '@ant-design/icons';

export type ErrorType = 
  | 'network' 
  | 'permission' 
  | 'timeout' 
  | 'server' 
  | 'not-found' 
  | 'forbidden'
  | 'generic';

interface ErrorPageProps {
  type?: ErrorType;
  title?: string;
  subTitle?: string;
  description?: string;
  showRetry?: boolean;
  showHome?: boolean;
  showBack?: boolean;
  onRetry?: () => void;
  onHome?: () => void;
  onBack?: () => void;
  extra?: React.ReactNode;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  type = 'generic',
  title,
  subTitle,
  description,
  showRetry = true,
  showHome = true,
  showBack = true,
  onRetry,
  onHome,
  onBack,
  extra,
}) => {
  // 根据错误类型获取默认配置
  const getErrorConfig = (errorType: ErrorType) => {
    switch (errorType) {
      case 'network':
        return {
          status: 'error' as const,
          icon: <DisconnectOutlined style={{ color: '#ff4d4f' }} />,
          defaultTitle: '网络连接异常',
          defaultSubTitle: '无法连接到服务器，请检查网络连接',
        };
      case 'permission':
        return {
          status: '403' as const,
          icon: <LockOutlined style={{ color: '#faad14' }} />,
          defaultTitle: '权限不足',
          defaultSubTitle: '您没有访问此资源的权限',
        };
      case 'timeout':
        return {
          status: 'error' as const,
          icon: <ClockCircleOutlined style={{ color: '#ff4d4f' }} />,
          defaultTitle: '请求超时',
          defaultSubTitle: '服务器响应超时，请稍后重试',
        };
      case 'server':
        return {
          status: '500' as const,
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          defaultTitle: '服务器异常',
          defaultSubTitle: '服务器出现异常，请稍后重试',
        };
      case 'not-found':
        return {
          status: '404' as const,
          icon: undefined,
          defaultTitle: '页面不存在',
          defaultSubTitle: '抱歉，您访问的页面不存在',
        };
      case 'forbidden':
        return {
          status: '403' as const,
          icon: <LockOutlined style={{ color: '#ff4d4f' }} />,
          defaultTitle: '访问被拒绝',
          defaultSubTitle: '您没有权限访问此页面',
        };
      default:
        return {
          status: 'error' as const,
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          defaultTitle: '出现异常',
          defaultSubTitle: '系统出现异常，请稍后重试',
        };
    }
  };

  const config = getErrorConfig(type);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const renderActions = () => {
    const actions = [];

    if (showBack) {
      actions.push(
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回上一页
        </Button>
      );
    }

    if (showRetry) {
      actions.push(
        <Button key="retry" icon={<ReloadOutlined />} onClick={handleRetry}>
          重试
        </Button>
      );
    }

    if (showHome) {
      actions.push(
        <Button key="home" type="primary" icon={<HomeOutlined />} onClick={handleHome}>
          返回首页
        </Button>
      );
    }

    return actions;
  };

  return (
    <div style={{ padding: '50px 20px', minHeight: '60vh' }}>
      <Result
        status={config.status}
        title={title || config.defaultTitle}
        subTitle={subTitle || config.defaultSubTitle}
        icon={config.icon}
        extra={[
          description && (
            <div key="description" style={{ marginBottom: 24 }}>
              <div style={{ 
                textAlign: 'left', 
                background: '#f5f5f5', 
                padding: 16, 
                borderRadius: 6,
                maxWidth: 500,
                margin: '0 auto'
              }}>
                {description}
              </div>
            </div>
          ),
          extra && (
            <div key="extra" style={{ marginBottom: 16 }}>
              {extra}
            </div>
          ),
          <div key="actions" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {renderActions()}
          </div>
        ].filter(Boolean)}
      />
    </div>
  );
};

export default ErrorPage;