const express = require('express');
const router = express.Router();
const { 
  authenticateToken, 
  requirePermission, 
  authenticateFileUpload,
  authStatus 
} = require('../middleware/auth');
const { validate, journalSchemas } = require('../middleware/validation');
const { autoLogOperation, logFileUpload } = require('../middleware/logging');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadSingle } = require('../utils/fileUpload');
const journalController = require('../controllers/journalController');

// 所有期刊路由都需要认证（除了特殊的文件上传路由）
router.use((req, res, next) => {
  // 文件上传路由使用专门的认证中间件
  if (req.path === '/import' && req.method === 'POST') {
    return next();
  }
  // 其他路由使用标准认证中间件
  return authenticateToken(req, res, next);
});

/**
 * @route   GET /api/journals
 * @desc    获取期刊列表
 * @access  Private
 */
router.get('/',
  requirePermission('journals', 'read'),
  validate(journalSchemas.search, 'query'),
  autoLogOperation('journal'),
  asyncHandler(journalController.getJournals)
);

/**
 * @route   GET /api/journals/search
 * @desc    搜索期刊（自动补全）
 * @access  Private
 */
router.get('/search',
  requirePermission('journals', 'read'),
  asyncHandler(journalController.searchJournals)
);

/**
 * @route   GET /api/journals/statistics
 * @desc    获取期刊统计信息
 * @access  Private
 */
router.get('/statistics',
  requirePermission('journals', 'read'),
  autoLogOperation('journal'),
  asyncHandler(journalController.getJournalStatistics)
);

/**
 * @route   GET /api/journals/categories
 * @desc    获取期刊类别列表
 * @access  Private
 */
router.get('/categories',
  requirePermission('journals', 'read'),
  asyncHandler(journalController.getJournalCategories)
);

/**
 * @route   GET /api/journals/:id
 * @desc    获取单个期刊信息
 * @access  Private
 */
router.get('/:id',
  requirePermission('journals', 'read'),
  autoLogOperation('journal'),
  asyncHandler(journalController.getJournal)
);

/**
 * @route   POST /api/journals
 * @desc    创建新期刊
 * @access  Private (Admin only)
 */
router.post('/',
  requirePermission('journals', 'create'),
  validate(journalSchemas.create),
  autoLogOperation('journal'),
  asyncHandler(journalController.createJournal)
);

/**
 * @route   PUT /api/journals/:id
 * @desc    更新期刊信息
 * @access  Private (Admin only)
 */
router.put('/:id',
  requirePermission('journals', 'update'),
  validate(journalSchemas.update),
  autoLogOperation('journal'),
  asyncHandler(journalController.updateJournal)
);

/**
 * @route   DELETE /api/journals/:id
 * @desc    删除期刊
 * @access  Private (Admin only)
 */
router.delete('/:id',
  requirePermission('journals', 'delete'),
  autoLogOperation('journal'),
  asyncHandler(journalController.deleteJournal)
);

/**
 * @route   POST /api/journals/import
 * @desc    批量导入期刊数据
 * @access  Private (Admin only)
 */
router.post('/import',
  // 使用专门的文件上传认证中间件
  authenticateFileUpload,
  requirePermission('journals', 'create'),
  authStatus,
  uploadSingle('file'),
  logFileUpload('journal'),
  asyncHandler(journalController.importJournals)
);

/**
 * @route   GET /api/journals/template/download
 * @desc    下载期刊导入模板
 * @access  Private
 */
router.get('/template/download',
  requirePermission('journals', 'read'),
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
  asyncHandler(journalController.downloadTemplate)
);

module.exports = router;