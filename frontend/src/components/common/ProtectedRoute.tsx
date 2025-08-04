import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { LockOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import TokenManager from '../../utils/tokenManager';
import { AuthErrorType, AUTH_ERROR_MESSAGES } from '../../types/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: Array<{ resource: string; action: string }>;
  fallback?: ReactNode; // 自定义加载组件
  redirectPath?: string; // 自定义重定向路径
  showPermissionDetails?: boolean; // 是否显示详细权限信息
}

const ProtectedRoute = ({
  children,
  requiredRoles,
  requiredPermissions,
  fallback,
  redirectPath = '/login',
  showPermissionDetails = true,
}: ProtectedRouteProps): React.ReactElement | null => {
  const { state, hasRole, hasPermission, validateToken } = useAuth();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Token验证逻辑
  useEffect(() => {
    const performTokenValidation = async () => {
      if (state.isAuthenticated && !isValidating) {
        // 检查token是否即将过期
        if (TokenManager.isTokenExpiringSoon()) {
          setIsValidating(true);
          try {
            const isValid = await validateToken();
            if (!isValid) {
              setValidationError(AUTH_ERROR_MESSAGES[AuthErrorType.TOKEN_EXPIRED]);
            }
          } catch (error) {
            setValidationError(AUTH_ERROR_MESSAGES[AuthErrorType.TOKEN_INVALID]);
          } finally {
            setIsValidating(false);
          }
        }
      }
    };

    // 只在认证状态改变时执行验证
    if (state.isAuthenticated && !isValidating) {
      performTokenValidation();
    }
  }, [state.isAuthenticated]); // 移除validateToken和isValidating依赖

  // 保存重定向路径
  useEffect(() => {
    if (!state.isAuthenticated && location.pathname !== redirectPath) {
      const fullPath = location.pathname + location.search;
      TokenManager.setRedirectPath(fullPath);
    }
  }, [state.isAuthenticated, location.pathname, location.search, redirectPath]);

  // 自定义加载组件或默认加载状态
  const LoadingComponent = fallback ? (
    <>{fallback}</>
  ) : (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <Spin size="large" tip="验证用户身份..." />
      {isValidating && (
        <div style={{ marginTop: 16, color: '#666' }}>
          正在验证访问权限...
        </div>
      )}
    </div>
  );

  // 如果正在加载或验证，显示加载状态
  if (state.isLoading || isValidating) {
    return LoadingComponent;
  }

  // 如果验证出错，显示错误信息
  if (validationError) {
    return (
      <Result
        status="error"
        title="身份验证失败"
        subTitle={validationError}
        extra={[
          <Button type="primary" key="login" onClick={() => window.location.href = redirectPath}>
            重新登录
          </Button>
        ]}
      />
    );
  }

  // 如果未认证，重定向到登录页
  if (!state.isAuthenticated) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // 检查角色权限
  if (requiredRoles && !hasRole(requiredRoles)) {
    const currentRole = state.user?.role || '未知';
    const requiredRolesList = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    return (
      <Result
        status="403"
        title="访问被拒绝"
        subTitle="您没有访问此页面的权限"
        icon={<LockOutlined />}
        extra={[
          <div key="details" style={{ marginBottom: 16 }}>
            {showPermissionDetails && (
              <div style={{ textAlign: 'left', background: '#f5f5f5', padding: 16, borderRadius: 6 }}>
                <p><strong>当前角色：</strong>{currentRole}</p>
                <p><strong>需要角色：</strong>{requiredRolesList.join(' 或 ')}</p>
                <p><strong>建议：</strong>请联系管理员获取相应权限</p>
              </div>
            )}
          </div>,
          <Button key="back" onClick={() => window.history.back()}>
            返回上一页
          </Button>,
          <Button key="home" type="primary" onClick={() => window.location.href = '/dashboard'}>
            返回首页
          </Button>
        ]}
      />
    );
  }

  // 检查操作权限
  if (requiredPermissions) {
    const missingPermissions = requiredPermissions.filter(
      ({ resource, action }) => !hasPermission(resource, action)
    );
    
    if (missingPermissions.length > 0) {
      return (
        <Result
          status="warning"
          title="操作权限不足"
          subTitle="您没有执行此操作的权限"
          icon={<ExclamationCircleOutlined />}
          extra={[
            <div key="details" style={{ marginBottom: 16 }}>
              {showPermissionDetails && (
                <div style={{ textAlign: 'left', background: '#fff7e6', padding: 16, borderRadius: 6, border: '1px solid #ffd591' }}>
                  <p><strong>当前用户：</strong>{state.user?.username || '未知'}</p>
                  <p><strong>当前角色：</strong>{state.user?.role || '未知'}</p>
                  <p><strong>缺少权限：</strong></p>
                  <ul style={{ marginLeft: 20 }}>
                    {missingPermissions.map(({ resource, action }, index) => (
                      <li key={index}>{resource}:{action}</li>
                    ))}
                  </ul>
                  <p><strong>建议：</strong>请联系管理员申请相应的操作权限</p>
                </div>
              )}
            </div>,
            <Button key="back" onClick={() => window.history.back()}>
              返回上一页
            </Button>,
            <Button key="home" type="primary" onClick={() => window.location.href = '/dashboard'}>
              返回首页
            </Button>
          ]}
        />
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;