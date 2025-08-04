const { Publication, Journal, Department, User } = require('../models');
const { createError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

// 导出文献数据为Excel
const exportPublications = async (req, res) => {
  const {
    keyword,
    departmentId,
    journalId,
    publishYear,
    startYear,
    endYear,
    quartile,
    impactFactorMin,
    impactFactorMax,
    format = 'xlsx',
    includeStats = false
  } = req.query;

  // 构建查询条件（复用搜索逻辑）
  const whereClause = {};
  const journalWhere = {};

  // 权限控制：科室管理员只能导出本科室的数据
  if (req.user.role === 'department_admin') {
    whereClause.departmentId = req.user.departmentId;
  } else if (departmentId) {
    whereClause.departmentId = departmentId;
  }

  // 关键词搜索
  if (keyword && keyword.trim()) {
    const keywordTerm = keyword.trim();
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${keywordTerm}%` } },
      { authors: { [Op.like]: `%${keywordTerm}%` } }
    ];
  }

  // 期刊筛选
  if (journalId) {
    whereClause.journalId = journalId;
  }

  // 年份筛选
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

  try {
    // 查询数据
    const publications = await Publication.findAll({
      where: whereClause,
      include: [
        {
          model: Journal,
          as: 'journal',
          where: Object.keys(journalWhere).length > 0 ? journalWhere : undefined,
          attributes: ['name', 'issn', 'impactFactor', 'quartile', 'category', 'publisher']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['name', 'code']
        },
        {
          model: User,
          as: 'user',
          attributes: ['username']
        }
      ],
      order: [['publishYear', 'DESC'], ['createdAt', 'DESC']]
    });

    if (publications.length === 0) {
      throw createError.badRequest('没有找到符合条件的数据');
    }

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('文献数据');

    // 设置列定义
    worksheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '文献标题', key: 'title', width: 50 },
      { header: '作者', key: 'authors', width: 30 },
      { header: '期刊名称', key: 'journalName', width: 30 },
      { header: 'ISSN', key: 'issn', width: 15 },
      { header: '影响因子', key: 'impactFactor', width: 12 },
      { header: '分区', key: 'quartile', width: 8 },
      { header: '期刊类别', key: 'category', width: 25 },
      { header: '出版商', key: 'publisher', width: 20 },
      { header: '科室', key: 'department', width: 15 },
      { header: '发表年份', key: 'publishYear', width: 12 },
      { header: '卷号', key: 'volume', width: 10 },
      { header: '期号', key: 'issue', width: 10 },
      { header: '页码', key: 'pages', width: 15 },
      { header: 'DOI', key: 'doi', width: 30 },
      { header: 'PMID', key: 'pmid', width: 15 },
      { header: '录入人', key: 'createdBy', width: 15 },
      { header: '录入时间', key: 'createdAt', width: 20 }
    ];

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // 添加数据
    publications.forEach((pub, index) => {
      worksheet.addRow({
        index: index + 1,
        title: pub.title,
        authors: pub.authors,
        journalName: pub.journal.name,
        issn: pub.journal.issn,
        impactFactor: pub.journal.impactFactor,
        quartile: pub.journal.quartile,
        category: pub.journal.category,
        publisher: pub.journal.publisher,
        department: pub.department.name,
        publishYear: pub.publishYear,
        volume: pub.volume,
        issue: pub.issue,
        pages: pub.pages,
        doi: pub.doi,
        pmid: pub.pmid,
        createdBy: pub.user.username,
        createdAt: pub.createdAt.toLocaleString('zh-CN')
      });
    });

    // 如果需要包含统计信息
    if (includeStats === 'true') {
      // 添加统计工作表
      const statsWorksheet = workbook.addWorksheet('统计信息');
      
      // 基础统计
      const totalCount = publications.length;
      const avgImpactFactor = publications.reduce((sum, pub) => 
        sum + parseFloat(pub.journal.impactFactor), 0) / totalCount;
      
      // 分区统计
      const quartileStats = publications.reduce((acc, pub) => {
        const quartile = pub.journal.quartile;
        acc[quartile] = (acc[quartile] || 0) + 1;
        return acc;
      }, {});

      // 年份统计
      const yearStats = publications.reduce((acc, pub) => {
        const year = pub.publishYear;
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {});

      // 科室统计
      const deptStats = publications.reduce((acc, pub) => {
        const dept = pub.department.name;
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      // 设置统计表格
      statsWorksheet.columns = [
        { header: '统计项目', key: 'item', width: 20 },
        { header: '数值', key: 'value', width: 15 }
      ];

      // 添加统计数据
      statsWorksheet.addRow({ item: '文献总数', value: totalCount });
      statsWorksheet.addRow({ item: '平均影响因子', value: Math.round(avgImpactFactor * 1000) / 1000 });
      statsWorksheet.addRow({ item: '', value: '' }); // 空行

      // 分区统计
      statsWorksheet.addRow({ item: '分区分布', value: '' });
      Object.entries(quartileStats).forEach(([quartile, count]) => {
        statsWorksheet.addRow({ item: `  ${quartile}区`, value: count });
      });
      statsWorksheet.addRow({ item: '', value: '' }); // 空行

      // 年份统计
      statsWorksheet.addRow({ item: '年份分布', value: '' });
      Object.entries(yearStats)
        .sort(([a], [b]) => b - a)
        .forEach(([year, count]) => {
          statsWorksheet.addRow({ item: `  ${year}年`, value: count });
        });
      statsWorksheet.addRow({ item: '', value: '' }); // 空行

      // 科室统计
      statsWorksheet.addRow({ item: '科室分布', value: '' });
      Object.entries(deptStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([dept, count]) => {
          statsWorksheet.addRow({ item: `  ${dept}`, value: count });
        });

      // 设置统计表头样式
      const statsHeaderRow = statsWorksheet.getRow(1);
      statsHeaderRow.font = { bold: true };
      statsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    // 设置响应头
    const filename = `文献数据导出_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    // 发送文件
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export publications error:', error);
    if (error.isCustomError) {
      throw error;
    }
    throw createError.internal('导出数据时发生错误');
  }
};

// 导出期刊数据
const exportJournals = async (req, res) => {
  const {
    keyword,
    quartile,
    category,
    year,
    impactFactorMin,
    impactFactorMax,
    includeStats = false
  } = req.query;

  // 构建查询条件
  const whereClause = {};

  if (keyword && keyword.trim()) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${keyword.trim()}%` } },
      { category: { [Op.like]: `%${keyword.trim()}%` } }
    ];
  }

  if (quartile) {
    whereClause.quartile = quartile;
  }

  if (category && category.trim()) {
    whereClause.category = { [Op.like]: `%${category.trim()}%` };
  }

  if (year) {
    whereClause.year = parseInt(year);
  }

  if (impactFactorMin || impactFactorMax) {
    whereClause.impactFactor = {};
    if (impactFactorMin) {
      whereClause.impactFactor[Op.gte] = parseFloat(impactFactorMin);
    }
    if (impactFactorMax) {
      whereClause.impactFactor[Op.lte] = parseFloat(impactFactorMax);
    }
  }

  try {
    const journals = await Journal.findAll({
      where: whereClause,
      order: [['impactFactor', 'DESC']]
    });

    if (journals.length === 0) {
      throw createError.badRequest('没有找到符合条件的期刊数据');
    }

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('期刊数据');

    // 设置列定义
    worksheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '期刊名称', key: 'name', width: 40 },
      { header: 'ISSN', key: 'issn', width: 15 },
      { header: '影响因子', key: 'impactFactor', width: 12 },
      { header: '分区', key: 'quartile', width: 8 },
      { header: '期刊类别', key: 'category', width: 30 },
      { header: '出版商', key: 'publisher', width: 25 },
      { header: '数据年份', key: 'year', width: 12 }
    ];

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // 添加数据
    journals.forEach((journal, index) => {
      worksheet.addRow({
        index: index + 1,
        name: journal.name,
        issn: journal.issn,
        impactFactor: journal.impactFactor,
        quartile: journal.quartile,
        category: journal.category,
        publisher: journal.publisher,
        year: journal.year
      });
    });

    // 如果需要包含统计信息
    if (includeStats === 'true') {
      const statsWorksheet = workbook.addWorksheet('统计信息');
      
      const totalCount = journals.length;
      const avgImpactFactor = journals.reduce((sum, journal) => 
        sum + parseFloat(journal.impactFactor), 0) / totalCount;
      
      const quartileStats = journals.reduce((acc, journal) => {
        const quartile = journal.quartile;
        acc[quartile] = (acc[quartile] || 0) + 1;
        return acc;
      }, {});

      statsWorksheet.columns = [
        { header: '统计项目', key: 'item', width: 20 },
        { header: '数值', key: 'value', width: 15 }
      ];

      statsWorksheet.addRow({ item: '期刊总数', value: totalCount });
      statsWorksheet.addRow({ item: '平均影响因子', value: Math.round(avgImpactFactor * 1000) / 1000 });
      statsWorksheet.addRow({ item: '', value: '' });

      statsWorksheet.addRow({ item: '分区分布', value: '' });
      Object.entries(quartileStats).forEach(([quartile, count]) => {
        statsWorksheet.addRow({ item: `  ${quartile}区`, value: count });
      });
    }

    // 设置响应头
    const filename = `期刊数据导出_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    // 发送文件
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export journals error:', error);
    if (error.isCustomError) {
      throw error;
    }
    throw createError.internal('导出期刊数据时发生错误');
  }
};

