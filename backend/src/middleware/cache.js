const redis = require('redis');

// Redis 缓存中间件
class CacheMiddleware {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initRedis();
  }

  async initRedis() {
    try {
      if (process.env.NODE_ENV === 'production' && process.env.REDIS_PASSWORD) {
        this.client = redis.createClient({
          host: process.env.REDIS_HOST || 'redis',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              console.log('Redis server connection refused');
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
              return new Error('Retry time exhausted');
            }
            if (options.attempt > 10) {
              return undefined;
            }
            return Math.min(options.attempt * 100, 3000);
          }
        });

        this.client.on('connect', () => {
          console.log('Redis client connected');
          this.isConnected = true;
        });

        this.client.on('error', (err) => {
          console.log('Redis client error:', err);
          this.isConnected = false;
        });

        await this.client.connect();
      }
    } catch (error) {
      console.log('Redis initialization failed:', error.message);
      this.isConnected = false;
    }
  }

  // 生成缓存键
  generateCacheKey(req) {
    const { method, originalUrl, user } = req;
    const userId = user ? user.id : 'anonymous';
    return `cache:${method}:${originalUrl}:${userId}`;
  }

  // 缓存中间件
  cache(duration = 300) { // 默认5分钟
    return async (req, res, next) => {
      // 只缓存 GET 请求
      if (req.method !== 'GET' || !this.isConnected) {
        return next();
      }

      const cacheKey = this.generateCacheKey(req);

      try {
        // 尝试从缓存获取数据
        const cachedData = await this.client.get(cacheKey);
        
        if (cachedData) {
          const data = JSON.parse(cachedData);
          res.set('X-Cache', 'HIT');
          return res.json(data);
        }

        // 缓存未命中，继续处理请求
        res.set('X-Cache', 'MISS');
        
        // 重写 res.json 方法以缓存响应
        const originalJson = res.json;
        res.json = function(data) {
          // 只缓存成功的响应
          if (res.statusCode === 200) {
            this.client.setex(cacheKey, duration, JSON.stringify(data))
              .catch(err => console.log('Cache set error:', err));
          }
          return originalJson.call(this, data);
        }.bind(this);

        next();
      } catch (error) {
        console.log('Cache middleware error:', error);
        next();
      }
    };
  }

  // 清除缓存
  async clearCache(pattern = '*') {
    if (!this.isConnected) return;

    try {
      const keys = await this.client.keys(`cache:${pattern}`);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`Cleared ${keys.length} cache entries`);
      }
    } catch (error) {
      console.log('Clear cache error:', error);
    }
  }

  // 清除用户相关缓存
  async clearUserCache(userId) {
    await this.clearCache(`*:${userId}`);
  }

  // 清除特定路径缓存
  async clearPathCache(path) {
    await this.clearCache(`*:${path}:*`);
  }
}

module.exports = new CacheMiddleware();