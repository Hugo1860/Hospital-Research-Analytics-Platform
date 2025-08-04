import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from './AccessDenied';

interface RouteGuardProps {
  children: ReactNode;
  roles?: string[];
  permissions?: Array<{ resource: string; action: string }>;
  requireAll?: boolean;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

/**
 * 路由守卫组件 - 更灵活的路由权限控制
 */
const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  roles,
  permissions,
  requireAll = true,
  redirectTo,
  showAccessDenied = true,
}) => {
  const { state, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // 如果正在加载，显示加载状态
  if (state.isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 如果未认证，重定向到登录页
  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 检查角色权限
  const hasRequiredRoles = () => {
    if (!roles || roles.length === 0) return true;
    
    if (requireAll) {
      return roles.every(role => hasRole(role));
    } else {
      return roles.some(role => hasRole(role));
    }
  };

  // 检查操作权限
  const hasRequiredPermissions = () => {
    if (!permissions || permissions.length === 0) return true;
    
    if (requireAll) {
      return permissions.every(({ resource, action }) => 
        hasPermission(resource, action)
      );
    } else {
      return permissions.some(({ resource, action }) => 
        hasPermission(resource, action)
      );
    }
  };

  // 检查是否有权限
  const hasAccess = hasRequiredRoles() && hasRequiredPermissions();

  if (!hasAccess) {
    // 如果指定了重定向路径，则重定向
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
    // 如果设置显示访问拒绝页面，则显示
    if (showAccessDenied) {
      return <AccessDenied />;
    }
    
    // 否则返回null（不渲染任何内容）
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard;