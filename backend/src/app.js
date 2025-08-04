const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// 导入自定义中间件
const securityMiddleware = require('./middleware/security');
const performanceMiddleware = require('./middleware/performance');
const cacheMiddleware = require('./middleware/cache');

const app = express();
const PORT = process.env.PORT || 3001;

// 信任代理 (用于获取真实IP)
app.set('trust proxy', 1);

// 性能监控中间件
app.use(performanceMiddleware.responseTime);
app.use(performanceMiddleware.memoryMonitor);

// 压缩中间件
app.use(performanceMiddleware.compression);

// 安全中间件
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.requestLogger);
app.use(securityMiddleware.requestSizeLimit);

// CORS配置
app.use(cors(securityMiddleware.corsOptions));

// 通用限流
app.use(securityMiddleware.generalRateLimit);

// 日志中间件
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// 解析JSON和URL编码数据
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 (带缓存)
app.use('/uploads', performanceMiddleware.staticCache, express.static('uploads', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// 健康检查端点
app.get('/health', performanceMiddleware.healthCheck);
app.get('/api/health', performanceMiddleware.healthCheck);

// API路由
app.use('/api', require('./routes'));

// 404处理
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
app.use('*', notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 API文档: http://localhost:${PORT}/health`);
});

module.exports = app;