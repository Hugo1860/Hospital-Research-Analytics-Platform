const jwt = require('jsonwebtoken');
const { User } = require('../models');

// 认证错误类型枚举
const AUTH_ERROR_TYPES = {
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_MALFORMED: 'TOKEN_MALFORMED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR'
};

// 创建标准化的认证错误响应
const createAuthErrorResponse = (type, message, details = {}) => {
  const errorResponse = {
    success: false,
    error: message,
    code: type,
    type: type,
    timestamp: new Date().toISOString(),
    details
  };

  // 添加特定错误类型的额外信息
  switch (type) {
    case AUTH_ERROR_TYPES.TOKEN_EXPIRED:
      errorResponse.details = {
        ...details,
        expiry: details.expiry || null,
        suggestion: '请重新登录获取新的访问令牌'
      };
      break;
    case AUTH_ERROR_TYPES.TOKEN_INVALID:
    case AUTH_ERROR_TYPES.TOKEN_MALFORMED:
      errorResponse.details = {
        ...details,
        suggestion: '请检查令牌格式或重新登录'
      };
      break;
    case AUTH_ERROR_TYPES.USER_INACTIVE:
      errorResponse.details = {
        ...details,
        reason: '账户已被禁用',
        contact: '系统管理员',
        suggestion: '请联系系统管理员激活账户'
      };
      break;
    case AUTH_ERROR_TYPES.PERMISSION_DENIED:
      errorResponse.details = {
        ...details,
        suggestion: '请联系管理员申请相应权限'
      };
      break;
  }

  return errorResponse;
};

// 检查请求是否为文件上传
const isFileUploadRequest = (req) => {
  const contentType = req.headers['content-type'] || '';
  return contentType.includes('multipart/form-data');
};

// JWT认证中间件
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    // 检查Authorization头是否存在
    if (!authHeader) {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.TOKEN_MISSING,
        '请求缺少Authorization头',
        {
          header: 'Authorization',
          format: 'Bearer <token>',
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(401).json(errorResponse);
    }

    // 检查Authorization头格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.TOKEN_MALFORMED,
        'Authorization头格式不正确',
        {
          received: authHeader,
          expected: 'Bearer <token>',
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(401).json(errorResponse);
    }

    const token = parts[1];
    
    // 检查token是否为空
    if (!token || token.trim() === '') {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.TOKEN_MISSING,
        '访问令牌为空',
        {
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(401).json(errorResponse);
    }

    // 验证JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      let errorType, errorMessage, errorDetails = {};

      if (jwtError.name === 'JsonWebTokenError') {
        errorType = AUTH_ERROR_TYPES.TOKEN_INVALID;
        errorMessage = '无效的访问令牌';
        errorDetails = {
          reason: jwtError.message,
          isFileUpload: isFileUploadRequest(req)
        };
      } else if (jwtError.name === 'TokenExpiredError') {
        errorType = AUTH_ERROR_TYPES.TOKEN_EXPIRED;
        errorMessage = '访问令牌已过期';
        errorDetails = {
          expiry: jwtError.expiredAt ? jwtError.expiredAt.getTime() / 1000 : null,
          isFileUpload: isFileUploadRequest(req)
        };
      } else if (jwtError.name === 'NotBeforeError') {
        errorType = AUTH_ERROR_TYPES.TOKEN_INVALID;
        errorMessage = '令牌尚未生效';
        errorDetails = {
          reason: jwtError.message,
          notBefore: jwtError.date,
          isFileUpload: isFileUploadRequest(req)
        };
      } else {
        errorType = AUTH_ERROR_TYPES.TOKEN_MALFORMED;
        errorMessage = '令牌格式错误';
        errorDetails = {
          reason: jwtError.message,
          isFileUpload: isFileUploadRequest(req)
        };
      }

      const errorResponse = createAuthErrorResponse(errorType, errorMessage, errorDetails);
      return res.status(401).json(errorResponse);
    }

    // 验证token payload
    if (!decoded.userId) {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.TOKEN_INVALID,
        '令牌缺少用户信息',
        {
          payload: decoded,
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(401).json(errorResponse);
    }
    
    // 验证用户是否存在
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: require('../models').Department,
        as: 'department'
      }]
    });

    if (!user) {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.USER_NOT_FOUND,
        '用户不存在',
        {
          userId: decoded.userId,
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(401).json(errorResponse);
    }

    // 验证用户是否激活
    if (!user.isActive) {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.USER_INACTIVE,
        '用户账户已被禁用',
        {
          userId: user.id,
          username: user.username,
          deactivatedAt: user.updatedAt,
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(401).json(errorResponse);
    }

    // 将用户信息附加到请求对象
    req.user = user;
    req.tokenInfo = {
      token,
      decoded,
      issuedAt: decoded.iat,
      expiresAt: decoded.exp
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    
    const errorResponse = createAuthErrorResponse(
      AUTH_ERROR_TYPES.AUTHENTICATION_ERROR,
      '认证服务异常',
      {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        isFileUpload: isFileUploadRequest(req)
      }
    );
    
    return res.status(500).json(errorResponse);
  }
};

// 角色权限检查中间件
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.AUTHENTICATION_ERROR,
        '用户未认证',
        {
          middleware: 'requireRole',
          requiredRoles: Array.isArray(roles) ? roles : [roles],
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(401).json(errorResponse);
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.PERMISSION_DENIED,
        '角色权限不足',
        {
          requiredRoles: allowedRoles,
          currentRole: userRole,
          userId: req.user.id,
          username: req.user.username,
          resource: 'role-based access',
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(403).json(errorResponse);
    }

    next();
  };
};

// 资源权限检查中间件
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.AUTHENTICATION_ERROR,
        '用户未认证',
        {
          middleware: 'requirePermission',
          requiredPermission: `${resource}:${action}`,
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(401).json(errorResponse);
    }

    // 检查用户是否有hasPermission方法
    if (typeof req.user.hasPermission !== 'function') {
      // 如果没有hasPermission方法，使用基于角色的简单权限检查
      const hasPermission = checkPermissionByRole(req.user.role, resource, action);
      
      if (!hasPermission) {
        const errorResponse = createAuthErrorResponse(
          AUTH_ERROR_TYPES.PERMISSION_DENIED,
          `没有${resource}的${action}权限`,
          {
            requiredPermissions: [`${resource}:${action}`],
            currentRole: req.user.role,
            userId: req.user.id,
            username: req.user.username,
            resource,
            action,
            isFileUpload: isFileUploadRequest(req)
          }
        );
        return res.status(403).json(errorResponse);
      }
    } else {
      // 使用用户模型的hasPermission方法
      if (!req.user.hasPermission(resource, action)) {
        const errorResponse = createAuthErrorResponse(
          AUTH_ERROR_TYPES.PERMISSION_DENIED,
          `没有${resource}的${action}权限`,
          {
            requiredPermissions: [`${resource}:${action}`],
            currentRole: req.user.role,
            userId: req.user.id,
            username: req.user.username,
            resource,
            action,
            isFileUpload: isFileUploadRequest(req)
          }
        );
        return res.status(403).json(errorResponse);
      }
    }

    next();
  };
};

// 基于角色的权限检查辅助函数
const checkPermissionByRole = (role, resource, action) => {
  // 管理员拥有所有权限
  if (role === 'admin') return true;

  // 科室管理员权限
  if (role === 'department_admin') {
    const allowedPermissions = [
      'publications:read',
      'publications:create',
      'publications:update',
      'publications:delete',
      'journals:read',
      'statistics:read',
    ];
    return allowedPermissions.includes(`${resource}:${action}`);
  }

  // 普通用户权限
  if (role === 'user') {
    const allowedPermissions = [
      'publications:read',
      'journals:read',
      'statistics:read',
    ];
    return allowedPermissions.includes(`${resource}:${action}`);
  }

  return false;
};

