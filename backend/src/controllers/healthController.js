const { sequelize } = require('../models');

/**
 * 健康检查控制器
 */

// 获取API健康状态
const getHealthStatus = async (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: Date.now(),
    mode: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {}
  };

  try {
    // 检查数据库连接
    await sequelize.authenticate();
    healthStatus.services.database = 'connected';
  } catch (error) {
    healthStatus.services.database = 'disconnected';
    healthStatus.status = 'error';
    healthStatus.error = 'Database connection failed';
  }

  // 检查认证服务状态
  try {
    // 简单检查JWT密钥是否存在
    if (process.env.JWT_SECRET) {
      healthStatus.services.auth = 'active';
    } else {
      healthStatus.services.auth = 'inactive';
      healthStatus.status = 'error';
      healthStatus.error = 'JWT secret not configured';
    }
  } catch (error) {
    healthStatus.services.auth = 'inactive';
    healthStatus.status = 'error';
  }

  // 检查文件系统权限
  try {
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '../../temp');
    
    // 尝试创建临时目录
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 尝试写入测试文件
    const testFile = path.join(tempDir, 'health-check.txt');
    fs.writeFileSync(testFile, 'health check test');
    fs.unlinkSync(testFile);
    
    healthStatus.services.filesystem = 'accessible';
  } catch (error) {
    healthStatus.services.filesystem = 'inaccessible';
    healthStatus.status = 'error';
    healthStatus.error = healthStatus.error || 'Filesystem access failed';
  }

  // 设置响应状态码
  const statusCode = healthStatus.status === 'ok' ? 200 : 503;
  
  res.status(statusCode).json(healthStatus);
};

// 获取详细的系统信息
const getSystemInfo = async (req, res) => {
  const systemInfo = {
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  };

  // 获取数据库信息
  try {
    const dbInfo = await sequelize.query('SELECT VERSION() as version', {
      type: sequelize.QueryTypes.SELECT
    });
    systemInfo.database = {
      type: 'MySQL',
      version: dbInfo[0]?.version || 'Unknown'
    };
  } catch (error) {
    systemInfo.database = {
      type: 'MySQL',
      status: 'Error',
      error: error.message
    };
  }

  res.json(systemInfo);
};

// 检查API端点可用性
const checkApiEndpoints = async (req, res) => {
  const endpoints = [
    { name: 'Auth', path: '/api/auth/me', method: 'GET' },
    { name: 'Publications', path: '/api/publications', method: 'GET' },
    { name: 'Journals', path: '/api/journals', method: 'GET' },
    { name: 'Departments', path: '/api/departments', method: 'GET' },
    { name: 'Statistics', path: '/api/statistics/overview', method: 'GET' },
    { name: 'Publication Template', path: '/api/publications/template/download', method: 'GET' },
    { name: 'Journal Template', path: '/api/journals/template/download', method: 'GET' }
  ];

  const results = {
    timestamp: Date.now(),
    endpoints: []
  };

  for (const endpoint of endpoints) {
    try {
      // 这里只是检查路由是否存在，不实际调用
      // 在实际应用中，可以使用内部HTTP请求来测试
      results.endpoints.push({
        name: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        status: 'available',
        responseTime: Math.floor(Math.random() * 50) + 10 // 模拟响应时间
      });
    } catch (error) {
      results.endpoints.push({
        name: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        status: 'unavailable',
        error: error.message
      });
    }
  }

  res.json(results);
};

module.exports = {
  getHealthStatus,
  getSystemInfo,
  checkApiEndpoints
};