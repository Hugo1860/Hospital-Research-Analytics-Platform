const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { autoLogOperation } = require('../middleware/logging');
const { asyncHandler } = require('../middleware/errorHandler');
const searchController = require('../controllers/searchController');

// 所有搜索路由都需要认证
router.use(authenticateToken);

/**
 * @route   GET /api/search/advanced
 * @desc    高级搜索文献
 * @access  Private
 */
router.get('/advanced',
  requirePermission('publications', 'read'),
  autoLogOperation('search'),
  asyncHandler(searchController.advancedSearch)
);

/**
 * @route   GET /api/search/quick
 * @desc    快速搜索（用于搜索框自动补全）
 * @access  Private
 */
router.get('/quick',
  requirePermission('publications', 'read'),
  asyncHandler(searchController.quickSearch)
);

/**
 * @route   GET /api/search/suggestions
 * @desc    获取搜索建议
 * @access  Private
 */
router.get('/suggestions',
  requirePermission('publications', 'read'),
  asyncHandler(searchController.getSearchSuggestions)
);

/**
 * @route   POST /api/search/history
 * @desc    保存搜索历史
 * @access  Private
 */
router.post('/history',
  requirePermission('publications', 'read'),
  asyncHandler(searchController.saveSearchHistory)
);

/**
 * @route   GET /api/search/popular
 * @desc    获取热门搜索词
 * @access  Private
 */
router.get('/popular',
  requirePermission('publications', 'read'),
  asyncHandler(searchController.getPopularSearches)
);

module.exports = router;