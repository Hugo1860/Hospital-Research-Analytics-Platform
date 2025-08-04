const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { logExport } = require('../middleware/logging');
const { asyncHandler } = require('../middleware/errorHandler');
const reportController = require('../controllers/reportController');

// 所有报告路由都需要认证
router.use(authenticateToken);

/**
 * @route   GET /api/reports/department
 * @desc    生成科室报告（PDF格式）
 * @access  Private
 */
router.get('/department',
  requirePermission('statistics', 'read'),
  logExport('department_report'),
  asyncHandler(reportController.generateDepartmentReport)
);

/**
 * @route   GET /api/reports/hospital
 * @desc    生成全院报告（PDF格式）
 * @access  Private
 */
router.get('/hospital',
  requirePermission('statistics', 'read'),
  logExport('hospital_report'),
  asyncHandler(reportController.generateHospitalReport)
);

/**
 * @route   POST /api/reports/custom
 * @desc    生成自定义报告（PDF格式）
 * @access  Private
 */
router.post('/custom',
  requirePermission('statistics', 'read'),
  logExport('custom_report'),
  asyncHandler(reportController.generateCustomReport)
);

/**
 * @route   GET /api/reports/excel
 * @desc    生成Excel格式报告
 * @access  Private
 */
router.get('/excel',
  requirePermission('statistics', 'read'),
  logExport('excel_report'),
  asyncHandler(reportController.generateExcelReport)
);

/**
 * @route   GET /api/reports/template
 * @desc    下载报告生成模板
 * @access  Private
 */
router.get('/template',
  requirePermission('statistics', 'read'),
  asyncHandler(reportController.generateReportTemplate)
);

module.exports = router;