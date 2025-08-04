const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const app = require('../../src/app');
const { User, Department, Journal } = require('../../src/models');

describe('Journal Import Controller', () => {
  let testUser;
  let testDepartment;
  let validToken;
  let testFilePath;

  beforeEach(async () => {
    // 清理测试数据
    await Journal.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });

    // 创建测试科室
    testDepartment = await Department.create({
      name: '心内科',
      code: 'CARDIO'
    });

    // 创建测试用户（管理员）
    testUser = await User.create({
      username: 'admin',
      password: 'password123',
      email: 'admin@example.com',
      role: 'admin',
      departmentId: testDepartment.id,
      isActive: true
    });

    // 生成有效token
    validToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // 清理测试文件
    if (testFilePath && fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  // 创建测试Excel文件
  const createTestExcelFile = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('期刊数据');
    
    // 设置表头
    worksheet.columns = [
      { header: '期刊名称', key: 'name' },
      { header: 'ISSN', key: 'issn' },
      { header: '影响因子', key: 'impactFactor' },
      { header: '分区', key: 'quartile' },
      { header: '期刊类别', key: 'category' },
      { header: '出版商', key: 'publisher' },
      { header: '年份', key: 'year' }
    ];
    
    // 添加数据
    data.forEach(row => {
      worksheet.addRow(row);
    });
    
    // 保存文件
    testFilePath = path.join(__dirname, '../temp', `test_journals_${Date.now()}.xlsx`);
    
    // 确保目录存在
    const dir = path.dirname(testFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await workbook.xlsx.writeFile(testFilePath);
    return testFilePath;
  };

  describe('POST /api/journals/import', () => {
    test('should import journals successfully', async () => {
      const testData = [
        {
          name: 'Nature',
          issn: '0028-0836',
          impactFactor: 49.962,
          quartile: 'Q1',
          category: 'Multidisciplinary Sciences',
          publisher: 'Nature Publishing Group',
          year: 2023
        },
        {
          name: 'Science',
          issn: '0036-8075',
          impactFactor: 47.728,
          quartile: 'Q1',
          category: 'Multidisciplinary Sciences',
          publisher: 'AAAS',
          year: 2023
        }
      ];

      const filePath = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/journals/import')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', filePath);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('期刊数据导入完成');
      expect(response.body.result.summary.success).toBe(2);
      expect(response.body.result.summary.failed).toBe(0);

      // 验证数据已导入数据库
      const journalCount = await Journal.count();
      expect(journalCount).toBe(2);
    });

    test('should handle duplicate journals', async () => {
      // 先创建一个期刊
      await Journal.create({
        name: 'Nature',
        impactFactor: 49.962,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
        year: 2023
      });

      const testData = [
        {
          name: 'Nature', // 重复的期刊
          impactFactor: 49.962,
          quartile: 'Q1',
          category: 'Multidisciplinary Sciences',
          year: 2023
        },
        {
          name: 'Science',
          impactFactor: 47.728,
          quartile: 'Q1',
          category: 'Multidisciplinary Sciences',
          year: 2023
        }
      ];

      const filePath = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/journals/import')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', filePath);

      expect(response.status).toBe(200);
      expect(response.body.result.summary.success).toBe(1);
      expect(response.body.result.summary.duplicates).toBe(1);
      expect(response.body.result.errors).toHaveLength(1);
    });

    test('should handle invalid data', async () => {
      const testData = [
        {
          name: '', // 空名称
          impactFactor: 49.962,
          quartile: 'Q1',
          category: 'Multidisciplinary Sciences',
          year: 2023
        },
        {
          name: 'Science',
          impactFactor: -1, // 无效影响因子
          quartile: 'Q1',
          category: 'Multidisciplinary Sciences',
          year: 2023
        },
        {
          name: 'Cell',
          impactFactor: 41.582,
          quartile: 'Q5', // 无效分区
          category: 'Cell Biology',
          year: 2023
        }
      ];

      const filePath = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/journals/import')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', filePath);

      expect(response.status).toBe(200);
      expect(response.body.result.summary.success).toBe(0);
      expect(response.body.result.summary.failed).toBe(3);
      expect(response.body.result.errors).toHaveLength(3);
    });

    test('should fail without file', async () => {
      const response = await request(app)
        .post('/api/journals/import')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('请选择要上传的文件');
    });

    test('should fail with unsupported file type', async () => {
      // 创建一个文本文件
      const textFilePath = path.join(__dirname, '../temp', 'test.txt');
      const dir = path.dirname(textFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(textFilePath, 'test content');

      const response = await request(app)
        .post('/api/journals/import')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', textFilePath);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('只支持Excel');

      // 清理文件
      fs.unlinkSync(textFilePath);
    });

    test('should deny access to non-admin users', async () => {
      // 创建普通用户
      const regularUser = await User.create({
        username: 'user',
        password: 'password123',
        email: 'user@example.com',
        role: 'user',
        departmentId: testDepartment.id,
        isActive: true
      });

      const regularUserToken = jwt.sign(
        { userId: regularUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const testData = [
        {
          name: 'Nature',
          impactFactor: 49.962,
          quartile: 'Q1',
          category: 'Multidisciplinary Sciences',
          year: 2023
        }
      ];

      const filePath = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/journals/import')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .attach('file', filePath);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/journals/template/download', () => {
    test('should download template successfully', async () => {
      const response = await request(app)
        .get('/api/journals/template/download')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('journal_import_template.xlsx');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/journals/template/download');

      expect(response.status).toBe(401);
    });
  });
});