const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳_随机数_原文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  const allowedMimes = [
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/csv', // .csv
    'application/csv'
  ];

  const allowedExts = ['.xls', '.xlsx', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('只支持Excel (.xls, .xlsx) 和 CSV 文件格式'), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 默认10MB
    files: 1 // 一次只能上传一个文件
  },
  fileFilter: fileFilter
});

// 单文件上传中间件
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: '文件大小超出限制',
            code: 'FILE_UPLOAD_ERROR',
            maxSize: '10MB'
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: '不支持的文件字段',
            code: 'FILE_UPLOAD_ERROR'
          });
        }
        return res.status(400).json({
          error: '文件上传失败',
          code: 'FILE_UPLOAD_ERROR',
          details: err.message
        });
      } else if (err) {
        return res.status(400).json({
          error: err.message,
          code: 'FILE_UPLOAD_ERROR'
        });
      }
      
      // 检查是否有文件上传
      if (!req.file) {
        return res.status(400).json({
          error: '请选择要上传的文件',
          code: 'FILE_UPLOAD_ERROR'
        });
      }
      
      next();
    });
  };
};

// 清理上传的文件
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Failed to cleanup file:', filePath, error);
  }
};

// 验证文件是否存在且可读
const validateFile = (filePath) => {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  upload,
  uploadSingle,
  cleanupFile,
  validateFile,
  uploadDir
};