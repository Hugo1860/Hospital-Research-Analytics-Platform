const { Journal, Publication, Department } = require('../models');
const { createError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { parseJournalFile } = require('../utils/excelParser');
const { cleanupFile } = require('../utils/fileUpload');

// 获取期刊列表
const getJournals = async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    keyword,
    quartile,
    category,
    year,
    impactFactorMin,
    impactFactorMax,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * pageSize;
  const whereClause = {};

  // 关键词搜索（期刊名称）
  if (keyword) {
    whereClause.name = {
      [Op.like]: `%${keyword}%`
    };
  }

  // 分区筛选
  if (quartile) {
    whereClause.quartile = quartile;
  }

  // 类别筛选
  if (category) {
    whereClause.category = {
      [Op.like]: `%${category}%`
    };
  }

  // 年份筛选
  if (year) {
    whereClause.year = year;
  }

  // 影响因子范围筛选
  if (impactFactorMin || impactFactorMax) {
    whereClause.impactFactor = {};
    if (impactFactorMin) {
      whereClause.impactFactor[Op.gte] = parseFloat(impactFactorMin);
    }
    if (impactFactorMax) {
      whereClause.impactFactor[Op.lte] = parseFloat(impactFactorMax);
    }
  }

  // 验证排序字段
  const allowedSortFields = ['name', 'impactFactor', 'quartile', 'year', 'createdAt'];
  const orderBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const { count, rows } = await Journal.findAndCountAll({
    where: whereClause,
    order: [[orderBy, sortOrder]],
    limit: parseInt(pageSize),
    offset: parseInt(offset)
  });

  res.json({
    journals: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / pageSize)
    }
  });
};

// 获取单个期刊信息
const getJournal = async (req, res) => {
  const { id } = req.params;

  const journal = await Journal.findByPk(id, {
    include: [{
      model: Publication,
      as: 'publications',
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }],
      limit: 10, // 只显示最近的10篇文献
      order: [['createdAt', 'DESC']]
    }]
  });

  if (!journal) {
    throw createError.notFound('期刊');
  }

  // 获取期刊统计信息
  const stats = await journal.getPublicationStats();

  res.json({
    journal,
    statistics: stats
  });
};

// 创建期刊
const createJournal = async (req, res) => {
  const {
    name,
    issn,
    impactFactor,
    quartile,
    category,
    publisher,
    year
  } = req.body;

  // 检查期刊名称是否已存在（同一年份）
  const existingJournal = await Journal.findOne({
    where: {
      name,
      year
    }
  });

  if (existingJournal) {
    throw createError.conflict(`${year}年的期刊"${name}"已存在`);
  }

  // 如果提供了ISSN，检查是否重复
  if (issn) {
    const existingISSN = await Journal.findOne({
      where: { issn, year }
    });

    if (existingISSN) {
      throw createError.conflict(`ISSN "${issn}"在${year}年已被使用`);
    }
  }

  const journal = await Journal.create({
    name,
    issn,
    impactFactor,
    quartile,
    category,
    publisher,
    year
  });

  res.status(201).json({
    message: '期刊创建成功',
    journal
  });
};

// 更新期刊
const updateJournal = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const journal = await Journal.findByPk(id);
  if (!journal) {
    throw createError.notFound('期刊');
  }

  // 如果更新名称或年份，检查是否与其他期刊冲突
  if (updateData.name || updateData.year) {
    const checkName = updateData.name || journal.name;
    const checkYear = updateData.year || journal.year;

    const existingJournal = await Journal.findOne({
      where: {
        name: checkName,
        year: checkYear,
        id: { [Op.ne]: id } // 排除当前期刊
      }
    });

    if (existingJournal) {
      throw createError.conflict(`${checkYear}年的期刊"${checkName}"已存在`);
    }
  }

  // 如果更新ISSN，检查是否重复
  if (updateData.issn) {
    const checkYear = updateData.year || journal.year;
    const existingISSN = await Journal.findOne({
      where: {
        issn: updateData.issn,
        year: checkYear,
        id: { [Op.ne]: id }
      }
    });

    if (existingISSN) {
      throw createError.conflict(`ISSN "${updateData.issn}"在${checkYear}年已被使用`);
    }
  }

  await journal.update(updateData);

  res.json({
    message: '期刊更新成功',
    journal
  });
};

// 删除期刊
const deleteJournal = async (req, res) => {
  const { id } = req.params;

  const journal = await Journal.findByPk(id);
  if (!journal) {
    throw createError.notFound('期刊');
  }

  // 检查是否有关联的文献发表
  const publicationCount = await Publication.count({
    where: { journalId: id }
  });

  if (publicationCount > 0) {
    throw createError.badRequest(`无法删除期刊，存在${publicationCount}篇相关文献发表记录`);
  }

  await journal.destroy();

  res.json({
    message: '期刊删除成功'
  });
};

