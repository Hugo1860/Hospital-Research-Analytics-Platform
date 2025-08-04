const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { autoLogOperation } = require('../middleware/logging');
const { asyncHandler } = require('../middleware/errorHandler');
const statisticsController = require('../controllers/statisticsController');

// 所有统计路由都需要认证
router.use(authenticateToken);

/**
 * @route   GET /api/statistics/departments/:id
 * @desc    获取单个科室的统计信息
 * @access  Private
 */
router.get('/departments/:id',
  requirePermission('statistics', 'read'),
  autoLogOperation('statistics'),
  asyncHandler(async (req, res) => {
    req.query.departmentId = req.params.id;
    return statisticsController.getDepartmentStatistics(req, res);
  })
);

/**
 * @route   GET /api/statistics/departments
 * @desc    获取科室统计信息（支持查询参数）
 * @access  Private
 */
router.get('/departments',
  requirePermission('statistics', 'read'),
  autoLogOperation('statistics'),
  asyncHandler(statisticsController.getDepartmentStatistics)
);

/**
 * @route   GET /api/statistics/comparison
 * @desc    获取多个科室的对比统计
 * @access  Private
 */
router.get('/comparison',
  requirePermission('statistics', 'read'),
  autoLogOperation('statistics'),
  asyncHandler(statisticsController.getDepartmentsComparison)
);

/**
 * @route   GET /api/statistics/trends
 * @desc    获取年度趋势分析
 * @access  Private
 */
router.get('/trends',
  requirePermission('statistics', 'read'),
  autoLogOperation('statistics'),
  asyncHandler(statisticsController.getYearlyTrends)
);

/**
 * @route   GET /api/statistics/overview
 * @desc    获取全院统计概览
 * @access  Private
 */
router.get('/overview',
  requirePermission('statistics', 'read'),
  autoLogOperation('statistics'),
  asyncHandler(statisticsController.getOverviewStatistics)
);

/**
 * @route   GET /api/statistics/dashboard
 * @desc    获取仪表板实时统计数据
 * @access  Private
 */
router.get('/dashboard',
  requirePermission('statistics', 'read'),
  autoLogOperation('statistics'),
  asyncHandler(statisticsController.getDashboardStats)
);

module.exports = router;