// 科室权限检查中间件（科室管理员只能操作自己科室的数据）
const requireDepartmentAccess = (req, res, next) => {
  if (!req.user) {
    const errorResponse = createAuthErrorResponse(
      AUTH_ERROR_TYPES.AUTHENTICATION_ERROR,
      '用户未认证',
      {
        middleware: 'requireDepartmentAccess',
        isFileUpload: isFileUploadRequest(req)
      }
    );
    return res.status(401).json(errorResponse);
  }

  // 系统管理员可以访问所有科室数据
  if (req.user.role === 'admin') {
    return next();
  }

  // 科室管理员只能访问自己科室的数据
  if (req.user.role === 'department_admin') {
    const departmentId = req.params.departmentId || req.body.departmentId || req.query.departmentId;
    
    if (departmentId && parseInt(departmentId) !== req.user.departmentId) {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.PERMISSION_DENIED,
        '只能访问本科室的数据',
        {
          requestedDepartmentId: parseInt(departmentId),
          userDepartmentId: req.user.departmentId,
          userDepartmentName: req.user.department?.name,
          currentRole: req.user.role,
          userId: req.user.id,
          username: req.user.username,
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(403).json(errorResponse);
    }
  }

  // 普通用户只能访问自己科室的数据
  if (req.user.role === 'user') {
    const departmentId = req.params.departmentId || req.body.departmentId || req.query.departmentId;
    
    if (departmentId && parseInt(departmentId) !== req.user.departmentId) {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.PERMISSION_DENIED,
        '只能访问本科室的数据',
        {
          requestedDepartmentId: parseInt(departmentId),
          userDepartmentId: req.user.departmentId,
          userDepartmentName: req.user.department?.name,
          currentRole: req.user.role,
          userId: req.user.id,
          username: req.user.username,
          isFileUpload: isFileUploadRequest(req)
        }
      );
      return res.status(403).json(errorResponse);
    }
  }

  next();
};

// 可选认证中间件（用于公开接口，但如果有token则验证）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      // 没有认证头，继续处理请求但不设置用户信息
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // 认证头格式不正确，继续处理请求但不设置用户信息
      return next();
    }

    const token = parts[1];
    if (!token || token.trim() === '') {
      // token为空，继续处理请求但不设置用户信息
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.userId) {
        const user = await User.findByPk(decoded.userId, {
          include: [{
            model: require('../models').Department,
            as: 'department'
          }]
        });

        if (user && user.isActive) {
          req.user = user;
          req.tokenInfo = {
            token,
            decoded,
            issuedAt: decoded.iat,
            expiresAt: decoded.exp
          };
        }
      }
    } catch (jwtError) {
      // JWT验证失败，继续处理请求但不设置用户信息
      console.warn('Optional auth JWT verification failed:', jwtError.message);
    }

    next();
  } catch (error) {
    // 可选认证失败时不阻止请求，只是不设置用户信息
    console.warn('Optional auth middleware error:', error.message);
    next();
  }
};

// 添加认证状态检查中间件（用于调试和监控）
const authStatus = (req, res, next) => {
  // 添加认证状态信息到响应头（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    res.set('X-Auth-Status', req.user ? 'authenticated' : 'anonymous');
    if (req.user) {
      res.set('X-User-Role', req.user.role);
      res.set('X-User-Department', req.user.departmentId?.toString() || 'none');
    }
    if (req.tokenInfo) {
      res.set('X-Token-Expires', new Date(req.tokenInfo.expiresAt * 1000).toISOString());
    }
  }
  next();
};

// 添加文件上传认证检查中间件
const authenticateFileUpload = async (req, res, next) => {
  // 对于文件上传请求，提供更详细的错误信息
  if (isFileUploadRequest(req)) {
    req.isFileUpload = true;
  }
  
  // 使用标准认证中间件
  return authenticateToken(req, res, next);
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  requireDepartmentAccess,
  optionalAuth,
  authStatus,
  authenticateFileUpload,
  AUTH_ERROR_TYPES,
  createAuthErrorResponse,
  checkPermissionByRole
};