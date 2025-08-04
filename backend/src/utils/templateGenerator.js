const ExcelJS = require('exceljs');
const path = require('path');

/**
 * 协和医院期刊导入模板生成器
 * 增强版本，支持更丰富的模板内容和格式
 */
class TemplateGenerator {
  
  /**
   * 生成协和医院文献导入模板
   */
  static async generatePublicationTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('文献导入模板');

    // 设置工作簿属性
    workbook.creator = '协和医院SCI期刊分析系统';
    workbook.lastModifiedBy = '系统';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 定义协和医院模板列
    const columns = [
      { header: 'WOS号', key: 'wosNumber', width: 20 },
      { header: '文章标题', key: 'title', width: 50 },
      { header: '作者', key: 'authors', width: 40 },
      { header: '文献类型', key: 'documentType', width: 15 },
      { header: '期刊名称', key: 'journalName', width: 40 },
      { header: '期刊简称', key: 'journalAbbreviation', width: 25 },
      { header: 'ISSN', key: 'issn', width: 15 },
      { header: '年', key: 'publishYear', width: 10 },
      { header: '卷', key: 'volume', width: 10 },
      { header: '期', key: 'issue', width: 10 },
      { header: '地址', key: 'address', width: 60 },
      { header: '页码', key: 'pages', width: 15 },
      { header: 'DOI', key: 'doi', width: 30 },
      { header: 'PMID', key: 'pmid', width: 15 },
      { header: '科室', key: 'departmentName', width: 20 }
    ];

    // 设置列
    worksheet.columns = columns;

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 设置边框
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // 添加示例数据行
    const sampleData = {
      wosNumber: 'WOS:000123456789',
      title: '示例文献标题：协和医院SCI研究成果',
      authors: '张三, 李四, 王五',
      documentType: 'Article',
      journalName: 'Nature Medicine',
      journalAbbreviation: 'Nat Med',
      issn: '1078-8956',
      publishYear: 2024,
      volume: '30',
      issue: '1',
      address: '北京协和医院, 北京市, 中国',
      pages: '123-130',
      doi: '10.1038/s41591-024-12345-6',
      pmid: '38123456',
      departmentName: '心内科'
    };

    const sampleRow = worksheet.addRow(sampleData);
    sampleRow.height = 20;
    sampleRow.font = { color: { argb: 'FF666666' }, italic: true };
    
    // 为示例行设置边框
    sampleRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // 添加说明工作表
    const instructionSheet = workbook.addWorksheet('导入说明');
    
    const instructions = [
      ['协和医院SCI期刊分析系统 - 文献导入模板说明'],
      [''],
      ['重要提示：'],
      ['1. 请严格按照模板格式填写数据，不要修改表头名称'],
      ['2. 必填字段：文章标题、作者、期刊名称、年、科室'],
      ['3. 建议填写字段：WOS号、文献类型、ISSN、DOI等'],
      [''],
      ['字段说明：'],
      ['WOS号', 'Web of Science数据库中的唯一标识符'],
      ['文章标题', '文献的完整标题'],
      ['作者', '所有作者姓名，用逗号分隔'],
      ['文献类型', '如：Article, Review, Letter等'],
      ['期刊名称', '期刊的完整名称'],
      ['期刊简称', '期刊的标准简称'],
      ['ISSN', '期刊的国际标准刊号，格式：XXXX-XXXX'],
      ['年', '发表年份，如：2024'],
      ['卷', '期刊卷号'],
      ['期', '期刊期号'],
      ['地址', '作者单位地址信息'],
      ['页码', '文献页码范围，如：123-130'],
      ['DOI', '数字对象标识符'],
      ['PMID', 'PubMed数据库ID'],
      ['科室', '发表文献的科室名称'],
      [''],
      ['注意事项：'],
      ['1. 系统会自动匹配期刊信息（影响因子、分区等）'],
      ['2. 如果期刊匹配失败，请检查期刊名称是否正确'],
      ['3. 科室名称必须与系统中的科室名称一致'],
      ['4. 年份必须在1900-当前年份之间'],
      ['5. ISSN格式必须为：XXXX-XXXX'],
      ['6. DOI格式必须以10.开头'],
      ['7. PMID必须为纯数字'],
      [''],
      ['支持的文件格式：'],
      ['- Excel文件（.xlsx, .xls）'],
      ['- CSV文件（.csv）'],
      [''],
      ['如有问题，请联系系统管理员。']
    ];

    instructions.forEach((instruction, index) => {
      const row = instructionSheet.addRow(instruction);
      if (index === 0) {
        // 标题行
        row.font = { bold: true, size: 16, color: { argb: 'FF4472C4' } };
        row.height = 30;
      } else if (instruction[0] && (
        instruction[0].includes('重要提示') || 
        instruction[0].includes('字段说明') || 
        instruction[0].includes('注意事项') ||
        instruction[0].includes('支持的文件格式')
      )) {
        // 章节标题
        row.font = { bold: true, size: 14, color: { argb: 'FF2F5597' } };
        row.height = 25;
      } else if (instruction.length === 2 && instruction[1]) {
        // 字段说明行
        row.getCell(1).font = { bold: true };
        row.getCell(2).font = { color: { argb: 'FF666666' } };
      }
    });

