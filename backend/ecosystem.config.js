// PM2 生产环境配置
module.exports = {
  apps: [{
    name: 'hospital-journal-api',
    script: 'src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // 日志配置
    log_file: '/var/log/hospital-journal/combined.log',
    out_file: '/var/log/hospital-journal/out.log',
    error_file: '/var/log/hospital-journal/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 进程管理
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // 监控配置
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs'],
    
    // 自动重启配置
    autorestart: true,
    restart_delay: 4000,
    
    // 健康检查
    health_check_grace_period: 3000,
    
    // 环境变量
    env_file: '.env.production'
  }]
};