// 搜索期刊（用于自动补全）
const searchJournals = async (req, res) => {
  const { q: keyword, limit = 10 } = req.query;

  if (!keyword || keyword.trim().length < 2) {
    return res.json({ journals: [] });
  }

  const journals = await Journal.searchByName(keyword.trim(), parseInt(limit));

  res.json({
    journals: journals.map(journal => ({
      id: journal.id,
      name: journal.name,
      issn: journal.issn,
      impactFactor: journal.impactFactor,
      quartile: journal.quartile,
      category: journal.category,
      year: journal.year
    }))
  });
};

// 获取期刊统计信息
const getJournalStatistics = async (req, res) => {
  const stats = await Journal.getStatistics();

  // 获取各分区的平均影响因子
  const quartileStats = await Journal.findAll({
    attributes: [
      'quartile',
      [Journal.sequelize.fn('AVG', Journal.sequelize.col('impactFactor')), 'avgIF'],
      [Journal.sequelize.fn('COUNT', Journal.sequelize.col('id')), 'count']
    ],
    group: ['quartile'],
    order: [['quartile', 'ASC']]
  });

  // 获取年度统计
  const yearlyStats = await Journal.findAll({
    attributes: [
      'year',
      [Journal.sequelize.fn('COUNT', Journal.sequelize.col('id')), 'count'],
      [Journal.sequelize.fn('AVG', Journal.sequelize.col('impactFactor')), 'avgIF']
    ],
    group: ['year'],
    order: [['year', 'DESC']],
    limit: 10
  });

  // 获取热门类别
  const categoryStats = await Journal.findAll({
    attributes: [
      'category',
      [Journal.sequelize.fn('COUNT', Journal.sequelize.col('id')), 'count']
    ],
    group: ['category'],
    order: [[Journal.sequelize.fn('COUNT', Journal.sequelize.col('id')), 'DESC']],
    limit: 10
  });

  res.json({
    overview: stats,
    quartileStats: quartileStats.map(item => ({
      quartile: item.quartile,
      count: parseInt(item.dataValues.count),
      avgImpactFactor: parseFloat(item.dataValues.avgIF) || 0
    })),
    yearlyStats: yearlyStats.map(item => ({
      year: item.year,
      count: parseInt(item.dataValues.count),
      avgImpactFactor: parseFloat(item.dataValues.avgIF) || 0
    })),
    categoryStats: categoryStats.map(item => ({
      category: item.category,
      count: parseInt(item.dataValues.count)
    }))
  });
};

// 获取期刊类别列表
const getJournalCategories = async (req, res) => {
  const categories = await Journal.findAll({
    attributes: [
      [Journal.sequelize.fn('DISTINCT', Journal.sequelize.col('category')), 'category']
    ],
    order: [['category', 'ASC']]
  });

  res.json({
    categories: categories.map(item => item.category).filter(Boolean)
  });
};

// 批量导入期刊数据
const importJournals = async (req, res) => {
  const filePath = req.file.path;
  
  try {
    // 解析文件
    const parseResult = await parseJournalFile(filePath);
    
    if (parseResult.data.length === 0) {
      throw createError.badRequest('文件中没有有效的期刊数据');
    }
    
    // 批量处理数据
    const importResults = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: []
    };
    
    // 使用事务处理批量插入
    await Journal.sequelize.transaction(async (transaction) => {
      for (const journalData of parseResult.data) {
        try {
          // 检查是否已存在相同的期刊（名称+年份）
          const existingJournal = await Journal.findOne({
            where: {
              name: journalData.name,
              year: journalData.year
            },
            transaction
          });
          
          if (existingJournal) {
            importResults.duplicates++;
            importResults.errors.push({
              data: journalData,
              error: `期刊"${journalData.name}"(${journalData.year}年)已存在`
            });
            continue;
          }
          
          // 如果提供了ISSN，检查是否重复
          if (journalData.issn) {
            const existingISSN = await Journal.findOne({
              where: {
                issn: journalData.issn,
                year: journalData.year
              },
              transaction
            });
            
            if (existingISSN) {
              importResults.duplicates++;
              importResults.errors.push({
                data: journalData,
                error: `ISSN "${journalData.issn}"在${journalData.year}年已被使用`
              });
              continue;
            }
          }
          
          // 创建期刊记录
          await Journal.create(journalData, { transaction });
          importResults.success++;
          
        } catch (error) {
          importResults.failed++;
          importResults.errors.push({
            data: journalData,
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
      message: '期刊数据导入完成',
      result: finalResult
    });
    
  } catch (error) {
    throw createError.badRequest(`文件导入失败: ${error.message}`);
  } finally {
    // 清理上传的文件
    cleanupFile(filePath);
  }
};

// 下载期刊导入模板
const downloadTemplate = async (req, res) => {
  const TemplateGenerator = require('../utils/templateGenerator');
  
  try {
    // 记录下载操作日志
    console.log(`用户 ${req.user.username} (ID: ${req.user.id}) 下载期刊导入模板`);
    
    // 生成期刊导入模板
    const workbook = await TemplateGenerator.generateJournalTemplate();
    
    // 生成带时间戳的文件名
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `期刊导入模板_${timestamp}.xlsx`;
    
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
  getJournals,
  getJournal,
  createJournal,
  updateJournal,
  deleteJournal,
  searchJournals,
  getJournalStatistics,
  getJournalCategories,
  importJournals,
  downloadTemplate
};