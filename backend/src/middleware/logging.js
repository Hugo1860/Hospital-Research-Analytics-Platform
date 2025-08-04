const { OperationLog } = require('../models');

// 操作日志记录中间件
const logOperation = (action, resource) => {
  return async (req, res, next) => {
    // 保存原始的 res.json 方法
    const originalJson = res.json;
    
    // 重写 res.json 方法以在响应后记录日志
    res.json = function(data) {
      // 调用原始方法
      const result = originalJson.call(this, data);
      
      // 异步记录操作日志
      setImmediate(async () => {
        try {
          if (req.user && res.statusCode < 400) {
            let resourceId = null;
            
            // 尝试从不同位置获取资源ID
            if (req.params.id) {
              resourceId = parseInt(req.params.id);
            } else if (data && data.id) {
              resourceId = data.id;
            } else if (data && data.data && data.data.id) {
              resourceId = data.data.id;
            }

            // 准备日志详情
            const details = {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode
            };

            // 对于创建和更新操作，记录请求体（排除敏感信息）
            if (['create', 'update'].includes(action) && req.body) {
              const sanitizedBody = { ...req.body };
              delete sanitizedBody.password;
              details.requestBody = sanitizedBody;
            }

            await OperationLog.logOperation(
              req.user.id,
              action,
              resource,
              resourceId,
              details,
              req
            );
          }
        } catch (error) {
          console.error('Failed to log operation:', error);
        }
      });
      
      return result;
    };
    
    next();
  };
};

// 自动检测操作类型的中间件
const autoLogOperation = (resource) => {
  return (req, res, next) => {
    let action;
    
    switch (req.method) {
      case 'GET':
        action = 'read';
        break;
      case 'POST':
        action = 'create';
        break;
      case 'PUT':
      case 'PATCH':
        action = 'update';
        break;
      case 'DELETE':
        action = 'delete';
        break;
      default:
        action = req.method.toLowerCase();
    }
    
    return logOperation(action, resource)(req, res, next);
  };
};

// 登录日志中间件
const logLogin = async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    const result = originalJson.call(this, data);
    
    setImmediate(async () => {
      try {
        if (res.statusCode === 200 && data.user) {
          await OperationLog.logOperation(
            data.user.id,
            'login',
            'auth',
            null,
            {
              method: req.method,
              url: req.originalUrl,
              loginTime: new Date()
            },
            req
          );
        }
      } catch (error) {
        console.error('Failed to log login:', error);
      }
    });
    
    return result;
  };
  
  next();
};

// 文件上传日志中间件
const logFileUpload = (fileType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      const result = originalJson.call(this, data);
      
      setImmediate(async () => {
        try {
          if (req.user && res.statusCode < 400 && req.file) {
            await OperationLog.logOperation(
              req.user.id,
              'import',
              fileType,
              null,
              {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                uploadResult: data
              },
              req
            );
          }
        } catch (error) {
          console.error('Failed to log file upload:', error);
        }
      });
      
      return result;
    };
    
    next();
  };
};

// 导出日志中间件
const logExport = (exportType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    const originalSend = res.send;
    
    // 重写响应方法
    const logExportOperation = function(data) {
      setImmediate(async () => {
        try {
          if (req.user && res.statusCode < 400) {
            await OperationLog.logOperation(
              req.user.id,
              'export',
              exportType,
              null,
              {
                exportParams: req.query,
                exportTime: new Date()
              },
              req
            );
          }
        } catch (error) {
          console.error('Failed to log export:', error);
        }
      });
    };
    
    res.json = function(data) {
      logExportOperation(data);
      return originalJson.call(this, data);
    };
    
    res.send = function(data) {
      logExportOperation(data);
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  logOperation,
  autoLogOperation,
  logLogin,
  logFileUpload,
  logExport
};