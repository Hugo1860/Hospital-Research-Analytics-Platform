const { Publication, Journal, Department, User } = require('../models');
const { createError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// 高级搜索文献
const advancedSearch = async (req, res) => {
  const {
    keyword,
    title,
    authors,
    journalName,
    departmentId,
    publishYear,
    startYear,
    endYear,
    quartile,
    impactFactorMin,
    impactFactorMax,
    category,
    doi,
    pmid,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    page = 1,
    pageSize = 20
  } = req.query;

  const offset = (page - 1) * pageSize;
  const whereClause = {};
  const journalWhere = {};

  // 权限控制：科室管理员只能搜索本科室的文献
  if (req.user.role === 'department_admin') {
    whereClause.departmentId = req.user.departmentId;
  } else if (departmentId) {
    whereClause.departmentId = departmentId;
  }

  // 关键词搜索（在标题、作者、期刊名称中搜索）
  if (keyword && keyword.trim()) {
    const keywordTerm = keyword.trim();
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${keywordTerm}%` } },
      { authors: { [Op.like]: `%${keywordTerm}%` } },
      { '$journal.name$': { [Op.like]: `%${keywordTerm}%` } }
    ];
  }

  // 标题搜索
  if (title && title.trim()) {
    whereClause.title = { [Op.like]: `%${title.trim()}%` };
  }

  // 作者搜索
  if (authors && authors.trim()) {
    whereClause.authors = { [Op.like]: `%${authors.trim()}%` };
  }

  // 期刊名称搜索
  if (journalName && journalName.trim()) {
    journalWhere.name = { [Op.like]: `%${journalName.trim()}%` };
  }

  // 发表年份筛选
  if (publishYear) {
    whereClause.publishYear = parseInt(publishYear);
  } else if (startYear || endYear) {
    whereClause.publishYear = {};
    if (startYear) {
      whereClause.publishYear[Op.gte] = parseInt(startYear);
    }
    if (endYear) {
      whereClause.publishYear[Op.lte] = parseInt(endYear);
    }
  }

  // 期刊分区筛选
  if (quartile) {
    const quartiles = Array.isArray(quartile) ? quartile : [quartile];
    journalWhere.quartile = { [Op.in]: quartiles };
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

  // 期刊类别筛选
  if (category && category.trim()) {
    journalWhere.category = { [Op.like]: `%${category.trim()}%` };
  }

  // DOI搜索
  if (doi && doi.trim()) {
    whereClause.doi = { [Op.like]: `%${doi.trim()}%` };
  }

  // PMID搜索
  if (pmid && pmid.trim()) {
    whereClause.pmid = { [Op.like]: `%${pmid.trim()}%` };
  }

  // 验证排序字段
  const allowedSortFields = [
    'title', 'authors', 'publishYear', 'createdAt', 'updatedAt',
    'journal.name', 'journal.impactFactor', 'department.name'
  ];
  
  let orderBy = 'createdAt';
  let orderModel = null;
  
  if (allowedSortFields.includes(sortBy)) {
    if (sortBy.includes('.')) {
      const [model, field] = sortBy.split('.');
      if (model === 'journal') {
        orderModel = { model: Journal, as: 'journal' };
        orderBy = field;
      } else if (model === 'department') {
        orderModel = { model: Department, as: 'department' };
        orderBy = field;
      }
    } else {
      orderBy = sortBy;
    }
  }

  try {
    const { count, rows } = await Publication.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Journal,
          as: 'journal',
          where: Object.keys(journalWhere).length > 0 ? journalWhere : undefined,
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
          attributes: ['id', 'username']
        }
      ],
      order: orderModel 
        ? [[orderModel, orderBy, sortOrder]]
        : [[orderBy, sortOrder]],
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      distinct: true
    });

    // 构建搜索统计信息
    const searchStats = {
      totalResults: count,
      currentPage: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / pageSize),
      hasNextPage: page < Math.ceil(count / pageSize),
      hasPrevPage: page > 1
    };

    // 如果有结果，计算一些统计信息
    if (count > 0) {
      const quartileDistribution = rows.reduce((acc, pub) => {
        const quartile = pub.journal.quartile;
        acc[quartile] = (acc[quartile] || 0) + 1;
        return acc;
      }, {});

      const avgImpactFactor = rows.reduce((sum, pub) => 
        sum + parseFloat(pub.journal.impactFactor), 0) / rows.length;

      searchStats.distribution = {
        quartiles: quartileDistribution,
        avgImpactFactor: Math.round(avgImpactFactor * 1000) / 1000
      };
    }

    res.json({
      publications: rows,
      searchStats,
      searchCriteria: {
        keyword,
        title,
        authors,
        journalName,
        departmentId,
        publishYear,
        startYear,
        endYear,
        quartile,
        impactFactorMin,
        impactFactorMax,
        category,
        doi,
        pmid,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    throw createError.internal('搜索过程中发生错误');
  }
};

// 快速搜索（简化版，用于搜索框自动补全）
const quickSearch = async (req, res) => {
  const { q: query, type = 'all', limit = 10 } = req.query;

  if (!query || query.trim().length < 2) {
    return res.json({ results: [] });
  }

  const searchTerm = query.trim();
  const results = {};

  try {
    // 权限控制
    const whereClause = {};
    if (req.user.role === 'department_admin') {
      whereClause.departmentId = req.user.departmentId;
    }

    // 搜索文献标题
    if (type === 'all' || type === 'publications') {
      const publications = await Publication.findAll({
        where: {
          ...whereClause,
          title: { [Op.like]: `%${searchTerm}%` }
        },
        include: [
          {
            model: Journal,
            as: 'journal',
            attributes: ['name', 'impactFactor', 'quartile']
          },
          {
            model: Department,
            as: 'department',
            attributes: ['name']
          }
        ],
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']]
      });

      results.publications = publications.map(pub => ({
        id: pub.id,
        title: pub.title,
        authors: pub.authors,
        publishYear: pub.publishYear,
        journal: pub.journal.name,
        department: pub.department.name,
        type: 'publication'
      }));
    }

    // 搜索期刊
    if (type === 'all' || type === 'journals') {
      const journals = await Journal.findAll({
        where: {
          name: { [Op.like]: `%${searchTerm}%` }
        },
        attributes: ['id', 'name', 'impactFactor', 'quartile', 'category'],
        limit: parseInt(limit),
        order: [['impactFactor', 'DESC']]
      });

      results.journals = journals.map(journal => ({
        id: journal.id,
        name: journal.name,
        impactFactor: journal.impactFactor,
        quartile: journal.quartile,
        category: journal.category,
        type: 'journal'
      }));
    }

    // 搜索作者
    if (type === 'all' || type === 'authors') {
      const authors = await Publication.findAll({
        where: {
          ...whereClause,
          authors: { [Op.like]: `%${searchTerm}%` }
        },
        attributes: [
          [Publication.sequelize.fn('DISTINCT', Publication.sequelize.col('authors')), 'authors'],
          [Publication.sequelize.fn('COUNT', Publication.sequelize.col('id')), 'publicationCount']
        ],
        group: ['authors'],
        order: [[Publication.sequelize.fn('COUNT', Publication.sequelize.col('id')), 'DESC']],
        limit: parseInt(limit),
        raw: true
      });

      results.authors = authors.map(author => ({
        name: author.authors,
        publicationCount: parseInt(author.publicationCount),
        type: 'author'
      }));
    }

    res.json({ results });

  } catch (error) {
    console.error('Quick search error:', error);
    throw createError.internal('快速搜索过程中发生错误');
  }
};

// 搜索建议（用于搜索框自动补全）
const getSearchSuggestions = async (req, res) => {
  const { q: query, field = 'title' } = req.query;

  if (!query || query.trim().length < 2) {
    return res.json({ suggestions: [] });
  }

  const searchTerm = query.trim();
  let suggestions = [];

  try {
    // 权限控制
    const whereClause = {};
    if (req.user.role === 'department_admin') {
      whereClause.departmentId = req.user.departmentId;
    }

    switch (field) {
      case 'title':
        const titles = await Publication.findAll({
          where: {
            ...whereClause,
            title: { [Op.like]: `%${searchTerm}%` }
          },
          attributes: ['title'],
          limit: 10,
          order: [['createdAt', 'DESC']]
        });
        suggestions = titles.map(p => p.title);
        break;

      case 'authors':
        const authors = await Publication.findAll({
          where: {
            ...whereClause,
            authors: { [Op.like]: `%${searchTerm}%` }
          },
          attributes: [
            [Publication.sequelize.fn('DISTINCT', Publication.sequelize.col('authors')), 'authors']
          ],
          limit: 10,
          raw: true
        });
        suggestions = authors.map(a => a.authors);
        break;

      case 'journal':
        const journals = await Journal.findAll({
          where: {
            name: { [Op.like]: `%${searchTerm}%` }
          },
          attributes: ['name'],
          limit: 10,
          order: [['impactFactor', 'DESC']]
        });
        suggestions = journals.map(j => j.name);
        break;

      case 'category':
        const categories = await Journal.findAll({
          where: {
            category: { [Op.like]: `%${searchTerm}%` }
          },
          attributes: [
            [Journal.sequelize.fn('DISTINCT', Journal.sequelize.col('category')), 'category']
          ],
          limit: 10,
          raw: true
        });
        suggestions = categories.map(c => c.category);
        break;

      default:
        suggestions = [];
    }

    res.json({ suggestions: [...new Set(suggestions)] }); // 去重

  } catch (error) {
    console.error('Search suggestions error:', error);
    throw createError.internal('获取搜索建议时发生错误');
  }
};

// 保存搜索历史
const saveSearchHistory = async (req, res) => {
  const { query, filters, resultCount } = req.body;

  if (!query || query.trim().length === 0) {
    throw createError.badRequest('搜索查询不能为空');
  }

  try {
    // 这里可以将搜索历史保存到数据库
    // 为了简化，我们暂时只返回成功响应
    res.json({
      message: '搜索历史已保存',
      searchHistory: {
        query: query.trim(),
        filters,
        resultCount,
        userId: req.user.id,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Save search history error:', error);
    throw createError.internal('保存搜索历史时发生错误');
  }
};

// 获取热门搜索词
const getPopularSearches = async (req, res) => {
  try {
    // 这里应该从搜索历史中统计热门搜索词
    // 为了演示，我们返回一些模拟数据
    const popularSearches = [
      { term: '心血管', count: 156 },
      { term: 'Nature', count: 89 },
      { term: '糖尿病', count: 67 },
      { term: 'COVID-19', count: 45 },
      { term: '肿瘤', count: 34 }
    ];

    res.json({ popularSearches });

  } catch (error) {
    console.error('Get popular searches error:', error);
    throw createError.internal('获取热门搜索时发生错误');
  }
};

module.exports = {
  advancedSearch,
  quickSearch,
  getSearchSuggestions,
  saveSearchHistory,
  getPopularSearches
};