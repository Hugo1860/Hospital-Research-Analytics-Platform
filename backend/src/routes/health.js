const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/health
 * @desc    获取API健康状态
 * @access  Public
 */
router.get('/', asyncHandler(healthController.getHealthStatus));

/**
 * @route   GET /api/health/system
 * @desc    获取详细系统信息
 * @access  Public
 */
router.get('/system', asyncHandler(healthController.getSystemInfo));

/**
 * @route   GET /api/health/endpoints
 * @desc    检查API端点可用性
 * @access  Public
 */
router.get('/endpoints', asyncHandler(healthController.checkApiEndpoints));

module.exports = router;