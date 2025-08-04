const express = require('express');
const router = express.Router();

// API版本信息
router.get('/', (req, res) => {
  res.json({
    message: '协和医院SCI期刊分析系统 API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      departments: '/api/departments',
      journals: '/api/journals',
      publications: '/api/publications',
      statistics: '/api/statistics',
      reports: '/api/reports'
    }
  });
});

// 路由模块
router.use('/health', require('./health'));
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/departments', require('./departments'));
router.use('/journals', require('./journals'));
router.use('/publications', require('./publications'));
router.use('/statistics', require('./statistics'));
router.use('/search', require('./search'));
router.use('/export', require('./export'));
router.use('/reports', require('./reports'));

module.exports = router;