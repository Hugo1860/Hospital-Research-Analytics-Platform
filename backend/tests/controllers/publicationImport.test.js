const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const app = require('../../src/app');
const { User, Department, Journal, Publication } = require('../../src/models');

describe('Publication Import Controller', () => {
  let testUser;
  let testDepartment;
  let testJournal;
  let validToken;
  let testFilePath;

  beforeEach(async () => {
    // 清理测试数据
    await Publication.destroy({ where: {}, force: true });
    await Journal.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });

    // 创建测试科室
    testDepartment = await Department.create({
      name: '心内科',
      code: 'CARDIO'
    });

    // 创建测试期刊
    testJournal = await Journal.create({
      name: 'Nature',
      issn: '0028-0836',
      impactFactor: 49.962,
      quartile: 'Q1',
      category: 'Multidisciplinary Sciences',
      year: 2023
    });

    // 创建测试用户（科室管理员）
    testUser = await User.create({
      username: 'deptadmin',
      password: 'password123',
      email: 'deptadmin@example.com',
      role: 'department_admin',
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
    const worksheet = workbook.addWorksheet('文献数据');
    
    // 设置表头
    worksheet.columns = [
      { header: '文献标题', key: 'title' },
      { header: '作者', key: 'authors' },
      { header: '期刊名称', key: 'journalName' },
      { header: '科室名称', key: 'departmentName' },
      { header: '发表年份', key: 'publishYear' },
      { header: '卷号', key: 'volume' },
      { header: '期号', key: 'issue' },
      { header: '页码', key: 'pages' },
      { header: 'DOI', key: 'doi' },
      { header: 'PMID', key: 'pmid' }
    ];
    
    // 添加数据
    data.forEach(row => {
      worksheet.addRow(row);
    });
    
    // 保存文件
    testFilePath = path.join(__dirname, '../temp', `test_publications_${Date.now()}.xlsx`);
    
    // 确保目录存在
    const dir = path.dirname(testFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await workbook.xlsx.writeFile(testFilePath);
    return testFilePath;
  };

  describe('POST /api/publications/import', () => {
    test('should import publications successfully', async () => {
      const testData = [
        {
          title: 'Cardiovascular Research Study 1',
          authors: 'Smith J, Johnson A',
          journalName: 'Nature',
          departmentName: '心内科',
          publishYear: 2023,
          volume: '123',
          issue: '4',
          pages: '123-130',
          doi: '10.1038/nature12345'
        },
        {
          title: 'Cardiovascular Research Study 2',
          authors: 'Brown K, Wilson L',
          journalName: 'Nature',
          departmentName: '心内科',
          publishYear: 2022,
          pmid: '12345678'
        }
      ];

      const filePath = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/publications/import')
        .set('Authorization', `Bearer ${validToken}`)
        .field('departmentId', testDepartment.id.toString())
        .attach('file', filePath);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('文献数据导入完成');
      expect(response.body.result.summary.success).toBe(2);
      expect(response.body.result.summary.failed).toBe(0);

      // 验证数据已导入数据库
      const publicationCount = await Publication.count();
      expect(publicationCount).toBe(2);
    });

    test('should handle duplicate DOI', async () => {
      // 先创建一个文献
      await Publication.create({
        title: 'Existing Publication',
        authors: 'Smith J',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        doi: '10.1038/nature12345',
        userId: testUser.id
      });

      const testData = [
        {
          title: 'New Publication',
          authors: 'Johnson A',
          journalName: 'Nature',
          departmentName: '心内科',
          publishYear: 2023,
          doi: '10.1038/nature12345' // 重复的DOI
        }
      ];

      const filePath = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/publications/import')
        .set('Authorization', `Bearer ${validToken}`)
        .field('departmentId', testDepartment.id.toString())
        .attach('file', filePath);

      expect(response.status).toBe(200);
      expect(response.body.result.summary.success).toBe(0);
      expect(response.body.result.summary.duplicates).toBe(1);
      expect(response.body.result.errors).toHaveLength(1);
    });

    test('should handle journal not found', async () => {
      const testData = [
        {
          title: 'Test Publication',
          authors: 'Smith J',
          journalName: 'Non-existent Journal', // 不存在的期刊
          departmentName: '心内科',
          publishYear: 2023
        }
      ];

      const filePath = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/publications/import')
        .set('Authorization', `Bearer ${validToken}`)
        .field('departmentId', testDepartment.id.toString())
        .attach('file', filePath);

      expect(response.status).toBe(200);
      expect(response.body.result.summary.success).toBe(0);
      expect(response.body.result.summary.failed).toBe(1);
      expect(response.body.result.errors[0].error).toContain('未找到匹配的期刊');
    });

    test('should handle invalid data', async () => {
      const testData = [
        {
          title: '', // 空标题
          authors: 'Smith J',
          journalName: 'Nature',
          departmentName: '心内科',
          publishYear: 2023
        },
        {
          title: 'Valid Title',
          authors: '', // 空作者
          journalName: 'Nature',
          departmentName: '心内科',
          publishYear: 2023
        },
        {
          title: 'Valid Title',
          authors: 'Smith J',
          journalName: 'Nature',
          departmentName: '心内科',
          publishYear: 1800 // 无效年份
        }
      ];

      const filePath = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/publications/import')
        .set('Authorization', `Bearer ${validToken}`)
        .field('departmentId', testDepartment.id.toString())
        .attach('file', filePath);

      expect(response.status).toBe(200);
      expect(response.body.result.summary.success).toBe(0);
      expect(response.body.result.summary.failed).toBe(3);
      expect(response.body.result.errors).toHaveLength(3);
    });

    test('should fail without file', async () => {
      const response = await request(app)
        .post('/api/publications/import')
        .set('Authorization', `Bearer ${validToken}`)
        .field('departmentId', testDepartment.id.toString());

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('请选择要上传的文件');
    });

    test('should fail when department admin tries to import for other department', async () => {
      // 创建另一个科室
      const otherDepartment = await Department.create({
        name: '外科',
        code: 'SURGERY'
      });

      const testData = [
        {
          title: 'Test Publication',
          authors: 'Smith J',
          journalName: 'Nature',
          departmentName: '外科',
          publishYear: 2023
        }
      ];

      const filePath = await createTestExcelFile(testData);

      const response = await request(app)
        .post('/api/publications/import')
        .set('Authorization', `Bearer ${validToken}`)
        .field('departmentId', otherDepartment.id.toString()) // 不是用户所属科室
        .attach('file', filePath);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('只能为本科室导入文献数据');
    });

    test('should work without specifying departmentId when data contains department names', async () => {
      const testData = [
        {
          title: 'Test Publication',
          authors: 'Smith J',
          journalName: 'Nature',
          departmentName: '心内科',
          publishYear: 2023
        }
      ];

      const filePath = await createTestExcelFile(testData);

      // 创建管理员用户
      const adminUser = await User.create({
        username: 'admin',
        password: 'password123',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true
      });

      const adminToken = jwt.sign(
        { userId: adminUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/publications/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', filePath);

      expect(response.status).toBe(200);
      expect(response.body.result.summary.success).toBe(1);
    });
  });

  describe('GET /api/publications/template/download', () => {
    test('should download template successfully', async () => {
      const response = await request(app)
        .get('/api/publications/template/download')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('publication_import_template.xlsx');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/publications/template/download');

      expect(response.status).toBe(401);
    });
  });
});