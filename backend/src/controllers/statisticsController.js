const { Publication, Journal, Department, User } = require('../models');
const { createError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// 获取科室统计信息
const getDepartmentStatistics = async (req, res) => {
  const { 
    departmentId, 
    startYear, 
    endYear,
    includeDetails = false 
  } = req.query;

  // 权限控制：科室管理员只能查看本科室统计
  let targetDepartmentId = departmentId;
  if (req.user.role === 'department_admin') {
    targetDepartmentId = req.user.departmentId;
  }

  if (!targetDepartmentId) {
    throw createError.badRequest('请指定要查询的科室');
  }

  // 验证科室是否存在
  const department = await Department.findByPk(targetDepartmentId);
  if (!department) {
    throw createError.notFound('指定的科室');
  }

  // 构建查询条件
  const whereClause = {
    departmentId: targetDepartmentId
  };

  // 年份范围筛选
  if (startYear || endYear) {
    whereClause.publishYear = {};
    if (startYear) {
      whereClause.publishYear[Op.gte] = parseInt(startYear);
    }
    if (endYear) {
      whereClause.publishYear[Op.lte] = parseInt(endYear);
    }
  }

  // 基础统计
  const totalCount = await Publication.count({ where: whereClause });

  // 按年份统计
  const yearlyStats = await Publication.findAll({
    where: whereClause,
    attributes: [
      'publishYear',
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count'],
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    group: ['publishYear'],
    order: [['publishYear', 'DESC']],
    raw: true
  });

  // 按分区统计
  const quartileStats = await Publication.findAll({
    where: whereClause,
    attributes: [
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count'],
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: ['quartile']
    }],
    group: ['journal.quartile'],
    order: [['journal.quartile', 'ASC']],
    raw: true
  });

  // 总体平均影响因子
  const avgImpactFactorResult = await Publication.findOne({
    where: whereClause,
    attributes: [
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    raw: true
  });

  const avgImpactFactor = parseFloat(avgImpactFactorResult?.avgIF) || 0;

  // 高影响因子文献统计（IF > 10）
  const highImpactCount = await Publication.count({
    where: whereClause,
    include: [{
      model: Journal,
      as: 'journal',
      where: {
        impactFactor: { [Op.gt]: 10 }
      }
    }]
  });

  // 构建响应数据
  const statistics = {
    department: {
      id: department.id,
      name: department.name,
      code: department.code
    },
    overview: {
      totalPublications: totalCount,
      avgImpactFactor: Math.round(avgImpactFactor * 1000) / 1000,
      highImpactPublications: highImpactCount,
      highImpactRate: totalCount > 0 ? Math.round((highImpactCount / totalCount) * 100) : 0
    },
    yearlyTrend: yearlyStats.map(item => ({
      year: item.publishYear,
      count: parseInt(item.count),
      avgImpactFactor: Math.round(parseFloat(item.avgIF || 0) * 1000) / 1000
    })),
    quartileDistribution: {
      Q1: 0,
      Q2: 0,
      Q3: 0,
      Q4: 0,
      ...quartileStats.reduce((acc, item) => {
        acc[item['journal.quartile']] = {
          count: parseInt(item.count),
          avgImpactFactor: Math.round(parseFloat(item.avgIF || 0) * 1000) / 1000
        };
        return acc;
      }, {})
    }
  };

  // 如果需要详细信息，添加更多统计数据
  if (includeDetails === 'true') {
    // 按期刊类别统计
    const categoryStats = await Publication.findAll({
      where: whereClause,
      attributes: [
        [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count']
      ],
      include: [{
        model: Journal,
        as: 'journal',
        attributes: ['category']
      }],
      group: ['journal.category'],
      order: [[Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // 最近发表的文献
    const recentPublications = await Publication.findAll({
      where: whereClause,
      include: [
        {
          model: Journal,
          as: 'journal',
          attributes: ['name', 'impactFactor', 'quartile']
        },
        {
          model: User,
          as: 'user',
          attributes: ['username']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    statistics.details = {
      categoryDistribution: categoryStats.map(item => ({
        category: item['journal.category'],
        count: parseInt(item.count)
      })),
      recentPublications: recentPublications.map(pub => ({
        id: pub.id,
        title: pub.title,
        authors: pub.authors,
        publishYear: pub.publishYear,
        journal: pub.journal,
        createdBy: pub.user.username,
        createdAt: pub.createdAt
      }))
    };
  }

  res.json(statistics);
};

// 获取多个科室的对比统计
const getDepartmentsComparison = async (req, res) => {
  const { 
    departmentIds, 
    startYear, 
    endYear,
    metric = 'count' // count, avgIF, highImpact
  } = req.query;

  if (!departmentIds) {
    throw createError.badRequest('请指定要对比的科室');
  }

  const deptIds = Array.isArray(departmentIds) 
    ? departmentIds 
    : departmentIds.split(',').map(id => parseInt(id.trim()));

  // 权限控制：科室管理员只能查看本科室
  let allowedDeptIds = deptIds;
  if (req.user.role === 'department_admin') {
    allowedDeptIds = deptIds.filter(id => id === req.user.departmentId);
    if (allowedDeptIds.length === 0) {
      throw createError.forbidden('只能查看本科室的统计数据');
    }
  }

  // 构建查询条件
  const whereClause = {
    departmentId: { [Op.in]: allowedDeptIds }
  };

  if (startYear || endYear) {
    whereClause.publishYear = {};
    if (startYear) {
      whereClause.publishYear[Op.gte] = parseInt(startYear);
    }
    if (endYear) {
      whereClause.publishYear[Op.lte] = parseInt(endYear);
    }
  }

  // 获取科室信息
  const departments = await Department.findAll({
    where: { id: { [Op.in]: allowedDeptIds } },
    attributes: ['id', 'name', 'code']
  });

  // 按科室统计
  const departmentStats = await Publication.findAll({
    where: whereClause,
    attributes: [
      'departmentId',
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count'],
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    group: ['departmentId'],
    raw: true
  });

  // 高影响因子文献统计
  const highImpactStats = await Publication.findAll({
    where: {
      ...whereClause,
      '$journal.impactFactor$': { [Op.gt]: 10 }
    },
    attributes: [
      'departmentId',
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'highImpactCount']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    group: ['departmentId'],
    raw: true
  });

  // 合并统计数据
  const comparisonData = departments.map(dept => {
    const stats = departmentStats.find(s => s.departmentId === dept.id) || {};
    const highImpact = highImpactStats.find(s => s.departmentId === dept.id) || {};
    
    const count = parseInt(stats.count || 0);
    const avgIF = parseFloat(stats.avgIF || 0);
    const highImpactCount = parseInt(highImpact.highImpactCount || 0);

    return {
      department: {
        id: dept.id,
        name: dept.name,
        code: dept.code
      },
      statistics: {
        totalPublications: count,
        avgImpactFactor: Math.round(avgIF * 1000) / 1000,
        highImpactPublications: highImpactCount,
        highImpactRate: count > 0 ? Math.round((highImpactCount / count) * 100) : 0
      }
    };
  });

  // 根据指定指标排序
  const sortKey = {
    'count': 'totalPublications',
    'avgIF': 'avgImpactFactor',
    'highImpact': 'highImpactPublications'
  }[metric] || 'totalPublications';

  comparisonData.sort((a, b) => b.statistics[sortKey] - a.statistics[sortKey]);

  res.json({
    comparison: comparisonData,
    summary: {
      totalDepartments: comparisonData.length,
      totalPublications: comparisonData.reduce((sum, item) => sum + item.statistics.totalPublications, 0),
      avgImpactFactor: Math.round(
        (comparisonData.reduce((sum, item) => sum + item.statistics.avgImpactFactor, 0) / comparisonData.length) * 1000
      ) / 1000,
      sortedBy: metric
    }
  });
};

// 获取年度趋势分析
const getYearlyTrends = async (req, res) => {
  const { 
    departmentId, 
    startYear = new Date().getFullYear() - 5, 
    endYear = new Date().getFullYear() 
  } = req.query;

  // 权限控制
  let targetDepartmentId = departmentId;
  if (req.user.role === 'department_admin') {
    targetDepartmentId = req.user.departmentId;
  }

  const whereClause = {
    publishYear: {
      [Op.between]: [parseInt(startYear), parseInt(endYear)]
    }
  };

  if (targetDepartmentId) {
    whereClause.departmentId = targetDepartmentId;
  }

  // 按年份和分区统计
  const yearlyQuartileStats = await Publication.findAll({
    where: whereClause,
    attributes: [
      'publishYear',
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: ['quartile']
    }],
    group: ['publishYear', 'journal.quartile'],
    order: [['publishYear', 'ASC'], ['journal.quartile', 'ASC']],
    raw: true
  });

  // 按年份统计总数和平均影响因子
  const yearlyTotals = await Publication.findAll({
    where: whereClause,
    attributes: [
      'publishYear',
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'total'],
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    group: ['publishYear'],
    order: [['publishYear', 'ASC']],
    raw: true
  });

  // 组织数据
  const trends = {};
  for (let year = parseInt(startYear); year <= parseInt(endYear); year++) {
    trends[year] = {
      year,
      total: 0,
      avgImpactFactor: 0,
      quartiles: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    };
  }

  // 填充总数和平均影响因子
  yearlyTotals.forEach(item => {
    if (trends[item.publishYear]) {
      trends[item.publishYear].total = parseInt(item.total);
      trends[item.publishYear].avgImpactFactor = Math.round(parseFloat(item.avgIF || 0) * 1000) / 1000;
    }
  });

  // 填充分区数据
  yearlyQuartileStats.forEach(item => {
    if (trends[item.publishYear]) {
      trends[item.publishYear].quartiles[item['journal.quartile']] = parseInt(item.count);
    }
  });

  const trendArray = Object.values(trends);

  res.json({
    trends: trendArray,
    summary: {
      totalYears: trendArray.length,
      totalPublications: trendArray.reduce((sum, item) => sum + item.total, 0),
      avgGrowthRate: calculateGrowthRate(trendArray),
      peakYear: trendArray.reduce((max, item) => item.total > max.total ? item : max, trendArray[0])
    }
  });
};

// 计算增长率
const calculateGrowthRate = (trends) => {
  if (trends.length < 2) return 0;
  
  const validTrends = trends.filter(t => t.total > 0);
  if (validTrends.length < 2) return 0;
  
  const first = validTrends[0];
  const last = validTrends[validTrends.length - 1];
  
  if (first.total === 0) return 0;
  
  const years = last.year - first.year;
  if (years === 0) return 0;
  
  const growthRate = Math.pow(last.total / first.total, 1 / years) - 1;
  return Math.round(growthRate * 100 * 100) / 100; // 保留两位小数的百分比
};

// 获取全院统计概览
const getOverviewStatistics = async (req, res) => {
  const { 
    startYear, 
    endYear,
    includeDetails = false 
  } = req.query;

  // 构建查询条件
  const whereClause = {};
  if (startYear || endYear) {
    whereClause.publishYear = {};
    if (startYear) {
      whereClause.publishYear[Op.gte] = parseInt(startYear);
    }
    if (endYear) {
      whereClause.publishYear[Op.lte] = parseInt(endYear);
    }
  }

  // 基础统计
  const totalPublications = await Publication.count({ where: whereClause });
  const totalDepartments = await Department.count();
  const totalJournals = await Journal.count();

  // 平均影响因子
  const avgImpactFactorResult = await Publication.findOne({
    where: whereClause,
    attributes: [
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    raw: true
  });

  const avgImpactFactor = parseFloat(avgImpactFactorResult?.avgIF) || 0;

  // 高影响因子文献统计
  const highImpactCount = await Publication.count({
    where: whereClause,
    include: [{
      model: Journal,
      as: 'journal',
      where: {
        impactFactor: { [Op.gt]: 10 }
      }
    }]
  });

  // 按分区统计
  const quartileStats = await Publication.findAll({
    where: whereClause,
    attributes: [
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count'],
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: ['quartile']
    }],
    group: ['journal.quartile'],
    order: [['journal.quartile', 'ASC']],
    raw: true
  });

  // 按年份统计
  const yearlyStats = await Publication.findAll({
    where: whereClause,
    attributes: [
      'publishYear',
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count'],
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    group: ['publishYear'],
    order: [['publishYear', 'DESC']],
    limit: 10,
    raw: true
  });

  // 科室排行榜
  const topDepartments = await Publication.findAll({
    where: whereClause,
    attributes: [
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count'],
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Department,
      as: 'department',
      attributes: ['id', 'name', 'code']
    }, {
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    group: ['department.id'],
    order: [[Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'DESC']],
    limit: 10,
    raw: true
  });

  // 构建响应数据
  const overview = {
    summary: {
      totalPublications,
      totalDepartments,
      totalJournals,
      avgImpactFactor: Math.round(avgImpactFactor * 1000) / 1000,
      highImpactPublications: highImpactCount,
      highImpactRate: totalPublications > 0 ? Math.round((highImpactCount / totalPublications) * 100) : 0
    },
    quartileDistribution: {
      Q1: { count: 0, avgImpactFactor: 0 },
      Q2: { count: 0, avgImpactFactor: 0 },
      Q3: { count: 0, avgImpactFactor: 0 },
      Q4: { count: 0, avgImpactFactor: 0 },
      ...quartileStats.reduce((acc, item) => {
        acc[item['journal.quartile']] = {
          count: parseInt(item.count),
          avgImpactFactor: Math.round(parseFloat(item.avgIF || 0) * 1000) / 1000
        };
        return acc;
      }, {})
    },
    yearlyTrend: yearlyStats.map(item => ({
      year: item.publishYear,
      count: parseInt(item.count),
      avgImpactFactor: Math.round(parseFloat(item.avgIF || 0) * 1000) / 1000
    })),
    topDepartments: topDepartments.map(item => ({
      department: {
        id: item['department.id'],
        name: item['department.name'],
        code: item['department.code']
      },
      publicationCount: parseInt(item.count),
      avgImpactFactor: Math.round(parseFloat(item.avgIF || 0) * 1000) / 1000
    }))
  };

  // 如果需要详细信息
  if (includeDetails === 'true') {
    // 期刊类别统计
    const categoryStats = await Publication.findAll({
      where: whereClause,
      attributes: [
        [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count']
      ],
      include: [{
        model: Journal,
        as: 'journal',
        attributes: ['category']
      }],
      group: ['journal.category'],
      order: [[Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'DESC']],
      limit: 15,
      raw: true
    });

    // 最活跃的期刊
    const topJournals = await Publication.findAll({
      where: whereClause,
      attributes: [
        [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count']
      ],
      include: [{
        model: Journal,
        as: 'journal',
        attributes: ['id', 'name', 'impactFactor', 'quartile']
      }],
      group: ['journal.id'],
      order: [[Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // 最近发表的文献
    const recentPublications = await Publication.findAll({
      where: whereClause,
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
        },
        {
          model: User,
          as: 'user',
          attributes: ['username']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    overview.details = {
      categoryDistribution: categoryStats.map(item => ({
        category: item['journal.category'],
        count: parseInt(item.count)
      })),
      topJournals: topJournals.map(item => ({
        journal: {
          id: item['journal.id'],
          name: item['journal.name'],
          impactFactor: item['journal.impactFactor'],
          quartile: item['journal.quartile']
        },
        publicationCount: parseInt(item.count)
      })),
      recentPublications: recentPublications.map(pub => ({
        id: pub.id,
        title: pub.title,
        authors: pub.authors,
        publishYear: pub.publishYear,
        journal: pub.journal,
        department: pub.department.name,
        createdBy: pub.user.username,
        createdAt: pub.createdAt
      }))
    };
  }

  res.json(overview);
};

// 获取实时统计数据（用于仪表板）
const getDashboardStats = async (req, res) => {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  // 当年统计
  const currentYearStats = await Publication.findOne({
    where: { publishYear: currentYear },
    attributes: [
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count'],
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    raw: true
  });

  // 去年统计
  const lastYearStats = await Publication.findOne({
    where: { publishYear: lastYear },
    attributes: [
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count'],
      [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
    ],
    include: [{
      model: Journal,
      as: 'journal',
      attributes: []
    }],
    raw: true
  });

  // 本月新增统计
  const thisMonth = new Date();
  const firstDayOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
  
  const monthlyStats = await Publication.findOne({
    where: {
      createdAt: { [Op.gte]: firstDayOfMonth }
    },
    attributes: [
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('id')), 'count']
    ],
    raw: true
  });

  // 活跃科室统计
  const activeDepartments = await Publication.findAll({
    where: {
      createdAt: { [Op.gte]: firstDayOfMonth }
    },
    attributes: [
      [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count']
    ],
    include: [{
      model: Department,
      as: 'department',
      attributes: ['name']
    }],
    group: ['department.id'],
    order: [[Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'DESC']],
    limit: 5,
    raw: true
  });

  const currentCount = parseInt(currentYearStats?.count || 0);
  const lastCount = parseInt(lastYearStats?.count || 0);
  const growthRate = lastCount > 0 ? Math.round(((currentCount - lastCount) / lastCount) * 100) : 0;

  res.json({
    currentYear: {
      year: currentYear,
      publications: currentCount,
      avgImpactFactor: Math.round(parseFloat(currentYearStats?.avgIF || 0) * 1000) / 1000
    },
    lastYear: {
      year: lastYear,
      publications: lastCount,
      avgImpactFactor: Math.round(parseFloat(lastYearStats?.avgIF || 0) * 1000) / 1000
    },
    growth: {
      rate: growthRate,
      direction: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable'
    },
    thisMonth: {
      newPublications: parseInt(monthlyStats?.count || 0),
      activeDepartments: activeDepartments.map(item => ({
        name: item['department.name'],
        count: parseInt(item.count)
      }))
    }
  });
};

module.exports = {
  getDepartmentStatistics,
  getDepartmentsComparison,
  getYearlyTrends,
  getOverviewStatistics,
  getDashboardStats
};