import { useAuth } from '../contexts/AuthContext';

interface UsePermissionsOptions {
  roles?: string[];
  permissions?: Array<{ resource: string; action: string }>;
  requireAll?: boolean;
}

/**
 * 权限检查Hook
 */
export const usePermissions = (options: UsePermissionsOptions = {}) => {
  const { hasRole, hasPermission, state } = useAuth();
  const { roles, permissions, requireAll = true } = options;

  // 检查角色权限
  const checkRoles = (rolesToCheck: string[] = roles || []) => {
    if (rolesToCheck.length === 0) return true;
    
    if (requireAll) {
      return rolesToCheck.every(role => hasRole(role));
    } else {
      return rolesToCheck.some(role => hasRole(role));
    }
  };

  // 检查操作权限
  const checkPermissions = (permissionsToCheck: Array<{ resource: string; action: string }> = permissions || []) => {
    if (permissionsToCheck.length === 0) return true;
    
    if (requireAll) {
      return permissionsToCheck.every(({ resource, action }) => 
        hasPermission(resource, action)
      );
    } else {
      return permissionsToCheck.some(({ resource, action }) => 
        hasPermission(resource, action)
      );
    }
  };

  // 检查是否有访问权限
  const hasAccess = (checkOptions?: UsePermissionsOptions) => {
    const opts = { ...options, ...checkOptions };
    return checkRoles(opts.roles) && checkPermissions(opts.permissions);
  };

  // 检查是否是管理员
  const isAdmin = () => hasRole('admin');

  // 检查是否是科室管理员
  const isDepartmentAdmin = () => hasRole('department_admin');

  // 检查是否是普通用户
  const isUser = () => hasRole('user');

  // 检查是否可以管理用户
  const canManageUsers = () => hasPermission('users', 'create') || hasPermission('users', 'update');

  // 检查是否可以管理文献
  const canManagePublications = () => hasPermission('publications', 'create') || hasPermission('publications', 'update');

  // 检查是否可以管理期刊
  const canManageJournals = () => hasPermission('journals', 'create') || hasPermission('journals', 'update');

  // 检查是否可以查看统计
  const canViewStatistics = () => hasPermission('statistics', 'read');

  // 检查是否可以生成报告
  const canGenerateReports = () => hasPermission('reports', 'create');

  return {
    // 基础权限检查
    hasAccess,
    checkRoles,
    checkPermissions,
    
    // 角色检查
    isAdmin,
    isDepartmentAdmin,
    isUser,
    
    // 功能权限检查
    canManageUsers,
    canManagePublications,
    canManageJournals,
    canViewStatistics,
    canGenerateReports,
    
    // 用户信息
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  };
};