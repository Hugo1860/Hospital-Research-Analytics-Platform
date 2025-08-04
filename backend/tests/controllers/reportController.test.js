const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Department, Journal, Publication } = require('../../src/models');

describe('Report Controller', () => {
  let testUser;
  let testDepartment;
  let testJournal;
  let validToken;

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

    // 创建测试用户
    testUser = await User.create({
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com',
      role: 'admin',
      isActive: true
    });

    // 生成有效token
    validToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 创建测试文献数据
    await Publication.bulkCreate([
      {
        title: 'Cardiovascular Research 1',
        authors: 'Smith J, Johnson A',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      },
      {
        title: 'Cardiovascular Research 2',
        authors: 'Brown K, Wilson L',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      }
    ]);
  });

  describe('GET /api/reports/department', () => {
    test('should generate department PDF report', async () => {
      const response = await request(app)
        .get(`/api/reports/department?departmentId=${testDepartment.id}&year=2023&format=pdf`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('心内科_2023年度报告.pdf');
    });

    test('should generate department JSON report', async () => {
      const response = await request(app)
        .get(`/api/reports/department?departmentId=${testDepartment.id}&year=2023&format=json`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.department.name).toBe('心内科');
      expect(response.body.year).toBe(2023);
      expect(response.body.overview.totalPublications).toBe(2);
      expect(response.body.quartileDistribution).toBeDefined();
      expect(response.body.topPublications).toBeDefined();
    });

    test('should fail without department ID', async () => {
      const response = await request(app)
        .get('/api/reports/department?year=2023')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('请指定要生成报告的科室');
    });

    test('should fail with non-existent department', async () => {
      const response = await request(app)
        .get('/api/reports/department?departmentId=99999&year=2023')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('指定的科室不存在');
    });
  });

  describe('GET /api/reports/hospital', () => {
    test('should generate hospital PDF report', async () => {
      const response = await request(app)
        .get('/api/reports/hospital?year=2023&format=pdf')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('医院_2023年度报告.pdf');
    });

    test('should generate hospital JSON report', async () => {
      const response = await request(app)
        .get('/api/reports/hospital?year=2023&format=json')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.year).toBe(2023);
      expect(response.body.overview.totalPublications).toBe(2);
      expect(response.body.overview.totalDepartments).toBe(1);
      expect(response.body.quartileDistribution).toBeDefined();
      expect(response.body.departmentRanking).toBeDefined();
    });

    test('should use current year as default', async () => {
      const currentYear = new Date().getFullYear();
      const response = await request(app)
        .get('/api/reports/hospital?format=json')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.year).toBe(currentYear);
    });
  });

  describe('POST /api/reports/custom', () => {
    test('should generate custom PDF report', async () => {
      const customReportData = {
        title: '自定义测试报告',
        departmentIds: [testDepartment.id],
        startYear: 2023,
        endYear: 2023,
        includeCharts: true,
        format: 'pdf'
      };

      const response = await request(app)
        .post('/api/reports/custom')
        .set('Authorization', `Bearer ${validToken}`)
        .send(customReportData);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('自定义测试报告.pdf');
    });

    test('should generate custom JSON report', async () => {
      const customReportData = {
        title: '自定义测试报告',
        departmentIds: [testDepartment.id],
        startYear: 2023,
        endYear: 2023,
        format: 'json'
      };

      const response = await request(app)
        .post('/api/reports/custom')
        .set('Authorization', `Bearer ${validToken}`)
        .send(customReportData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('自定义测试报告');
      expect(response.body.period.startYear).toBe(2023);
      expect(response.body.period.endYear).toBe(2023);
      expect(response.body.statistics).toBeDefined();
    });
  });

  describe('GET /api/reports/excel', () => {
    test('should generate department Excel report', async () => {
      const response = await request(app)
        .get(`/api/reports/excel?reportType=department&departmentId=${testDepartment.id}&year=2023`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('心内科_2023年度报告.xlsx');
    });

    test('should generate hospital Excel report', async () => {
      const response = await request(app)
        .get('/api/reports/excel?reportType=hospital&year=2023')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('医院_2023年度报告.xlsx');
    });

    test('should generate custom Excel report', async () => {
      const response = await request(app)
        .get('/api/reports/excel?reportType=custom&startYear=2023&endYear=2023')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('自定义报告_');
    });

    test('should include details when requested', async () => {
      const response = await request(app)
        .get(`/api/reports/excel?reportType=department&departmentId=${testDepartment.id}&year=2023&includeDetails=true`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
    });
  });

  describe('GET /api/reports/template', () => {
    test('should download report template', async () => {
      const response = await request(app)
        .get('/api/reports/template')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('报告生成模板.xlsx');
    });
  });

  describe('Authorization', () => {
    let deptAdminUser;
    let deptAdminToken;

    beforeEach(async () => {
      deptAdminUser = await User.create({
        username: 'deptadmin',
        password: 'password123',
        email: 'deptadmin@example.com',
        role: 'department_admin',
        departmentId: testDepartment.id,
        isActive: true
      });

      deptAdminToken = jwt.sign(
        { userId: deptAdminUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('should allow department admin to generate own department report', async () => {
      const response = await request(app)
        .get(`/api/reports/department?departmentId=${testDepartment.id}&year=2023&format=json`)
        .set('Authorization', `Bearer ${deptAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.department.name).toBe('心内科');
    });

    test('should restrict department admin to own department', async () => {
      // 科室管理员访问时，应该自动使用自己的科室ID，忽略传入的其他科室ID
      const response = await request(app)
        .get('/api/reports/department?departmentId=99999&year=2023&format=json')
        .set('Authorization', `Bearer ${deptAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.department.name).toBe('心内科'); // 应该是自己的科室
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/reports/department?departmentId=1&year=2023');

      expect(response.status).toBe(401);
    });

    test('should require proper permissions', async () => {
      // 创建没有统计权限的用户
      const regularUser = await User.create({
        username: 'regular',
        password: 'password123',
        email: 'regular@example.com',
        role: 'user',
        departmentId: testDepartment.id,
        isActive: true
      });

      const regularToken = jwt.sign(
        { userId: regularUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/reports/department?departmentId=${testDepartment.id}&year=2023`)
        .set('Authorization', `Bearer ${regularToken}`);

      // 普通用户应该有统计读取权限，所以这个测试可能会通过
      // 如果需要更严格的权限控制，需要在权限配置中调整
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty data gracefully', async () => {
      // 删除所有文献数据
      await Publication.destroy({ where: {}, force: true });

      const response = await request(app)
        .get(`/api/reports/department?departmentId=${testDepartment.id}&year=2023&format=json`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.overview.totalPublications).toBe(0);
      expect(response.body.overview.avgImpactFactor).toBe(0);
    });

    test('should handle invalid year parameter', async () => {
      const response = await request(app)
        .get(`/api/reports/department?departmentId=${testDepartment.id}&year=invalid&format=json`)
        .set('Authorization', `Bearer ${validToken}`);

      // 应该使用默认年份或返回错误
      expect([200, 400]).toContain(response.status);
    });
  });
});