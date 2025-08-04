const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { logExport } = require('../middleware/logging');
const { asyncHandler } = require('../middleware/errorHandler');
const exportController = require('../controllers/exportController');

// 所有导出路由都需要认证
router.use(authenticateToken);

/**
 * @route   GET /api/export/publications
 * @desc    导出文献数据
 * @access  Private
 */
router.get('/publications',
  requirePermission('publications', 'read'),
  logExport('publications'),
  asyncHandler(exportController.exportPublications)
);

/**
 * @route   GET /api/export/journals
 * @desc    导出期刊数据
 * @access  Private
 */
router.get('/journals',
  requirePermission('journals', 'read'),
  logExport('journals'),
  asyncHandler(exportController.exportJournals)
);

/**
 * @route   GET /api/export/statistics
 * @desc    导出统计报告
 * @access  Private
 */
router.get('/statistics',
  requirePermission('statistics', 'read'),
  logExport('statistics'),
  asyncHandler(exportController.exportStatisticsReport)
);

module.exports = router;