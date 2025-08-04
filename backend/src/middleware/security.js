const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 安全中间件配置
const securityMiddleware = {
  // Helmet 安全头配置
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }),

  // 通用限流配置
  generalRateLimit: rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每个IP 100次请求
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      });
    }
  }),

  // 登录限流配置
  loginRateLimit: rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 限制每个IP 5次登录尝试
    skipSuccessfulRequests: true,
    message: {
      error: 'Too many login attempts from this IP, please try again later.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED'
    },
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many login attempts from this IP, please try again later.',
        code: 'LOGIN_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      });
    }
  }),

  // 文件上传限流配置
  uploadRateLimit: rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 10, // 限制每个IP 10次上传
    message: {
      error: 'Too many upload requests from this IP, please try again later.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    }
  }),

  // API 限流配置
  apiRateLimit: rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 60, // 限制每个IP 60次API请求
    message: {
      error: 'Too many API requests from this IP, please try again later.',
      code: 'API_RATE_LIMIT_EXCEEDED'
    }
  }),

  // 请求大小限制
  requestSizeLimit: (req, res, next) => {
    const contentLength = parseInt(req.get('content-length'));
    const maxSize = parseInt(process.env.MAX_REQUEST_SIZE) || 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize: maxSize
      });
    }

    next();
  },

  // IP 白名单中间件
  ipWhitelist: (whitelist = []) => {
    return (req, res, next) => {
      if (whitelist.length === 0) {
        return next();
      }

      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (!whitelist.includes(clientIP)) {
        return res.status(403).json({
          error: 'Access denied from this IP address',
          code: 'IP_NOT_WHITELISTED'
        });
      }

      next();
    };
  },

  // 请求日志中间件
  requestLogger: (req, res, next) => {
    const start = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };

      // 记录异常状态码
      if (res.statusCode >= 400) {
        console.warn('HTTP Error:', JSON.stringify(logData));
      } else if (duration > 1000) {
        console.warn('Slow Request:', JSON.stringify(logData));
      }
    });

    next();
  },

  // CORS 安全配置
  corsOptions: {
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:3000'];

      // 允许没有 origin 的请求 (如移动应用)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Cache'],
    maxAge: 86400 // 24小时
  }
};

module.exports = securityMiddleware;