    // 设置说明工作表列宽
    instructionSheet.getColumn(1).width = 20;
    instructionSheet.getColumn(2).width = 60;

    return workbook;
  }

  /**
   * 生成期刊信息导入模板
   */
  static async generateJournalTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('期刊导入模板');

    // 设置工作簿属性
    workbook.creator = '协和医院SCI期刊分析系统';
    workbook.lastModifiedBy = '系统';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 定义期刊模板列
    const columns = [
      { header: '期刊名称*', key: 'name', width: 50 },
      { header: 'ISSN', key: 'issn', width: 15 },
      { header: '影响因子*', key: 'impactFactor', width: 15 },
      { header: '分区*', key: 'quartile', width: 10 },
      { header: '学科分类*', key: 'category', width: 30 },
      { header: '出版商', key: 'publisher', width: 30 },
      { header: '年份*', key: 'year', width: 10 }
    ];

    // 设置列
    worksheet.columns = columns;

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 设置边框
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // 添加示例数据
    const sampleData = [
      {
        name: 'Nature',
        issn: '0028-0836',
        impactFactor: 64.8,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
        publisher: 'Nature Publishing Group',
        year: 2024
      },
      {
        name: 'Science',
        issn: '0036-8075',
        impactFactor: 56.9,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
        publisher: 'American Association for the Advancement of Science',
        year: 2024
      }
    ];

    sampleData.forEach(data => {
      const row = worksheet.addRow(data);
      row.height = 20;
      row.font = { color: { argb: 'FF666666' }, italic: true };
      
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // 添加说明工作表
    const instructionSheet = workbook.addWorksheet('导入说明');
    
    const instructions = [
      ['协和医院SCI期刊分析系统 - 期刊导入模板说明'],
      [''],
      ['重要提示：'],
      ['1. 请严格按照模板格式填写数据，不要修改表头名称'],
      ['2. 必填字段：期刊名称、影响因子、分区、学科分类、年份'],
      ['3. 可选字段：ISSN、出版商'],
      [''],
      ['字段说明：'],
      ['期刊名称', '期刊的完整名称，必须准确'],
      ['ISSN', '国际标准刊号，格式：XXXX-XXXX'],
      ['影响因子', '期刊影响因子，必须是0-100之间的数字'],
      ['分区', '期刊分区，只支持Q1、Q2、Q3、Q4'],
      ['学科分类', '期刊所属学科分类'],
      ['出版商', '期刊出版商名称'],
      ['年份', '数据对应年份，如：2024'],
      [''],
      ['注意事项：'],
      ['1. 影响因子必须是数字格式，范围0-100'],
      ['2. 分区只能填写Q1、Q2、Q3、Q4中的一个'],
      ['3. ISSN格式必须为：XXXX-XXXX'],
      ['4. 年份必须在1900-当前年份之间'],
      ['5. 期刊名称不能重复（同一年份）'],
      ['6. 如果提供ISSN，同一年份不能重复'],
      [''],
      ['支持的文件格式：'],
      ['- Excel文件（.xlsx, .xls）'],
      ['- CSV文件（.csv）'],
      [''],
      ['如有问题，请联系系统管理员。']
    ];

    instructions.forEach((instruction, index) => {
      const row = instructionSheet.addRow(instruction);
      if (index === 0) {
        // 标题行
        row.font = { bold: true, size: 16, color: { argb: 'FF70AD47' } };
        row.height = 30;
      } else if (instruction[0] && (
        instruction[0].includes('重要提示') || 
        instruction[0].includes('字段说明') || 
        instruction[0].includes('注意事项') ||
        instruction[0].includes('支持的文件格式')
      )) {
        // 章节标题
        row.font = { bold: true, size: 14, color: { argb: 'FF2F5597' } };
        row.height = 25;
      } else if (instruction.length === 2 && instruction[1]) {
        // 字段说明行
        row.getCell(1).font = { bold: true };
        row.getCell(2).font = { color: { argb: 'FF666666' } };
      }
    });

    // 设置说明工作表列宽
    instructionSheet.getColumn(1).width = 20;
    instructionSheet.getColumn(2).width = 60;

    return workbook;
  }

  /**
   * 保存模板到文件
   */
  static async saveTemplate(workbook, filename) {
    const templateDir = path.join(__dirname, '../../templates');
    
    // 确保模板目录存在
    const fs = require('fs');
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    const filePath = path.join(templateDir, filename);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }
}

module.exports = TemplateGenerator;