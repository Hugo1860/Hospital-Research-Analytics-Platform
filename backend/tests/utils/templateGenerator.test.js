const TemplateGenerator = require('../../src/utils/templateGenerator');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

describe('TemplateGenerator', () => {
  const tempDir = path.join(__dirname, '../temp');

  beforeAll(() => {
    // 确保临时目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // 清理临时文件
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      fs.rmdirSync(tempDir);
    }
  });

  describe('generatePublicationTemplate', () => {
    it('should generate a valid publication template workbook', async () => {
      const workbook = await TemplateGenerator.generatePublicationTemplate();

      expect(workbook).toBeInstanceOf(ExcelJS.Workbook);
      expect(workbook.creator).toBe('协和医院SCI期刊分析系统');
      
      // 检查工作表
      const worksheets = workbook.worksheets;
      expect(worksheets.length).toBeGreaterThanOrEqual(2);
      
      const mainSheet = worksheets[0];
      expect(mainSheet.name).toBe('文献导入模板');
      
      const instructionSheet = worksheets[1];
      expect(instructionSheet.name).toBe('导入说明');
    });

    it('should have correct column headers in publication template', async () => {
      const workbook = await TemplateGenerator.generatePublicationTemplate();
      const worksheet = workbook.getWorksheet('文献导入模板');

      const expectedHeaders = [
        'WOS号',
        '文章标题',
        '作者',
        '文献类型',
        '期刊名称',
        '期刊简称',
        'ISSN',
        '年',
        '卷',
        '期',
        '地址',
        '页码',
        'DOI',
        'PMID',
        '科室'
      ];

      const headerRow = worksheet.getRow(1);
      expectedHeaders.forEach((header, index) => {
        expect(headerRow.getCell(index + 1).value).toBe(header);
      });
    });

    it('should include sample data in publication template', async () => {
      const workbook = await TemplateGenerator.generatePublicationTemplate();
      const worksheet = workbook.getWorksheet('文献导入模板');

      const sampleRow = worksheet.getRow(2);
      expect(sampleRow.getCell(1).value).toBe('WOS:000123456789'); // WOS号
      expect(sampleRow.getCell(2).value).toContain('示例文献标题'); // 标题
      expect(sampleRow.getCell(3).value).toContain('张三'); // 作者
      expect(sampleRow.getCell(5).value).toBe('Nature Medicine'); // 期刊名称
      expect(sampleRow.getCell(15).value).toBe('心内科'); // 科室
    });

    it('should include instruction sheet with proper content', async () => {
      const workbook = await TemplateGenerator.generatePublicationTemplate();
      const instructionSheet = workbook.getWorksheet('导入说明');

      expect(instructionSheet).toBeDefined();
      
      // 检查标题行
      const titleRow = instructionSheet.getRow(1);
      expect(titleRow.getCell(1).value).toContain('协和医院SCI期刊分析系统');
      
      // 检查是否包含重要提示
      let hasImportantTips = false;
      instructionSheet.eachRow((row) => {
        if (row.getCell(1).value && row.getCell(1).value.toString().includes('重要提示')) {
          hasImportantTips = true;
        }
      });
      expect(hasImportantTips).toBe(true);
    });

    it('should save publication template to file', async () => {
      const workbook = await TemplateGenerator.generatePublicationTemplate();
      const filename = 'test-publication-template.xlsx';
      const filePath = await TemplateGenerator.saveTemplate(workbook, filename);

      expect(fs.existsSync(filePath)).toBe(true);
      
      // 验证文件可以被读取
      const savedWorkbook = new ExcelJS.Workbook();
      await savedWorkbook.xlsx.readFile(filePath);
      expect(savedWorkbook.worksheets.length).toBeGreaterThanOrEqual(2);
      
      // 清理文件
      fs.unlinkSync(filePath);
    });
  });

  describe('generateJournalTemplate', () => {
    it('should generate a valid journal template workbook', async () => {
      const workbook = await TemplateGenerator.generateJournalTemplate();

      expect(workbook).toBeInstanceOf(ExcelJS.Workbook);
      expect(workbook.creator).toBe('协和医院SCI期刊分析系统');
      
      // 检查工作表
      const worksheets = workbook.worksheets;
      expect(worksheets.length).toBeGreaterThanOrEqual(2);
      
      const mainSheet = worksheets[0];
      expect(mainSheet.name).toBe('期刊导入模板');
      
      const instructionSheet = worksheets[1];
      expect(instructionSheet.name).toBe('导入说明');
    });

    it('should have correct column headers in journal template', async () => {
      const workbook = await TemplateGenerator.generateJournalTemplate();
      const worksheet = workbook.getWorksheet('期刊导入模板');

      const expectedHeaders = [
        '期刊名称*',
        'ISSN',
        '影响因子*',
        '分区*',
        '学科分类*',
        '出版商',
        '年份*'
      ];

      const headerRow = worksheet.getRow(1);
      expectedHeaders.forEach((header, index) => {
        expect(headerRow.getCell(index + 1).value).toBe(header);
      });
    });

    it('should include sample data in journal template', async () => {
      const workbook = await TemplateGenerator.generateJournalTemplate();
      const worksheet = workbook.getWorksheet('期刊导入模板');

      const sampleRow1 = worksheet.getRow(2);
      expect(sampleRow1.getCell(1).value).toBe('Nature'); // 期刊名称
      expect(sampleRow1.getCell(2).value).toBe('0028-0836'); // ISSN
      expect(sampleRow1.getCell(3).value).toBe(64.8); // 影响因子
      expect(sampleRow1.getCell(4).value).toBe('Q1'); // 分区
      expect(sampleRow1.getCell(7).value).toBe(2024); // 年份

      const sampleRow2 = worksheet.getRow(3);
      expect(sampleRow2.getCell(1).value).toBe('Science'); // 期刊名称
      expect(sampleRow2.getCell(4).value).toBe('Q1'); // 分区
    });

    it('should include instruction sheet with validation rules', async () => {
      const workbook = await TemplateGenerator.generateJournalTemplate();
      const instructionSheet = workbook.getWorksheet('导入说明');

      expect(instructionSheet).toBeDefined();
      
      // 检查是否包含字段说明
      let hasFieldDescription = false;
      instructionSheet.eachRow((row) => {
        if (row.getCell(1).value && row.getCell(1).value.toString().includes('字段说明')) {
          hasFieldDescription = true;
        }
      });
      expect(hasFieldDescription).toBe(true);
      
      // 检查是否包含注意事项
      let hasNotes = false;
      instructionSheet.eachRow((row) => {
        if (row.getCell(1).value && row.getCell(1).value.toString().includes('注意事项')) {
          hasNotes = true;
        }
      });
      expect(hasNotes).toBe(true);
    });

    it('should save journal template to file', async () => {
      const workbook = await TemplateGenerator.generateJournalTemplate();
      const filename = 'test-journal-template.xlsx';
      const filePath = await TemplateGenerator.saveTemplate(workbook, filename);

      expect(fs.existsSync(filePath)).toBe(true);
      
      // 验证文件可以被读取
      const savedWorkbook = new ExcelJS.Workbook();
      await savedWorkbook.xlsx.readFile(filePath);
      expect(savedWorkbook.worksheets.length).toBeGreaterThanOrEqual(2);
      
      // 清理文件
      fs.unlinkSync(filePath);
    });
  });

  describe('saveTemplate', () => {
    it('should create template directory if it does not exist', async () => {
      const workbook = await TemplateGenerator.generateJournalTemplate();
      const filename = 'test-template.xlsx';
      
      // 确保模板目录不存在
      const templateDir = path.join(__dirname, '../../src/templates');
      if (fs.existsSync(templateDir)) {
        fs.rmSync(templateDir, { recursive: true });
      }

      const filePath = await TemplateGenerator.saveTemplate(workbook, filename);

      expect(fs.existsSync(templateDir)).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);
      
      // 清理
      fs.unlinkSync(filePath);
    });

    it('should return correct file path', async () => {
      const workbook = await TemplateGenerator.generateJournalTemplate();
      const filename = 'test-path.xlsx';
      
      const filePath = await TemplateGenerator.saveTemplate(workbook, filename);
      const expectedPath = path.join(__dirname, '../../src/templates', filename);
      
      expect(filePath).toBe(expectedPath);
      
      // 清理
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  describe('Template Styling', () => {
    it('should apply correct styling to publication template headers', async () => {
      const workbook = await TemplateGenerator.generatePublicationTemplate();
      const worksheet = workbook.getWorksheet('文献导入模板');
      const headerRow = worksheet.getRow(1);

      expect(headerRow.height).toBe(25);
      expect(headerRow.font.bold).toBe(true);
      expect(headerRow.font.size).toBe(12);
      expect(headerRow.fill.fgColor.argb).toBe('FF4472C4');
    });

    it('should apply correct styling to journal template headers', async () => {
      const workbook = await TemplateGenerator.generateJournalTemplate();
      const worksheet = workbook.getWorksheet('期刊导入模板');
      const headerRow = worksheet.getRow(1);

      expect(headerRow.height).toBe(25);
      expect(headerRow.font.bold).toBe(true);
      expect(headerRow.font.size).toBe(12);
      expect(headerRow.fill.fgColor.argb).toBe('FF70AD47');
    });

    it('should apply borders to template cells', async () => {
      const workbook = await TemplateGenerator.generatePublicationTemplate();
      const worksheet = workbook.getWorksheet('文献导入模板');
      const headerRow = worksheet.getRow(1);
      const firstCell = headerRow.getCell(1);

      expect(firstCell.border.top.style).toBe('thin');
      expect(firstCell.border.left.style).toBe('thin');
      expect(firstCell.border.bottom.style).toBe('thin');
      expect(firstCell.border.right.style).toBe('thin');
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const workbook = await TemplateGenerator.generateJournalTemplate();
      
      // 尝试保存到无效路径
      const invalidPath = '/invalid/path/template.xlsx';
      
      await expect(
        workbook.xlsx.writeFile(invalidPath)
      ).rejects.toThrow();
    });
  });
});