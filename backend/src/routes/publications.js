const express = require('express');
const router = express.Router();
const { 
  authenticateToken, 
  requirePermission, 
  requireDepartmentAccess, 
  authenticateFileUpload,
  authStatus 
} = require('../middleware/auth');
const { validate, publicationSchemas } = require('../middleware/validation');
const { autoLogOperation, logFileUpload } = require('../middleware/logging');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadSingle } = require('../utils/fileUpload');
const publicationController = require('../controllers/publicationController');

// 所有文献路由都需要认证（除了特殊的文件上传路由）
router.use((req, res, next) => {
  // 文件上传路由使用专门的认证中间件
  if (req.path === '/import' && req.method === 'POST') {
    return next();
  }
  // 其他路由使用标准认证中间件
  return authenticateToken(req, res, next);
});

/**
 * @route   GET /api/publications
 * @desc    获取文献列表
 * @access  Private
 */
router.get('/',
  requirePermission('publications', 'read'),
  validate(publicationSchemas.search, 'query'),
  autoLogOperation('publication'),
  asyncHandler(publicationController.getPublications)
);

/**
 * @route   GET /api/publications/journals/match
 * @desc    期刊自动匹配（用于文献录入时的期刊选择）
 * @access  Private
 */
router.get('/journals/match',
  requirePermission('publications', 'read'),
  asyncHandler(publicationController.matchJournals)
);

/**
 * @route   GET /api/publications/statistics
 * @desc    获取文献统计信息
 * @access  Private
 */
router.get('/statistics',
  requirePermission('publications', 'read'),
  autoLogOperation('publication'),
  asyncHandler(publicationController.getPublicationStatistics)
);

/**
 * @route   GET /api/publications/:id
 * @desc    获取单个文献信息
 * @access  Private
 */
router.get('/:id',
  requirePermission('publications', 'read'),
  autoLogOperation('publication'),
  asyncHandler(publicationController.getPublication)
);

/**
 * @route   POST /api/publications
 * @desc    创建新文献
 * @access  Private (Department Admin and above)
 */
router.post('/',
  requirePermission('publications', 'create'),
  validate(publicationSchemas.create),
  requireDepartmentAccess,
  autoLogOperation('publication'),
  asyncHandler(publicationController.createPublication)
);

/**
 * @route   PUT /api/publications/:id
 * @desc    更新文献信息
 * @access  Private (Department Admin and above)
 */
router.put('/:id',
  requirePermission('publications', 'update'),
  validate(publicationSchemas.update),
  requireDepartmentAccess,
  autoLogOperation('publication'),
  asyncHandler(publicationController.updatePublication)
);

/**
 * @route   DELETE /api/publications/:id
 * @desc    删除文献
 * @access  Private (Department Admin and above)
 */
router.delete('/:id',
  requirePermission('publications', 'delete'),
  autoLogOperation('publication'),
  asyncHandler(publicationController.deletePublication)
);

/**
 * @route   POST /api/publications/import
 * @desc    批量导入文献数据
 * @access  Private (Department Admin and above)
 */
router.post('/import',
  // 移除全局认证中间件，使用专门的文件上传认证中间件
  authenticateFileUpload,
  requirePermission('publications', 'create'),
  requireDepartmentAccess,
  authStatus,
  uploadSingle('file'),
  logFileUpload('publication'),
  asyncHandler(publicationController.importPublications)
);

/**
 * @route   GET /api/publications/template/download
 * @desc    下载文献导入模板
 * @access  Private
 */
router.get('/template/download',
  requirePermission('publications', 'read'),
  // 模板下载限流：每分钟最多5次
  rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 5, // 最多5次请求
    message: {
      error: '模板下载过于频繁，请稍后重试',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
  asyncHandler(publicationController.downloadPublicationTemplate)
);

module.exports = router;