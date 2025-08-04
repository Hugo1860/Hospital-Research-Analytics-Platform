const { Publication, Journal, Department, User } = require('../models');
const { createError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const PDFReportGenerator = require('../utils/pdfGenerator');
const ExcelJS = require('exceljs');

// 生成科室年度报告（PDF）
const generateDepartmentReport = async (req, res) => {
  const { 
    departmentId, 
    year = new Date().getFullYear(),
    format = 'pdf'
  } = req.query;

  // 权限控制：科室管理员只能生成本科室报告
  let targetDepartmentId = departmentId;
  if (req.user.role === 'department_admin') {
    targetDepartmentId = req.user.departmentId;
  }

  if (!targetDepartmentId) {
    throw createError.badRequest('请指定要生成报告的科室');
  }

  try {
    // 获取科室信息
    const department = await Department.findByPk(targetDepartmentId);
    if (!department) {
      throw createError.notFound('指定的科室');
    }

    // 查询该科室该年度的文献数据
    const publications = await Publication.findAll({
      where: {
        departmentId: targetDepartmentId,
        publishYear: parseInt(year)
      },
      include: [
        {
          model: Journal,
          as: 'journal',
          attributes: ['name', 'issn', 'impactFactor', 'quartile', 'category']
        },
        {
          model: User,
          as: 'user',
          attributes: ['username']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 计算统计数据
    const totalPublications = publications.length;
    const avgImpactFactor = totalPublications > 0 
      ? publications.reduce((sum, pub) => sum + parseFloat(pub.journal.impactFactor), 0) / totalPublications
      : 0;

    // 分区统计
    const quartileStats = publications.reduce((acc, pub) => {
      const quartile = pub.journal.quartile;
      acc[quartile] = (acc[quartile] || 0) + 1;
      return acc;
    }, { Q1: 0, Q2: 0, Q3: 0, Q4: 0 });

    // 高影响因子文献统计
    const highImpactCount = publications.filter(pub => 
      parseFloat(pub.journal.impactFactor) > 10
    ).length;

    // 期刊类别统计
    const categoryStats = publications.reduce((acc, pub) => {
      const category = pub.journal.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // 月度发表趋势（按创建时间）
    const monthlyStats = publications.reduce((acc, pub) => {
      const month = pub.createdAt.getMonth() + 1;
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    if (format === 'pdf') {
      // 生成PDF报告
      const pdfGenerator = new PDFReportGenerator();

      // 报告标题
      pdfGenerator
        .addTitle(`${department.name} ${year}年度科研发表报告`)
        .addSubtitle(`生成时间: ${new Date().toLocaleDateString('zh-CN')}`)
        .addSeparator();

      // 概览统计卡片
      const overviewCards = [
        {
          title: '发表总数',
          value: totalPublications,
          description: '篇',
          backgroundColor: '#e3f2fd'
        },
        {
          title: '平均影响因子',
          value: Math.round(avgImpactFactor * 1000) / 1000,
          description: 'IF',
          backgroundColor: '#f3e5f5'
        },
        {
          title: '高影响因子',
          value: highImpactCount,
          description: 'IF>10',
          backgroundColor: '#e8f5e8'
        },
        {
          title: 'Q1期刊',
          value: quartileStats.Q1,
          description: '篇',
          backgroundColor: '#fff3e0'
        }
      ];

      pdfGenerator.addStatCards(overviewCards);

      // 分区分布表格
      pdfGenerator
        .checkPageBreak(150)
        .addParagraph('期刊分区分布', 14)
        .addTable(
          ['分区', '文献数量', '占比', '平均影响因子'],
          [
            ['Q1', quartileStats.Q1, `${Math.round(quartileStats.Q1/totalPublications*100) || 0}%`, 
             Math.round(publications.filter(p => p.journal.quartile === 'Q1')
               .reduce((sum, p) => sum + parseFloat(p.journal.impactFactor), 0) / (quartileStats.Q1 || 1) * 1000) / 1000],
            ['Q2', quartileStats.Q2, `${Math.round(quartileStats.Q2/totalPublications*100) || 0}%`,
             Math.round(publications.filter(p => p.journal.quartile === 'Q2')
               .reduce((sum, p) => sum + parseFloat(p.journal.impactFactor), 0) / (quartileStats.Q2 || 1) * 1000) / 1000],
            ['Q3', quartileStats.Q3, `${Math.round(quartileStats.Q3/totalPublications*100) || 0}%`,
             Math.round(publications.filter(p => p.journal.quartile === 'Q3')
               .reduce((sum, p) => sum + parseFloat(p.journal.impactFactor), 0) / (quartileStats.Q3 || 1) * 1000) / 1000],
            ['Q4', quartileStats.Q4, `${Math.round(quartileStats.Q4/totalPublications*100) || 0}%`,
             Math.round(publications.filter(p => p.journal.quartile === 'Q4')
               .reduce((sum, p) => sum + parseFloat(p.journal.impactFactor), 0) / (quartileStats.Q4 || 1) * 1000) / 1000]
          ],
          { columnWidths: [80, 80, 80, 120] }
        );

      // 分区分布柱状图
      const quartileChartData = [
        { label: 'Q1', value: quartileStats.Q1 },
        { label: 'Q2', value: quartileStats.Q2 },
        { label: 'Q3', value: quartileStats.Q3 },
        { label: 'Q4', value: quartileStats.Q4 }
      ];

      pdfGenerator
        .checkPageBreak(250)
        .addBarChart(quartileChartData, {
          title: '期刊分区分布图',
          barColor: '#4CAF50'
        });

      // 热门期刊类别
      const topCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      if (topCategories.length > 0) {
        pdfGenerator
          .checkPageBreak(200)
          .addParagraph('热门期刊类别 (Top 5)', 14)
          .addTable(
            ['期刊类别', '文献数量', '占比'],
            topCategories.map(([category, count]) => [
              category,
              count,
              `${Math.round(count/totalPublications*100)}%`
            ]),
            { columnWidths: [250, 100, 100] }
          );
      }

      // 代表性文献列表（影响因子最高的前10篇）
      const topPublications = publications
        .sort((a, b) => parseFloat(b.journal.impactFactor) - parseFloat(a.journal.impactFactor))
        .slice(0, 10);

      if (topPublications.length > 0) {
        pdfGenerator
          .addPage()
          .addParagraph('代表性文献 (按影响因子排序)', 14)
          .addTable(
            ['序号', '文献标题', '期刊', '影响因子', '分区'],
            topPublications.map((pub, index) => [
              index + 1,
              pub.title.length > 50 ? pub.title.substring(0, 50) + '...' : pub.title,
              pub.journal.name.length > 20 ? pub.journal.name.substring(0, 20) + '...' : pub.journal.name,
              pub.journal.impactFactor,
              pub.journal.quartile
            ]),
            { 
              columnWidths: [30, 200, 120, 60, 40],
              fontSize: 8
            }
          );
      }

      // 添加页脚
      pdfGenerator.addFooter(`${department.name} ${year}年度科研发表报告 - 第 {pageNumber} 页`);

      // 设置响应头
      const filename = `${department.name}_${year}年度报告.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      // 发送PDF
      const pdfDoc = pdfGenerator.pipe(res);
      pdfDoc.end();

    } else {
      // 返回JSON数据
      res.json({
        department: {
          id: department.id,
          name: department.name,
          code: department.code
        },
        year: parseInt(year),
        overview: {
          totalPublications,
          avgImpactFactor: Math.round(avgImpactFactor * 1000) / 1000,
          highImpactCount,
          highImpactRate: totalPublications > 0 ? Math.round((highImpactCount / totalPublications) * 100) : 0
        },
        quartileDistribution: quartileStats,
        categoryDistribution: categoryStats,
        monthlyTrend: monthlyStats,
        topPublications: topPublications.slice(0, 10).map(pub => ({
          id: pub.id,
          title: pub.title,
          authors: pub.authors,
          journal: pub.journal.name,
          impactFactor: pub.journal.impactFactor,
          quartile: pub.journal.quartile
        })),
        generatedAt: new Date()
      });
    }

  } catch (error) {
    console.error('Generate department report error:', error);
    if (error.isCustomError) {
      throw error;
    }
    throw createError.internal('生成科室报告时发生错误');
  }
};

// 生成全院年度报告
const generateHospitalReport = async (req, res) => {
  const { 
    year = new Date().getFullYear(),
    format = 'pdf'
  } = req.query;

  try {
    // 查询该年度的所有文献数据
    const publications = await Publication.findAll({
      where: {
        publishYear: parseInt(year)
      },
      include: [
        {
          model: Journal,
          as: 'journal',
          attributes: ['name', 'issn', 'impactFactor', 'quartile', 'category']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['name', 'code']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 基础统计
    const totalPublications = publications.length;
    const avgImpactFactor = totalPublications > 0 
      ? publications.reduce((sum, pub) => sum + parseFloat(pub.journal.impactFactor), 0) / totalPublications
      : 0;

    // 科室统计
    const departmentStats = publications.reduce((acc, pub) => {
      const deptName = pub.department.name;
      if (!acc[deptName]) {
        acc[deptName] = {
          count: 0,
          totalIF: 0,
          quartiles: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
        };
      }
      acc[deptName].count++;
      acc[deptName].totalIF += parseFloat(pub.journal.impactFactor);
      acc[deptName].quartiles[pub.journal.quartile]++;
      return acc;
    }, {});

    // 转换为数组并排序
    const departmentRanking = Object.entries(departmentStats)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgIF: Math.round((stats.totalIF / stats.count) * 1000) / 1000,
        quartiles: stats.quartiles
      }))
      .sort((a, b) => b.count - a.count);

    // 全院分区统计
    const quartileStats = publications.reduce((acc, pub) => {
      const quartile = pub.journal.quartile;
      acc[quartile] = (acc[quartile] || 0) + 1;
      return acc;
    }, { Q1: 0, Q2: 0, Q3: 0, Q4: 0 });

    if (format === 'pdf') {
      // 生成PDF报告
      const pdfGenerator = new PDFReportGenerator();

      // 报告标题
      pdfGenerator
        .addTitle(`医院 ${year}年度科研发表报告`)
        .addSubtitle(`生成时间: ${new Date().toLocaleDateString('zh-CN')}`)
        .addSeparator();

      // 全院概览
      const overviewCards = [
        {
          title: '发表总数',
          value: totalPublications,
          description: '篇',
          backgroundColor: '#e3f2fd'
        },
        {
          title: '参与科室',
          value: departmentRanking.length,
          description: '个',
          backgroundColor: '#f3e5f5'
        },
        {
          title: '平均影响因子',
          value: Math.round(avgImpactFactor * 1000) / 1000,
          description: 'IF',
          backgroundColor: '#e8f5e8'
        },
        {
          title: 'Q1期刊占比',
          value: `${Math.round(quartileStats.Q1/totalPublications*100) || 0}%`,
          description: 'Q1',
          backgroundColor: '#fff3e0'
        }
      ];

      pdfGenerator.addStatCards(overviewCards);

      // 科室排行榜
      pdfGenerator
        .checkPageBreak(300)
        .addParagraph('科室发表排行榜', 14)
        .addTable(
          ['排名', '科室名称', '发表数量', '平均影响因子', 'Q1期刊数'],
          departmentRanking.slice(0, 10).map((dept, index) => [
            index + 1,
            dept.name,
            dept.count,
            dept.avgIF,
            dept.quartiles.Q1
          ]),
          { columnWidths: [40, 150, 80, 100, 80] }
        );

      // 全院分区分布图
      const quartileChartData = [
        { label: 'Q1', value: quartileStats.Q1 },
        { label: 'Q2', value: quartileStats.Q2 },
        { label: 'Q3', value: quartileStats.Q3 },
        { label: 'Q4', value: quartileStats.Q4 }
      ];

      pdfGenerator
        .checkPageBreak(250)
        .addBarChart(quartileChartData, {
          title: '全院期刊分区分布',
          barColor: '#2196F3'
        });

      // 设置响应头
      const filename = `医院_${year}年度报告.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      // 发送PDF
      const pdfDoc = pdfGenerator.pipe(res);
      pdfDoc.end();

    } else {
      // 返回JSON数据
      res.json({
        year: parseInt(year),
        overview: {
          totalPublications,
          totalDepartments: departmentRanking.length,
          avgImpactFactor: Math.round(avgImpactFactor * 1000) / 1000
        },
        quartileDistribution: quartileStats,
        departmentRanking,
        generatedAt: new Date()
      });
    }

  } catch (error) {
    console.error('Generate hospital report error:', error);
    throw createError.internal('生成全院报告时发生错误');
  }
};

// 生成自定义报告
const generateCustomReport = async (req, res) => {
  const {
    title = '自定义报告',
    departmentIds,
    startYear,
    endYear,
    includeCharts = true,
    format = 'pdf'
  } = req.body;

  try {
    // 构建查询条件
    const whereClause = {};
    
    if (departmentIds && departmentIds.length > 0) {
      whereClause.departmentId = { [Op.in]: departmentIds };
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

    // 查询数据
    const publications = await Publication.findAll({
      where: whereClause,
      include: [
        {
          model: Journal,
          as: 'journal',
          attributes: ['name', 'impactFactor', 'quartile', 'category']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['name']
        }
      ]
    });

    // 生成统计数据
    const stats = {
      totalPublications: publications.length,
      avgImpactFactor: publications.length > 0 
        ? publications.reduce((sum, pub) => sum + parseFloat(pub.journal.impactFactor), 0) / publications.length
        : 0,
      quartileStats: publications.reduce((acc, pub) => {
        acc[pub.journal.quartile] = (acc[pub.journal.quartile] || 0) + 1;
        return acc;
      }, { Q1: 0, Q2: 0, Q3: 0, Q4: 0 })
    };

    if (format === 'pdf') {
      const pdfGenerator = new PDFReportGenerator();
      
      pdfGenerator
        .addTitle(title)
        .addSubtitle(`报告期间: ${startYear || '不限'} - ${endYear || '不限'}`)
        .addSubtitle(`生成时间: ${new Date().toLocaleDateString('zh-CN')}`)
        .addSeparator();

      // 基础统计
      const cards = [
        { title: '文献总数', value: stats.totalPublications, description: '篇' },
        { title: '平均影响因子', value: Math.round(stats.avgImpactFactor * 1000) / 1000, description: 'IF' }
      ];

      pdfGenerator.addStatCards(cards);

      // 如果包含图表
      if (includeCharts) {
        const chartData = [
          { label: 'Q1', value: stats.quartileStats.Q1 },
          { label: 'Q2', value: stats.quartileStats.Q2 },
          { label: 'Q3', value: stats.quartileStats.Q3 },
          { label: 'Q4', value: stats.quartileStats.Q4 }
        ];

        pdfGenerator.addBarChart(chartData, { title: '期刊分区分布' });
      }

      const filename = `${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      const pdfDoc = pdfGenerator.pipe(res);
      pdfDoc.end();

    } else {
      res.json({
        title,
        period: { startYear, endYear },
        statistics: stats,
        generatedAt: new Date()
      });
    }

  } catch (error) {
    console.error('Generate custom report error:', error);
    throw createError.internal('生成自定义报告时发生错误');
  }
};

// 生成Excel格式的详细报告
const generateExcelReport = async (req, res) => {
  const {
    reportType = 'department', // department, hospital, custom
    departmentId,
    year = new Date().getFullYear(),
    startYear,
    endYear,
    includeDetails = true
  } = req.query;

  try {
    let whereClause = {};
    let reportTitle = '';
    let filename = '';

    // 根据报告类型构建查询条件
    if (reportType === 'department') {
      let targetDepartmentId = departmentId;
      if (req.user.role === 'department_admin') {
        targetDepartmentId = req.user.departmentId;
      }

      if (!targetDepartmentId) {
        throw createError.badRequest('请指定要生成报告的科室');
      }

      const department = await Department.findByPk(targetDepartmentId);
      if (!department) {
        throw createError.notFound('指定的科室');
      }

      whereClause.departmentId = targetDepartmentId;
      whereClause.publishYear = parseInt(year);
      reportTitle = `${department.name} ${year}年度科研发表报告`;
      filename = `${department.name}_${year}年度报告.xlsx`;

    } else if (reportType === 'hospital') {
      whereClause.publishYear = parseInt(year);
      reportTitle = `医院 ${year}年度科研发表报告`;
      filename = `医院_${year}年度报告.xlsx`;

    } else if (reportType === 'custom') {
      if (startYear || endYear) {
        whereClause.publishYear = {};
        if (startYear) whereClause.publishYear[Op.gte] = parseInt(startYear);
        if (endYear) whereClause.publishYear[Op.lte] = parseInt(endYear);
      }
      reportTitle = `自定义科研发表报告`;
      filename = `自定义报告_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    // 查询数据
    const publications = await Publication.findAll({
      where: whereClause,
      include: [
        {
          model: Journal,
          as: 'journal',
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

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    
    // 设置工作簿属性
    workbook.creator = '协和医院SCI期刊分析系统';
    workbook.lastModifiedBy = req.user.username;
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. 报告概览工作表
    const summarySheet = workbook.addWorksheet('报告概览');
    
    // 设置概览表头
    summarySheet.columns = [
      { header: '项目', key: 'item', width: 25 },
      { header: '数值', key: 'value', width: 20 },
      { header: '说明', key: 'description', width: 30 }
    ];

    // 计算统计数据
    const totalPublications = publications.length;
    const avgImpactFactor = totalPublications > 0 
      ? publications.reduce((sum, pub) => sum + parseFloat(pub.journal.impactFactor), 0) / totalPublications
      : 0;

    const quartileStats = publications.reduce((acc, pub) => {
      acc[pub.journal.quartile] = (acc[pub.journal.quartile] || 0) + 1;
      return acc;
    }, { Q1: 0, Q2: 0, Q3: 0, Q4: 0 });

    const highImpactCount = publications.filter(pub => 
      parseFloat(pub.journal.impactFactor) > 10
    ).length;

    // 添加概览数据
    const summaryData = [
      { item: '报告标题', value: reportTitle, description: '本报告的标题' },
      { item: '生成时间', value: new Date().toLocaleString('zh-CN'), description: '报告生成的时间' },
      { item: '统计期间', value: year || `${startYear || '不限'} - ${endYear || '不限'}`, description: '数据统计的时间范围' },
      { item: '', value: '', description: '' }, // 空行
      { item: '文献总数', value: totalPublications, description: '统计期间内的文献发表总数' },
      { item: '平均影响因子', value: Math.round(avgImpactFactor * 1000) / 1000, description: '所有文献的平均影响因子' },
      { item: '高影响因子文献', value: highImpactCount, description: '影响因子大于10的文献数量' },
      { item: '高影响因子占比', value: `${Math.round(highImpactCount/totalPublications*100) || 0}%`, description: '高影响因子文献占总数的比例' },
      { item: '', value: '', description: '' }, // 空行
      { item: 'Q1期刊文献', value: quartileStats.Q1, description: 'Q1分区期刊发表的文献数量' },
      { item: 'Q2期刊文献', value: quartileStats.Q2, description: 'Q2分区期刊发表的文献数量' },
      { item: 'Q3期刊文献', value: quartileStats.Q3, description: 'Q3分区期刊发表的文献数量' },
      { item: 'Q4期刊文献', value: quartileStats.Q4, description: 'Q4分区期刊发表的文献数量' }
    ];

    summaryData.forEach(row => {
      summarySheet.addRow(row);
    });

    // 设置概览表样式
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 2. 详细数据工作表
    if (includeDetails === 'true') {
      const detailSheet = workbook.addWorksheet('详细数据');
      
      detailSheet.columns = [
        { header: '序号', key: 'index', width: 8 },
        { header: '文献标题', key: 'title', width: 50 },
        { header: '作者', key: 'authors', width: 30 },
        { header: '期刊名称', key: 'journalName', width: 30 },
        { header: 'ISSN', key: 'issn', width: 15 },
        { header: '影响因子', key: 'impactFactor', width: 12 },
        { header: '分区', key: 'quartile', width: 8 },
        { header: '期刊类别', key: 'category', width: 25 },
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

      // 添加详细数据
      publications.forEach((pub, index) => {
        detailSheet.addRow({
          index: index + 1,
          title: pub.title,
          authors: pub.authors,
          journalName: pub.journal.name,
          issn: pub.journal.issn,
          impactFactor: pub.journal.impactFactor,
          quartile: pub.journal.quartile,
          category: pub.journal.category,
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

      // 设置详细数据表样式
      const headerRow = detailSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // 3. 统计分析工作表
    const statsSheet = workbook.addWorksheet('统计分析');
    
    // 分区统计
    statsSheet.addRow(['期刊分区统计']);
    statsSheet.addRow(['分区', '文献数量', '占比', '累计占比']);
    
    let cumulativeCount = 0;
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(quartile => {
      const count = quartileStats[quartile];
      const percentage = totalPublications > 0 ? Math.round(count/totalPublications*100) : 0;
      cumulativeCount += count;
      const cumulativePercentage = totalPublications > 0 ? Math.round(cumulativeCount/totalPublications*100) : 0;
      
      statsSheet.addRow([quartile, count, `${percentage}%`, `${cumulativePercentage}%`]);
    });

    statsSheet.addRow([]); // 空行

    // 科室统计（如果是全院报告）
    if (reportType === 'hospital') {
      const deptStats = publications.reduce((acc, pub) => {
        const deptName = pub.department.name;
        if (!acc[deptName]) {
          acc[deptName] = { count: 0, totalIF: 0 };
        }
        acc[deptName].count++;
        acc[deptName].totalIF += parseFloat(pub.journal.impactFactor);
        return acc;
      }, {});

      const deptRanking = Object.entries(deptStats)
        .map(([name, stats]) => ({
          name,
          count: stats.count,
          avgIF: Math.round((stats.totalIF / stats.count) * 1000) / 1000
        }))
        .sort((a, b) => b.count - a.count);

      statsSheet.addRow(['科室发表统计']);
      statsSheet.addRow(['科室名称', '发表数量', '平均影响因子', '占比']);
      
      deptRanking.forEach(dept => {
        const percentage = Math.round(dept.count/totalPublications*100);
        statsSheet.addRow([dept.name, dept.count, dept.avgIF, `${percentage}%`]);
      });
    }

    // 期刊类别统计
    const categoryStats = publications.reduce((acc, pub) => {
      const category = pub.journal.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const topCategories = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    if (topCategories.length > 0) {
      statsSheet.addRow([]); // 空行
      statsSheet.addRow(['热门期刊类别 (Top 10)']);
      statsSheet.addRow(['期刊类别', '文献数量', '占比']);
      
      topCategories.forEach(([category, count]) => {
        const percentage = Math.round(count/totalPublications*100);
        statsSheet.addRow([category, count, `${percentage}%`]);
      });
    }

    // 设置统计表样式
    statsSheet.getRow(1).font = { bold: true, size: 14 };
    statsSheet.getRow(2).font = { bold: true };
    statsSheet.getRow(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 4. 图表数据工作表（为Excel图表提供数据）
    const chartDataSheet = workbook.addWorksheet('图表数据');
    
    // 分区分布数据
    chartDataSheet.addRow(['分区分布数据']);
    chartDataSheet.addRow(['分区', '数量']);
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(quartile => {
      chartDataSheet.addRow([quartile, quartileStats[quartile]]);
    });

    // 设置响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    // 发送Excel文件
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Generate Excel report error:', error);
    if (error.isCustomError) {
      throw error;
    }
    throw createError.internal('生成Excel报告时发生错误');
  }
};

// 生成报告模板
const generateReportTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // 创建报告配置工作表
    const configSheet = workbook.addWorksheet('报告配置');
    
    configSheet.columns = [
      { header: '配置项', key: 'item', width: 20 },
      { header: '值', key: 'value', width: 30 },
      { header: '说明', key: 'description', width: 40 }
    ];

    const configData = [
      { item: '报告类型', value: 'department/hospital/custom', description: '选择报告类型：科室报告/全院报告/自定义报告' },
      { item: '科室ID', value: '', description: '科室报告时填写科室ID，全院报告时留空' },
      { item: '开始年份', value: '', description: '统计开始年份，如：2023' },
      { item: '结束年份', value: '', description: '统计结束年份，如：2023' },
      { item: '包含详细数据', value: 'true/false', description: '是否包含详细的文献数据' },
      { item: '包含图表', value: 'true/false', description: '是否包含统计图表' }
    ];

    configData.forEach(row => {
      configSheet.addRow(row);
    });

    // 设置样式
    const headerRow = configSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 创建说明工作表
    const instructionSheet = workbook.addWorksheet('使用说明');
    
    const instructions = [
      '报告生成模板使用说明',
      '',
      '1. 在"报告配置"工作表中填写相应的配置信息',
      '2. 报告类型说明：',
      '   - department: 生成单个科室的年度报告',
      '   - hospital: 生成全院的年度报告',
      '   - custom: 生成自定义时间范围的报告',
      '',
      '3. 科室ID获取方式：',
      '   - 可通过系统的科室管理页面查看',
      '   - 或联系系统管理员获取',
      '',
      '4. 年份格式：',
      '   - 使用4位数字，如：2023',
      '   - 开始年份和结束年份可以相同（单年度报告）',
      '',
      '5. 布尔值设置：',
      '   - true: 是/包含',
      '   - false: 否/不包含',
      '',
      '6. 配置完成后，将此文件上传到系统进行报告生成'
    ];

    instructions.forEach((instruction, index) => {
      const row = instructionSheet.addRow([instruction]);
      if (index === 0) {
        row.font = { bold: true, size: 14 };
      }
    });

    // 设置响应头
    const filename = '报告生成模板.xlsx';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    // 发送模板文件
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Generate report template error:', error);
    throw createError.internal('生成报告模板时发生错误');
  }
};

module.exports = {
  generateDepartmentReport,
  generateHospitalReport,
  generateCustomReport,
  generateExcelReport,
  generateReportTemplate
};