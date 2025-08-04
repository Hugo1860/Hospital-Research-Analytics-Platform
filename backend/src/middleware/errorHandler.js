const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.user ? req.user.id : 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Sequelize 验证错误
  if (err instanceof ValidationError) {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));

    return res.status(400).json({
      error: '数据验证失败',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  // Sequelize 唯一约束错误
  if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path || 'unknown';
    return res.status(409).json({
      error: `${field}已存在`,
      code: 'DUPLICATE_RESOURCE',
      field: field
    });
  }

  // Sequelize 外键约束错误
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({
      error: '关联数据不存在或不能删除',
      code: 'FOREIGN_KEY_ERROR',
      details: err.message
    });
  }

  // JWT 相关错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '无效的访问令牌',
      code: 'AUTHENTICATION_ERROR'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: '访问令牌已过期',
      code: 'AUTHENTICATION_ERROR'
    });
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: '文件大小超出限制',
      code: 'FILE_UPLOAD_ERROR',
      maxSize: process.env.MAX_FILE_SIZE || '10MB'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: '不支持的文件类型',
      code: 'FILE_UPLOAD_ERROR'
    });
  }

  // 自定义业务错误
  if (err.isCustomError) {
    return res.status(err.statusCode || 400).json({
      error: err.message,
      code: err.code || 'BUSINESS_ERROR',
      details: err.details
    });
  }

  // 数据库连接错误
  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      error: '数据库连接失败',
      code: 'DATABASE_ERROR'
    });
  }

  // 默认服务器错误
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? '服务器内部错误' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 错误处理中间件
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: `API端点 ${req.method} ${req.originalUrl} 不存在`,
    code: 'RESOURCE_NOT_FOUND'
  });
};

// 自定义错误类
class CustomError extends Error {
  constructor(message, statusCode = 400, code = 'CUSTOM_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isCustomError = true;
    this.name = 'CustomError';
  }
}

// 业务错误创建函数
const createError = {
  validation: (message, details = null) => 
    new CustomError(message, 400, 'VALIDATION_ERROR', details),
  
  notFound: (resource = '资源') => 
    new CustomError(`${resource}不存在`, 404, 'RESOURCE_NOT_FOUND'),
  
  unauthorized: (message = '未授权访问') => 
    new CustomError(message, 401, 'AUTHENTICATION_ERROR'),
  
  forbidden: (message = '权限不足') => 
    new CustomError(message, 403, 'AUTHORIZATION_ERROR'),
  
  conflict: (message = '资源冲突') => 
    new CustomError(message, 409, 'DUPLICATE_RESOURCE'),
  
  badRequest: (message = '请求参数错误') => 
    new CustomError(message, 400, 'BAD_REQUEST'),
  
  internal: (message = '服务器内部错误') => 
    new CustomError(message, 500, 'INTERNAL_SERVER_ERROR')
};

// 异步错误包装器
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  CustomError,
  createError,
  asyncHandler
};