// 导出统计报告
const exportStatisticsReport = async (req, res) => {
  const {
    departmentId,
    startYear,
    endYear,
    reportType = 'comprehensive' // comprehensive, department, yearly
  } = req.query;

  try {
    // 构建查询条件
    const whereClause = {};
    
    if (req.user.role === 'department_admin') {
      whereClause.departmentId = req.user.departmentId;
    } else if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    if (startYear || endYear) {
      whereClause.publishYear = {};
      if (startYear) {
        whereClause.publishYear[Op.gte] = parseInt(startYear);
      }
      if (endYear) {
        whereClause.publishYear[Op.lte] = parseInt(endYear);
      }
    }

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();

    // 综合统计报告
    if (reportType === 'comprehensive') {
      // 基础统计
      const totalPublications = await Publication.count({ where: whereClause });
      
      // 按科室统计
      const deptStats = await Publication.findAll({
        where: whereClause,
        attributes: [
          [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count'],
          [Publication.sequelize.fn('AVG', Publication.sequelize.col('journal.impactFactor')), 'avgIF']
        ],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['name']
          },
          {
            model: Journal,
            as: 'journal',
            attributes: []
          }
        ],
        group: ['department.id'],
        order: [[Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'DESC']],
        raw: true
      });

      // 按年份统计
      const yearStats = await Publication.findAll({
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
          [Publication.sequelize.fn('COUNT', Publication.sequelize.col('Publication.id')), 'count']
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

      // 创建综合统计工作表
      const summarySheet = workbook.addWorksheet('综合统计');
      summarySheet.columns = [
        { header: '统计项目', key: 'item', width: 25 },
        { header: '数值', key: 'value', width: 15 },
        { header: '备注', key: 'note', width: 30 }
      ];

      summarySheet.addRow({ item: '文献总数', value: totalPublications });
      summarySheet.addRow({ item: '统计时间', value: new Date().toLocaleDateString('zh-CN') });
      summarySheet.addRow({ item: '', value: '', note: '' });

      // 科室统计工作表
      const deptSheet = workbook.addWorksheet('科室统计');
      deptSheet.columns = [
        { header: '科室名称', key: 'department', width: 20 },
        { header: '文献数量', key: 'count', width: 12 },
        { header: '平均影响因子', key: 'avgIF', width: 15 }
      ];

      deptStats.forEach(stat => {
        deptSheet.addRow({
          department: stat['department.name'],
          count: parseInt(stat.count),
          avgIF: Math.round(parseFloat(stat.avgIF || 0) * 1000) / 1000
        });
      });

      // 年度统计工作表
      const yearSheet = workbook.addWorksheet('年度统计');
      yearSheet.columns = [
        { header: '年份', key: 'year', width: 10 },
        { header: '文献数量', key: 'count', width: 12 },
        { header: '平均影响因子', key: 'avgIF', width: 15 }
      ];

      yearStats.forEach(stat => {
        yearSheet.addRow({
          year: stat.publishYear,
          count: parseInt(stat.count),
          avgIF: Math.round(parseFloat(stat.avgIF || 0) * 1000) / 1000
        });
      });

      // 分区统计工作表
      const quartileSheet = workbook.addWorksheet('分区统计');
      quartileSheet.columns = [
        { header: '分区', key: 'quartile', width: 10 },
        { header: '文献数量', key: 'count', width: 12 },
        { header: '占比', key: 'percentage', width: 12 }
      ];

      quartileStats.forEach(stat => {
        const count = parseInt(stat.count);
        const percentage = totalPublications > 0 ? Math.round((count / totalPublications) * 100) : 0;
        quartileSheet.addRow({
          quartile: stat['journal.quartile'],
          count: count,
          percentage: `${percentage}%`
        });
      });
    }

    // 设置响应头
    const filename = `统计报告_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    // 发送文件
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export statistics report error:', error);
    throw createError.internal('导出统计报告时发生错误');
  }
};

module.exports = {
  exportPublications,
  exportJournals,
  exportStatisticsReport
};