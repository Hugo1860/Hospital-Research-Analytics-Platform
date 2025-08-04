import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionWrapperProps {
  children: ReactNode;
  roles?: string[];
  permissions?: Array<{ resource: string; action: string }>;
  fallback?: ReactNode;
  requireAll?: boolean; // 是否需要满足所有权限条件
}

/**
 * 权限包装组件 - 根据用户权限控制子组件的显示
 */
const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children,
  roles,
  permissions,
  fallback = null,
  requireAll = true,
}) => {
  const { hasRole, hasPermission } = useAuth();

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

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default PermissionWrapper;