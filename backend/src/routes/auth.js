const express = require('express');
const router = express.Router();
const { validate, userSchemas } = require('../middleware/validation');
const { authenticateToken, authStatus, optionalAuth } = require('../middleware/auth');
const { logLogin } = require('../middleware/logging');
const { asyncHandler } = require('../middleware/errorHandler');
const authController = require('../controllers/authController');

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', 
  validate(userSchemas.register),
  asyncHandler(authController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login',
  validate(userSchemas.login),
  logLogin,
  asyncHandler(authController.login)
);

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me',
  authenticateToken,
  authStatus,
  asyncHandler(authController.getCurrentUser)
);

/**
 * @route   PUT /api/auth/password
 * @desc    修改密码
 * @access  Private
 */
router.put('/password',
  authenticateToken,
  authStatus,
  validate(userSchemas.changePassword),
  asyncHandler(authController.changePassword)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    刷新token
 * @access  Private
 */
router.post('/refresh',
  authenticateToken,
  authStatus,
  asyncHandler(authController.refreshToken)
);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout',
  authenticateToken,
  authStatus,
  asyncHandler(authController.logout)
);

/**
 * @route   GET /api/auth/verify
 * @desc    验证token有效性
 * @access  Private
 */
router.get('/verify',
  authenticateToken,
  authStatus,
  asyncHandler(authController.verifyToken)
);

/**
 * @route   GET /api/auth/status
 * @desc    获取认证状态（可选认证）
 * @access  Public/Private
 */
router.get('/status',
  optionalAuth,
  authStatus,
  asyncHandler((req, res) => {
    res.json({
      success: true,
      authenticated: !!req.user,
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        departmentId: req.user.departmentId,
        department: req.user.department
      } : null,
      tokenInfo: req.tokenInfo ? {
        issuedAt: req.tokenInfo.issuedAt,
        expiresAt: req.tokenInfo.expiresAt,
        timeToExpiry: req.tokenInfo.expiresAt - Math.floor(Date.now() / 1000)
      } : null
    });
  })
);

module.exports = router;