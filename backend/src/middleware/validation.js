const Joi = require('joi');

// 通用验证中间件
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        error: '请求参数验证失败',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // 将验证后的数据替换原始数据
    req[property] = value;
    next();
  };
};

// 分页参数验证
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
});

// 用户相关验证规则
const userSchemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required()
      .messages({
        'string.alphanum': '用户名只能包含字母和数字',
        'string.min': '用户名至少需要3个字符',
        'string.max': '用户名不能超过50个字符',
        'any.required': '用户名是必填项'
      }),
    password: Joi.string().min(6).max(255).required()
      .messages({
        'string.min': '密码至少需要6个字符',
        'any.required': '密码是必填项'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': '邮箱格式不正确',
        'any.required': '邮箱是必填项'
      }),
    role: Joi.string().valid('admin', 'department_admin', 'user').default('user'),
    departmentId: Joi.number().integer().positive().optional()
  }),

  login: Joi.object({
    username: Joi.string().required()
      .messages({
        'any.required': '用户名是必填项'
      }),
    password: Joi.string().required()
      .messages({
        'any.required': '密码是必填项'
      })
  }),

  update: Joi.object({
    email: Joi.string().email().optional(),
    role: Joi.string().valid('admin', 'department_admin', 'user').optional(),
    departmentId: Joi.number().integer().positive().optional(),
    isActive: Joi.boolean().optional()
  })
};

// 科室相关验证规则
const departmentSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required()
      .messages({
        'string.min': '科室名称不能为空',
        'string.max': '科室名称不能超过100个字符',
        'any.required': '科室名称是必填项'
      }),
    code: Joi.string().min(1).max(20).required()
      .messages({
        'string.min': '科室代码不能为空',
        'string.max': '科室代码不能超过20个字符',
        'any.required': '科室代码是必填项'
      }),
    description: Joi.string().max(1000).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    code: Joi.string().min(1).max(20).optional(),
    description: Joi.string().max(1000).optional()
  })
};

// 期刊相关验证规则
const journalSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(200).required()
      .messages({
        'any.required': '期刊名称是必填项'
      }),
    issn: Joi.string().pattern(/^\d{4}-\d{3}[\dX]$/i).optional()
      .messages({
        'string.pattern.base': 'ISSN格式不正确，应为XXXX-XXXX格式'
      }),
    impactFactor: Joi.number().min(0).max(50).precision(4).required()
      .messages({
        'number.min': '影响因子不能小于0',
        'number.max': '影响因子不能大于50',
        'any.required': '影响因子是必填项'
      }),
    quartile: Joi.string().valid('Q1', 'Q2', 'Q3', 'Q4').required()
      .messages({
        'any.only': '期刊分区必须是Q1、Q2、Q3或Q4',
        'any.required': '期刊分区是必填项'
      }),
    category: Joi.string().min(1).max(100).required()
      .messages({
        'any.required': '期刊类别是必填项'
      }),
    publisher: Joi.string().max(100).optional(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required()
      .messages({
        'number.min': '年份不能早于1900年',
        'number.max': '年份不能超过明年',
        'any.required': '年份是必填项'
      })
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    issn: Joi.string().pattern(/^\d{4}-\d{3}[\dX]$/i).optional(),
    impactFactor: Joi.number().min(0).max(50).precision(4).optional(),
    quartile: Joi.string().valid('Q1', 'Q2', 'Q3', 'Q4').optional(),
    category: Joi.string().min(1).max(100).optional(),
    publisher: Joi.string().max(100).optional(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional()
  }),

  search: Joi.object({
    keyword: Joi.string().max(200).optional(),
    quartile: Joi.string().valid('Q1', 'Q2', 'Q3', 'Q4').optional(),
    category: Joi.string().max(100).optional(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional(),
    impactFactorMin: Joi.number().min(0).max(50).optional(),
    impactFactorMax: Joi.number().min(0).max(50).optional()
  }).concat(paginationSchema)
};

// 文献相关验证规则
const publicationSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(500).required()
      .messages({
        'any.required': '文献标题是必填项'
      }),
    authors: Joi.string().min(1).required()
      .messages({
        'any.required': '作者信息是必填项'
      }),
    journalId: Joi.number().integer().positive().required()
      .messages({
        'any.required': '期刊ID是必填项'
      }),
    departmentId: Joi.number().integer().positive().required()
      .messages({
        'any.required': '科室ID是必填项'
      }),
    publishYear: Joi.number().integer().min(1900).max(new Date().getFullYear()).required()
      .messages({
        'number.min': '发表年份不能早于1900年',
        'number.max': '发表年份不能超过当前年份',
        'any.required': '发表年份是必填项'
      }),
    volume: Joi.string().max(20).optional(),
    issue: Joi.string().max(20).optional(),
    pages: Joi.string().max(50).optional(),
    doi: Joi.string().max(100).optional(),
    pmid: Joi.string().pattern(/^\d+$/).max(20).optional()
      .messages({
        'string.pattern.base': 'PMID必须是数字'
      })
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(500).optional(),
    authors: Joi.string().min(1).optional(),
    journalId: Joi.number().integer().positive().optional(),
    departmentId: Joi.number().integer().positive().optional(),
    publishYear: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    volume: Joi.string().max(20).optional(),
    issue: Joi.string().max(20).optional(),
    pages: Joi.string().max(50).optional(),
    doi: Joi.string().max(100).optional(),
    pmid: Joi.string().pattern(/^\d+$/).max(20).optional()
  }),

  search: Joi.object({
    keyword: Joi.string().max(200).optional(),
    departmentId: Joi.number().integer().positive().optional(),
    journalId: Joi.number().integer().positive().optional(),
    publishYear: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    quartile: Joi.string().valid('Q1', 'Q2', 'Q3', 'Q4').optional(),
    impactFactorMin: Joi.number().min(0).max(50).optional(),
    impactFactorMax: Joi.number().min(0).max(50).optional()
  }).concat(paginationSchema)
};

module.exports = {
  validate,
  paginationSchema,
  userSchemas,
  departmentSchemas,
  journalSchemas,
  publicationSchemas
};