/**
 * 认证错误页面
 * 用于显示各种认证相关的错误信息
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Result, Button, Card, Typography, Space } from 'antd';
import { 
  LockOutlined, 
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  HomeOutlined,
  LoginOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { AuthErrorType, AUTH_ERROR_MESSAGES } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import TokenManager from '../utils/tokenManager';

const { Text, Paragraph, Title } = Typography;

interface AuthErrorPageProps {
  errorType?: AuthErrorType;
  title?: string;
  description?: string;
  details?: any;
}

const AuthErrorPage: React.FC<AuthErrorPageProps> = ({
  errorType,
  title,
  description,
  details,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, logout } = useAuth();

  // 从URL参数或location state中获取错误信息
  const urlParams = new URLSearchParams(location.search);
  const finalErrorType = errorType || 
    (urlParams.get('type') as AuthErrorType) || 
    (location.state?.errorType as AuthErrorType) ||
    AuthErrorType.TOKEN_INVALID;

  const finalTitle = title || 
    urlParams.get('title') || 
    location.state?.title;

  const finalDescription = description || 
    urlParams.get('description') || 
    location.state?.description;

  const finalDetails = details || location.state?.details;

  // 根据错误类型获取配置
  const getErrorConfig = (type: AuthErrorType) => {
    switch (type) {
      case AuthErrorType.TOKEN_EXPIRED:
        return {
          status: 'warning' as const,
          icon: <ClockCircleOutlined style={{ color: '#faad14' }} />,
          defaultTitle: '登录已过期',
          defaultDescription: '您的登录状态已过期，请重新登录以继续使用系统',
          showRelogin: true,
          showRetry: false,
        };
      
      case AuthErrorType.TOKEN_INVALID:
        return {
          status: 'error' as const,
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          defaultTitle: '登录状态异常',
          defaultDescription: '您的登录状态异常，请重新登录',
          showRelogin: true,
          showRetry: false,
        };
      
      case AuthErrorType.TOKEN_MISSING:
        return {
          status: 'info' as const,
          icon: <UserOutlined style={{ color: '#1890ff' }} />,
          defaultTitle: '需要登录',
          defaultDescription: '请先登录后再访问此页面',
          showRelogin: true,
          showRetry: false,
        };
      
      case AuthErrorType.USER_INACTIVE:
        return {
          status: 'error' as const,
          icon: <LockOutlined style={{ color: '#ff4d4f' }} />,
          defaultTitle: '账户已被禁用',
          defaultDescription: '您的账户已被禁用，请联系系统管理员',
          showRelogin: false,
          showRetry: false,
        };
      
      case AuthErrorType.PERMISSION_DENIED:
        return {
          status: '403' as const,
          icon: <LockOutlined style={{ color: '#faad14' }} />,
          defaultTitle: '权限不足',
          defaultDescription: '您没有访问此资源的权限',
          showRelogin: false,
          showRetry: true,
        };
      
      default:
        return {
          status: 'error' as const,
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          defaultTitle: '认证失败',
          defaultDescription: '认证过程中出现异常，请重试',
          showRelogin: true,
          showRetry: true,
        };
    }
  };

  const config = getErrorConfig(finalErrorType);

  const handleRelogin = () => {
    // 清除当前认证状态
    logout();
    TokenManager.removeToken();
    
    // 保存当前路径用于登录后重定向
    const redirectPath = location.pathname + location.search;
    if (redirectPath !== '/login' && redirectPath !== '/auth-error') {
      TokenManager.setRedirectPath(redirectPath);
    }
    
    // 跳转到登录页
    navigate('/login');
  };

  const handleRetry = () => {
    // 重新加载页面或返回上一页
    const redirectPath = TokenManager.getRedirectPath();
    if (redirectPath && redirectPath !== location.pathname) {
      navigate(redirectPath);
    } else {
      window.history.back();
    }
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const renderUserInfo = () => {
    if (!state.user || finalErrorType === AuthErrorType.TOKEN_MISSING) {
      return null;
    }

    return (
      <Card 
        size="small" 
        title="当前用户信息"
        style={{ 
          textAlign: 'left', 
          maxWidth: 500, 
          margin: '24px auto',
          background: '#fafafa'
        }}
      >
        <Paragraph style={{ marginBottom: 8 }}>
          <Text strong>用户名：</Text>
          <Text code>{state.user.username}</Text>
        </Paragraph>
        <Paragraph style={{ marginBottom: 8 }}>
          <Text strong>角色：</Text>
          <Text code>{state.user.role}</Text>
        </Paragraph>
        {state.user.department && (
          <Paragraph style={{ marginBottom: 8 }}>
            <Text strong>科室：</Text>
            <Text code>{state.user.department.name}</Text>
          </Paragraph>
        )}
        <Paragraph style={{ marginBottom: 0 }}>
          <Text strong>账户状态：</Text>
          <Text code type={state.user.isActive ? 'success' : 'danger'}>
            {state.user.isActive ? '正常' : '已禁用'}
          </Text>
        </Paragraph>
      </Card>
    );
  };

  const renderErrorDetails = () => {
    if (!finalDetails) return null;

    return (
      <Card 
        size="small" 
        title="错误详情"
        style={{ 
          textAlign: 'left', 
          maxWidth: 500, 
          margin: '16px auto',
          background: '#fff2e8'
        }}
      >
        {finalDetails.expiry && (
          <Paragraph style={{ marginBottom: 8 }}>
            <Text strong>过期时间：</Text>
            <Text code>{new Date(finalDetails.expiry * 1000).toLocaleString()}</Text>
          </Paragraph>
        )}
        
        {finalDetails.requiredRoles && (
          <div style={{ marginBottom: 8 }}>
            <Text strong>需要角色：</Text>
            <div style={{ marginTop: 4 }}>
              {finalDetails.requiredRoles.map((role: string, index: number) => (
                <Text key={index} code style={{ marginRight: 8 }}>
                  {role}
                </Text>
              ))}
            </div>
          </div>
        )}
        
        {finalDetails.requiredPermissions && (
          <div style={{ marginBottom: 8 }}>
            <Text strong>需要权限：</Text>
            <ul style={{ marginLeft: 16, marginTop: 4 }}>
              {finalDetails.requiredPermissions.map((permission: any, index: number) => (
                <li key={index}>
                  <Text code>
                    {typeof permission === 'string' 
                      ? permission 
                      : `${permission.resource}:${permission.action}`
                    }
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {finalDetails.reason && (
          <Paragraph style={{ marginBottom: 8 }}>
            <Text strong>失败原因：</Text>
            <Text>{finalDetails.reason}</Text>
          </Paragraph>
        )}
        
        {finalDetails.contact && (
          <Paragraph style={{ marginBottom: 0 }}>
            <Text strong>联系方式：</Text>
            <Text>{finalDetails.contact}</Text>
          </Paragraph>
        )}
      </Card>
    );
  };

  const renderSuggestions = () => {
    const suggestions = [];
    
    switch (finalErrorType) {
      case AuthErrorType.TOKEN_EXPIRED:
        suggestions.push('重新登录以获取新的访问权限');
        suggestions.push('检查系统时间是否正确');
        break;
      
      case AuthErrorType.TOKEN_INVALID:
        suggestions.push('清除浏览器缓存后重新登录');
        suggestions.push('检查是否在其他设备上登录了相同账户');
        break;
      
      case AuthErrorType.USER_INACTIVE:
        suggestions.push('联系系统管理员激活账户');
        suggestions.push('确认账户是否被临时禁用');
        break;
      
      case AuthErrorType.PERMISSION_DENIED:
        suggestions.push('联系管理员申请相应权限');
        suggestions.push('确认当前角色是否正确');
        suggestions.push('检查是否需要切换到其他账户');
        break;
      
      default:
        suggestions.push('尝试重新登录');
        suggestions.push('清除浏览器缓存');
        suggestions.push('联系技术支持');
        break;
    }

    if (suggestions.length === 0) return null;

    return (
      <Card 
        size="small" 
        title="解决建议"
        style={{ 
          textAlign: 'left', 
          maxWidth: 500, 
          margin: '16px auto',
          background: '#f6ffed'
        }}
      >
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {suggestions.map((suggestion, index) => (
            <li key={index} style={{ marginBottom: 4 }}>
              <Text>{suggestion}</Text>
            </li>
          ))}
        </ul>
      </Card>
    );
  };

  const renderActions = () => {
    const actions = [];

    if (config.showRelogin) {
      actions.push(
        <Button 
          key="relogin" 
          type="primary" 
          icon={<LoginOutlined />} 
          onClick={handleRelogin}
        >
          重新登录
        </Button>
      );
    }

    if (config.showRetry) {
      actions.push(
        <Button 
          key="retry" 
          icon={<ReloadOutlined />} 
          onClick={handleRetry}
        >
          重试
        </Button>
      );
    }

    actions.push(
      <Button 
        key="home" 
        icon={<HomeOutlined />} 
        onClick={handleGoHome}
      >
        返回首页
      </Button>
    );

    return actions;
  };

  return (
    <div style={{ padding: '50px 20px', minHeight: '80vh' }}>
      <Result
        status={config.status}
        title={finalTitle || config.defaultTitle}
        subTitle={finalDescription || config.defaultDescription || AUTH_ERROR_MESSAGES[finalErrorType]}
        icon={config.icon}
        extra={[
          <div key="content" style={{ maxWidth: 600, margin: '0 auto' }}>
            {renderUserInfo()}
            {renderErrorDetails()}
            {renderSuggestions()}
          </div>,
          <Space key="actions" size="middle" style={{ marginTop: 24 }}>
            {renderActions()}
          </Space>
        ]}
      />
    </div>
  );
};

export default AuthErrorPage;