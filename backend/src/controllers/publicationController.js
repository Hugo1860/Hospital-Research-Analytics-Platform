const { Publication, Journal, Department, User } = require('../models');
const { createError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { parsePublicationFile, matchJournalByName, matchDepartmentByName } = require('../utils/publicationParser');
const { cleanupFile } = require('../utils/fileUpload');

// 获取文献列表
const getPublications = async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    keyword,
    departmentId,
    journalId,
    publishYear,
    quartile,
    impactFactorMin,
    impactFactorMax,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * pageSize;
  const whereClause = {};
  const journalWhere = {};

  // 权限控制：科室管理员只能查看本科室的文献
  if (req.user.role === 'department_admin') {
    whereClause.departmentId = req.user.departmentId;
  } else if (departmentId) {
    whereClause.departmentId = departmentId;
  }

  // 关键词搜索（标题和作者）
  if (keyword) {
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${keyword}%` } },
      { authors: { [Op.like]: `%${keyword}%` } }
    ];
  }

  // 期刊筛选
  if (journalId) {
    whereClause.journalId = journalId;
  }

  // 发表年份筛选
  if (publishYear) {
    whereClause.publishYear = publishYear;
  }

  // 期刊分区筛选
  if (quartile) {
    journalWhere.quartile = quartile;
  }

  // 影响因子范围筛选
  if (impactFactorMin || impactFactorMax) {
    journalWhere.impactFactor = {};
    if (impactFactorMin) {
      journalWhere.impactFactor[Op.gte] = parseFloat(impactFactorMin);
    }
    if (impactFactorMax) {
      journalWhere.impactFactor[Op.lte] = parseFloat(impactFactorMax);
    }
  }

  // 验证排序字段
  const allowedSortFields = ['title', 'publishYear', 'createdAt'];
  const orderBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const { count, rows } = await Publication.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Journal,
        as: 'journal',
        where: Object.keys(journalWhere).length > 0 ? journalWhere : undefined,
        attributes: ['id', 'name', 'impactFactor', 'quartile', 'category']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }
    ],
    order: [[orderBy, sortOrder]],
    limit: parseInt(pageSize),
    offset: parseInt(offset)
  });

  res.json({
    publications: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / pageSize)
    }
  });
};

// 获取单个文献信息
const getPublication = async (req, res) => {
  const { id } = req.params;

  const publication = await Publication.findByPk(id, {
    include: [
      {
        model: Journal,
        as: 'journal',
        attributes: ['id', 'name', 'issn', 'impactFactor', 'quartile', 'category', 'publisher']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }
    ]
  });

  if (!publication) {
    throw createError.notFound('文献');
  }

  // 权限检查：科室管理员只能查看本科室的文献
  if (req.user.role === 'department_admin' && publication.departmentId !== req.user.departmentId) {
    throw createError.forbidden('只能查看本科室的文献');
  }

  res.json({
    publication
  });
};

// 创建文献
const createPublication = async (req, res) => {
  const {
    title,
    authors,
    journalId,
    departmentId,
    publishYear,
    volume,
    issue,
    pages,
    doi,
    pmid
  } = req.body;

  // 权限检查：科室管理员只能为本科室创建文献
  if (req.user.role === 'department_admin' && departmentId !== req.user.departmentId) {
    throw createError.forbidden('只能为本科室创建文献');
  }

  // 验证期刊是否存在
  const journal = await Journal.findByPk(journalId);
  if (!journal) {
    throw createError.notFound('指定的期刊');
  }

  // 验证科室是否存在
  const department = await Department.findByPk(departmentId);
  if (!department) {
    throw createError.notFound('指定的科室');
  }

  // 检查DOI是否重复（如果提供）
  if (doi) {
    const existingDOI = await Publication.findOne({
      where: { doi: doi.trim() }
    });
    if (existingDOI) {
      throw createError.conflict(`DOI "${doi}"已存在`);
    }
  }

  // 检查PMID是否重复（如果提供）
  if (pmid) {
    const existingPMID = await Publication.findOne({
      where: { pmid: pmid.trim() }
    });
    if (existingPMID) {
      throw createError.conflict(`PMID "${pmid}"已存在`);
    }
  }

  const publication = await Publication.create({
    title,
    authors,
    journalId,
    departmentId,
    publishYear,
    volume,
    issue,
    pages,
    doi: doi ? doi.trim() : null,
    pmid: pmid ? pmid.trim() : null,
    userId: req.user.id
  });

  // 获取完整的文献信息
  const fullPublication = await Publication.findByPk(publication.id, {
    include: [
      {
        model: Journal,
        as: 'journal',
        attributes: ['id', 'name', 'impactFactor', 'quartile', 'category']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  res.status(201).json({
    message: '文献创建成功',
    publication: fullPublication
  });
};

// 更新文献
const updatePublication = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const publication = await Publication.findByPk(id);
  if (!publication) {
    throw createError.notFound('文献');
  }

  // 权限检查：科室管理员只能更新本科室的文献
  if (req.user.role === 'department_admin' && publication.departmentId !== req.user.departmentId) {
    throw createError.forbidden('只能更新本科室的文献');
  }

  // 如果更新科室，检查权限
  if (updateData.departmentId && req.user.role === 'department_admin' && updateData.departmentId !== req.user.departmentId) {
    throw createError.forbidden('只能将文献分配给本科室');
  }

  // 如果更新期刊，验证期刊是否存在
  if (updateData.journalId) {
    const journal = await Journal.findByPk(updateData.journalId);
    if (!journal) {
      throw createError.notFound('指定的期刊');
    }
  }

  // 如果更新科室，验证科室是否存在
  if (updateData.departmentId) {
    const department = await Department.findByPk(updateData.departmentId);
    if (!department) {
      throw createError.notFound('指定的科室');
    }
  }

  // 检查DOI是否重复（如果更新）
  if (updateData.doi) {
    const existingDOI = await Publication.findOne({
      where: {
        doi: updateData.doi.trim(),
        id: { [Op.ne]: id }
      }
    });
    if (existingDOI) {
      throw createError.conflict(`DOI "${updateData.doi}"已存在`);
    }
    updateData.doi = updateData.doi.trim();
  }

  // 检查PMID是否重复（如果更新）
  if (updateData.pmid) {
    const existingPMID = await Publication.findOne({
      where: {
        pmid: updateData.pmid.trim(),
        id: { [Op.ne]: id }
      }
    });
    if (existingPMID) {
      throw createError.conflict(`PMID "${updateData.pmid}"已存在`);
    }
    updateData.pmid = updateData.pmid.trim();
  }

  await publication.update(updateData);

  // 获取更新后的完整信息
  const updatedPublication = await Publication.findByPk(id, {
    include: [
      {
        model: Journal,
        as: 'journal',
        attributes: ['id', 'name', 'impactFactor', 'quartile', 'category']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  res.json({
    message: '文献更新成功',
    publication: updatedPublication
  });
};

// 删除文献
const deletePublication = async (req, res) => {
  const { id } = req.params;

  const publication = await Publication.findByPk(id);
  if (!publication) {
    throw createError.notFound('文献');
  }

  // 权限检查：科室管理员只能删除本科室的文献
  if (req.user.role === 'department_admin' && publication.departmentId !== req.user.departmentId) {
    throw createError.forbidden('只能删除本科室的文献');
  }

  await publication.destroy();

  res.json({
    message: '文献删除成功'
  });
};

// 期刊自动匹配
const matchJournals = async (req, res) => {
  const { name, limit = 10 } = req.query;

  if (!name || name.trim().length < 2) {
    return res.json({ journals: [] });
  }

  const journals = await Journal.findAll({
    where: {
      name: {
        [Op.like]: `%${name.trim()}%`
      }
    },
    attributes: ['id', 'name', 'issn', 'impactFactor', 'quartile', 'category', 'year'],
    order: [['impactFactor', 'DESC']],
    limit: parseInt(limit)
  });

  res.json({
    journals: journals.map(journal => ({
      id: journal.id,
      name: journal.name,
      issn: journal.issn,
      impactFactor: journal.impactFactor,
      quartile: journal.quartile,
      category: journal.category,
      year: journal.year,
      displayName: `${journal.name} (IF: ${journal.impactFactor}, ${journal.quartile})`
    }))
  });
};

// 获取文献统计信息
const getPublicationStatistics = async (req, res) => {
  const { departmentId, startYear, endYear } = req.query;
  
  const whereClause = {};
  
  // 权限控制：科室管理员只能查看本科室统计
  if (req.user.role === 'department_admin') {
    whereClause.departmentId = req.user.departmentId;
  } else if (departmentId) {
    whereClause.departmentId = departmentId;
  }

  // 年份范围
  if (startYear || endYear) {
    whereClause.publishYear = {};
    if (startYear) {
      whereClause.publishYear[Op.gte] = parseInt(startYear);
    }
    if (endYear) {
      whereClause.publishYear[Op.lte] = parseInt(endYear);
    }
  }

  // 总数统计
  const totalCount = await Publication.count({ where: whereClause });

  // 按年份统计
  const yearlyStats = await Publication.findAll({
    where: whereClause,
    attributes: [
      'publishYear',
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('id')), 'count']
    ],
    group: ['publishYear'],
    order: [['publishYear', 'DESC']],
    limit: 10
  });

  // 按科室统计
  const departmentStats = await Publication.findAll({
    where: whereClause,
    attributes: [
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count']
    ],
    include: [{
      model: Department,
      as: 'department',
      attributes: ['id', 'name']
    }],
    group: ['department.id'],
    order: [[Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'DESC']],
    limit: 10
  });

  // 按期刊分区统计
  const quartileStats = await Publication.findAll({
    where: whereClause,
    attributes: [
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: ['quartile']
    }],
    group: ['journal.quartile'],
    order: [['journal.quartile', 'ASC']]
  });

  // 平均影响因子
  const avgImpactFactor = await Publication.findOne({
    where: whereClause,
    attributes: [
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }]
  });

  res.json({
    overview: {
      totalCount,
      avgImpactFactor: parseFloat(avgImpactFactor?.dataValues?.avgIF) || 0
    },
    yearlyStats: yearlyStats.map(item => ({
      year: item.publishYear,
      count: parseInt(item.dataValues.count)
    })),
    departmentStats: departmentStats.map(item => ({
      department: item.department,
      count: parseInt(item.dataValues.count)
    })),
    quartileStats: quartileStats.map(item => ({
      quartile: item.journal.quartile,
      count: parseInt(item.dataValues.count)
    }))
  });
};

// 批量导入文献数据
const importPublications = async (req, res) => {
  const filePath = req.file.path;
  const { departmentId } = req.body;
  
  // 权限检查：科室管理员只能为本科室导入
  if (req.user.role === 'department_admin') {
    if (!departmentId || parseInt(departmentId) !== req.user.departmentId) {
      cleanupFile(filePath);
      throw createError.forbidden('只能为本科室导入文献数据');
    }
  }
  
  try {
    // 验证科室是否存在
    if (departmentId) {
      const department = await Department.findByPk(departmentId);
      if (!department) {
        throw createError.notFound('指定的科室');
      }
    }
    
    // 解析文件
    const parseResult = await parsePublicationFile(filePath, departmentId);
    
    if (parseResult.data.length === 0) {
      throw createError.badRequest('文件中没有有效的文献数据');
    }
    
    // 批量处理数据
    const importResults = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: []
    };
    
    // 使用事务处理批量插入
    await Publication.sequelize.transaction(async (transaction) => {
      for (const publicationData of parseResult.data) {
        try {
          let journalId = null;
          let finalDepartmentId = departmentId;
          
          // 期刊匹配 - 支持名称、简称、ISSN匹配
          if (publicationData.journalName || publicationData.journalAbbreviation || publicationData.issn) {
            const journal = await matchJournalByName(
              publicationData.journalName,
              publicationData.journalAbbreviation,
              publicationData.issn
            );
            if (journal) {
              journalId = journal.id;
            } else {
              importResults.failed++;
              const searchTerms = [
                publicationData.journalName,
                publicationData.journalAbbreviation,
                publicationData.issn
              ].filter(Boolean).join(', ');
              importResults.errors.push({
                data: publicationData,
                error: `未找到匹配的期刊: ${searchTerms}`
              });
              continue;
            }
          }
          
          // 科室匹配（如果没有指定科室ID）
          if (!finalDepartmentId && publicationData.departmentName) {
            const department = await matchDepartmentByName(publicationData.departmentName);
            if (department) {
              finalDepartmentId = department.id;
            } else {
              importResults.failed++;
              importResults.errors.push({
                data: publicationData,
                error: `未找到匹配的科室: ${publicationData.departmentName}`
              });
              continue;
            }
          }
          
          if (!finalDepartmentId) {
            importResults.failed++;
            importResults.errors.push({
              data: publicationData,
              error: '无法确定文献所属科室'
            });
            continue;
          }
          
          // 检查DOI重复
          if (publicationData.doi) {
            const existingDOI = await Publication.findOne({
              where: { doi: publicationData.doi },
              transaction
            });
            
            if (existingDOI) {
              importResults.duplicates++;
              importResults.errors.push({
                data: publicationData,
                error: `DOI "${publicationData.doi}"已存在`
              });
              continue;
            }
          }
          
          // 检查PMID重复
          if (publicationData.pmid) {
            const existingPMID = await Publication.findOne({
              where: { pmid: publicationData.pmid },
              transaction
            });
            
            if (existingPMID) {
              importResults.duplicates++;
              importResults.errors.push({
                data: publicationData,
                error: `PMID "${publicationData.pmid}"已存在`
              });
              continue;
            }
          }
          
          // 检查WOS号重复
          if (publicationData.wosNumber) {
            const existingWOS = await Publication.findOne({
              where: { wosNumber: publicationData.wosNumber },
              transaction
            });
            
            if (existingWOS) {
              importResults.duplicates++;
              importResults.errors.push({
                data: publicationData,
                error: `WOS号 "${publicationData.wosNumber}"已存在`
              });
              continue;
            }
          }
          
          // 创建文献记录
          await Publication.create({
            title: publicationData.title,
            authors: publicationData.authors,
            journalId: journalId,
            departmentId: finalDepartmentId,
            publishYear: publicationData.publishYear,
            volume: publicationData.volume || null,
            issue: publicationData.issue || null,
            pages: publicationData.pages || null,
            doi: publicationData.doi || null,
            pmid: publicationData.pmid || null,
            wosNumber: publicationData.wosNumber || null,
            documentType: publicationData.documentType || null,
            journalAbbreviation: publicationData.journalAbbreviation || null,
            address: publicationData.address || null,
            userId: req.user.id
          }, { transaction });
          
          importResults.success++;
          
        } catch (error) {
          importResults.failed++;
          importResults.errors.push({
            data: publicationData,
            error: error.message
          });
        }
      }
    });
    
    // 合并解析错误和导入错误
    const allErrors = [
      ...parseResult.errors,
      ...importResults.errors
    ];
    
    const finalResult = {
      summary: {
        total: parseResult.success + parseResult.failed,
        success: importResults.success,
        failed: importResults.failed + parseResult.failed,
        duplicates: importResults.duplicates + parseResult.duplicates
      },
      errors: allErrors.slice(0, 100), // 最多返回100个错误
      hasMoreErrors: allErrors.length > 100
    };
    
    res.json({
      message: '文献数据导入完成',
      result: finalResult
    });
    
  } catch (error) {
    throw createError.badRequest(`文件导入失败: ${error.message}`);
  } finally {
    // 清理上传的文件
    cleanupFile(filePath);
  }
};

// 下载文献导入模板
const downloadPublicationTemplate = async (req, res) => {
  const TemplateGenerator = require('../utils/templateGenerator');
  
  try {
    // 记录下载操作日志
    console.log(`用户 ${req.user.username} (ID: ${req.user.id}) 下载文献导入模板`);
    
    // 生成协和医院专用模板
    const workbook = await TemplateGenerator.generatePublicationTemplate();
    
    // 生成带时间戳的文件名
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `文献导入模板_${timestamp}.xlsx`;
    
    // 设置安全响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // 发送文件
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error(`模板下载失败 - 用户: ${req.user.username}, 错误: ${error.message}`);
    throw createError.internalServerError(`模板生成失败: ${error.message}`);
  }
};

module.exports = {
  getPublications,
  getPublication,
  createPublication,
  updatePublication,
  deletePublication,
  matchJournals,
  getPublicationStatistics,
  importPublications,
  downloadPublicationTemplate
};