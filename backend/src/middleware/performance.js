const compression = require('compression');

// 性能优化中间件
const performanceMiddleware = {
  // Gzip 压缩配置
  compression: compression({
    level: 6, // 压缩级别 (1-9)
    threshold: 1024, // 只压缩大于1KB的响应
    filter: (req, res) => {
      // 不压缩已经压缩的内容
      if (req.headers['x-no-compression']) {
        return false;
      }
      
      // 使用默认过滤器
      return compression.filter(req, res);
    }
  }),

  // 响应时间监控
  responseTime: (req, res, next) => {
    const start = process.hrtime();
    
    // 在响应开始前设置头部
    const originalSend = res.send;
    res.send = function(data) {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      // 只在头部未发送时设置
      if (!res.headersSent) {
        res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
      }
      
      // 记录慢查询
      if (duration > 1000) {
        console.warn(`Slow request: ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  },

  // 内存使用监控
  memoryMonitor: (req, res, next) => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // 内存使用超过阈值时警告
    if (memUsageMB.heapUsed > 500) { // 500MB
      console.warn('High memory usage:', memUsageMB);
    }

    // 在开发环境中添加内存信息到响应头
    if (process.env.NODE_ENV === 'development') {
      res.set('X-Memory-Usage', JSON.stringify(memUsageMB));
    }

    next();
  },

  // 数据库连接池监控
  dbPoolMonitor: (sequelize) => {
    return (req, res, next) => {
      if (process.env.NODE_ENV === 'development') {
        const pool = sequelize.connectionManager.pool;
        const poolInfo = {
          size: pool.size,
          available: pool.available,
          using: pool.using,
          waiting: pool.waiting
        };
        
        res.set('X-DB-Pool', JSON.stringify(poolInfo));
        
        // 连接池使用率过高时警告
        if (pool.using / pool.size > 0.8) {
          console.warn('High database pool usage:', poolInfo);
        }
      }
      
      next();
    };
  },

  // 静态资源缓存
  staticCache: (req, res, next) => {
    // 设置静态资源缓存头
    if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.set({
        'Cache-Control': 'public, max-age=31536000', // 1年
        'Expires': new Date(Date.now() + 31536000000).toUTCString()
      });
    } else if (req.url.match(/\.(html|htm)$/)) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    }
    
    next();
  },

  // 请求去重中间件
  requestDeduplication: () => {
    const pendingRequests = new Map();
    
    return (req, res, next) => {
      // 只对 GET 请求进行去重
      if (req.method !== 'GET') {
        return next();
      }
      
      const key = `${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
      
      if (pendingRequests.has(key)) {
        // 如果有相同的请求正在处理，等待其完成
        const existingRequest = pendingRequests.get(key);
        existingRequest.then(result => {
          res.json(result);
        }).catch(error => {
          res.status(500).json({ error: error.message });
        });
        return;
      }
      
      // 创建新的请求 Promise
      const requestPromise = new Promise((resolve, reject) => {
        const originalJson = res.json;
        const originalStatus = res.status;
        
        let statusCode = 200;
        
        res.status = function(code) {
          statusCode = code;
          return originalStatus.call(this, code);
        };
        
        res.json = function(data) {
          if (statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Request failed'));
          }
          
          // 清理缓存
          pendingRequests.delete(key);
          
          return originalJson.call(this, data);
        };
      });
      
      pendingRequests.set(key, requestPromise);
      
      // 设置超时清理
      setTimeout(() => {
        pendingRequests.delete(key);
      }, 30000); // 30秒超时
      
      next();
    };
  },

  // 健康检查端点
  healthCheck: (req, res) => {
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV
    };
    
    res.json(healthInfo);
  }
};

module.exports = performanceMiddleware;