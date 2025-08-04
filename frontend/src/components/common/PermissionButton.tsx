import React from 'react';
import { Button, ButtonProps, Tooltip } from 'antd';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionButtonProps extends ButtonProps {
  roles?: string[];
  permissions?: Array<{ resource: string; action: string }>;
  requireAll?: boolean;
  noPermissionTooltip?: string;
}

/**
 * 权限按钮组件 - 根据用户权限控制按钮的可用性
 */
const PermissionButton: React.FC<PermissionButtonProps> = ({
  roles,
  permissions,
  requireAll = true,
  noPermissionTooltip = '权限不足',
  children,
  disabled,
  ...buttonProps
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
  const isDisabled = disabled || !hasAccess;

  const button = (
    <Button
      {...buttonProps}
      disabled={isDisabled}
    >
      {children}
    </Button>
  );

  // 如果没有权限且设置了提示文本，显示Tooltip
  if (!hasAccess && noPermissionTooltip) {
    return (
      <Tooltip title={noPermissionTooltip}>
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default PermissionButton;