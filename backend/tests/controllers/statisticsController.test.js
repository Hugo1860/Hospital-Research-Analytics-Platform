const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Department, Journal, Publication } = require('../../src/models');

describe('Statistics Controller', () => {
  let testUser;
  let testDepartment1;
  let testDepartment2;
  let testJournal1;
  let testJournal2;
  let validToken;

  beforeEach(async () => {
    // 清理测试数据
    await Publication.destroy({ where: {}, force: true });
    await Journal.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });

    // 创建测试科室
    testDepartment1 = await Department.create({
      name: '心内科',
      code: 'CARDIO'
    });

    testDepartment2 = await Department.create({
      name: '外科',
      code: 'SURGERY'
    });

    // 创建测试期刊
    testJournal1 = await Journal.create({
      name: 'Nature',
      issn: '0028-0836',
      impactFactor: 49.962,
      quartile: 'Q1',
      category: 'Multidisciplinary Sciences',
      year: 2023
    });

    testJournal2 = await Journal.create({
      name: 'Science',
      issn: '0036-8075',
      impactFactor: 47.728,
      quartile: 'Q1',
      category: 'Multidisciplinary Sciences',
      year: 2023
    });

    // 创建测试用户（管理员）
    testUser = await User.create({
      username: 'admin',
      password: 'password123',
      email: 'admin@example.com',
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
        journalId: testJournal1.id,
        departmentId: testDepartment1.id,
        publishYear: 2023,
        userId: testUser.id
      },
      {
        title: 'Cardiovascular Research 2',
        authors: 'Brown K, Wilson L',
        journalId: testJournal2.id,
        departmentId: testDepartment1.id,
        publishYear: 2022,
        userId: testUser.id
      },
      {
        title: 'Surgery Research 1',
        authors: 'Davis M, Taylor R',
        journalId: testJournal1.id,
        departmentId: testDepartment2.id,
        publishYear: 2023,
        userId: testUser.id
      }
    ]);
  });

  describe('GET /api/statistics/departments/:id', () => {
    test('should get department statistics successfully', async () => {
      const response = await request(app)
        .get(`/api/statistics/departments/${testDepartment1.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.department.name).toBe('心内科');
      expect(response.body.overview.totalPublications).toBe(2);
      expect(response.body.overview.avgImpactFactor).toBeGreaterThan(0);
      expect(response.body.yearlyTrend).toBeDefined();
      expect(response.body.quartileDistribution).toBeDefined();
    });

    test('should get department statistics with details', async () => {
      const response = await request(app)
        .get(`/api/statistics/departments/${testDepartment1.id}?includeDetails=true`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.details).toBeDefined();
      expect(response.body.details.categoryDistribution).toBeDefined();
      expect(response.body.details.recentPublications).toBeDefined();
    });

    test('should filter by year range', async () => {
      const response = await request(app)
        .get(`/api/statistics/departments/${testDepartment1.id}?startYear=2023&endYear=2023`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.overview.totalPublications).toBe(1); // 只有2023年的一篇
    });

    test('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .get('/api/statistics/departments/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('指定的科室不存在');
    });
  });

  describe('GET /api/statistics/departments', () => {
    test('should get department statistics with query parameters', async () => {
      const response = await request(app)
        .get(`/api/statistics/departments?departmentId=${testDepartment1.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.department.name).toBe('心内科');
      expect(response.body.overview.totalPublications).toBe(2);
    });

    test('should require departmentId parameter', async () => {
      const response = await request(app)
        .get('/api/statistics/departments')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('请指定要查询的科室');
    });
  });

  describe('GET /api/statistics/comparison', () => {
    test('should compare multiple departments', async () => {
      const response = await request(app)
        .get(`/api/statistics/comparison?departmentIds=${testDepartment1.id},${testDepartment2.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.comparison).toHaveLength(2);
      expect(response.body.summary.totalDepartments).toBe(2);
      expect(response.body.summary.totalPublications).toBe(3);
      
      // 验证排序（心内科应该排在前面，因为有2篇文献）
      expect(response.body.comparison[0].department.name).toBe('心内科');
      expect(response.body.comparison[0].statistics.totalPublications).toBe(2);
    });

    test('should sort by different metrics', async () => {
      const response = await request(app)
        .get(`/api/statistics/comparison?departmentIds=${testDepartment1.id},${testDepartment2.id}&metric=avgIF`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.sortedBy).toBe('avgIF');
    });

    test('should require departmentIds parameter', async () => {
      const response = await request(app)
        .get('/api/statistics/comparison')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('请指定要对比的科室');
    });
  });

  describe('GET /api/statistics/trends', () => {
    test('should get yearly trends', async () => {
      const response = await request(app)
        .get('/api/statistics/trends?startYear=2022&endYear=2023')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.trends).toBeDefined();
      expect(response.body.summary.totalYears).toBe(2);
      expect(response.body.summary.totalPublications).toBe(3);
      expect(response.body.summary.peakYear).toBeDefined();
    });

    test('should filter by department', async () => {
      const response = await request(app)
        .get(`/api/statistics/trends?departmentId=${testDepartment1.id}&startYear=2022&endYear=2023`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.totalPublications).toBe(2); // 只有心内科的文献
    });
  });

  describe('GET /api/statistics/overview', () => {
    test('should get overview statistics', async () => {
      const response = await request(app)
        .get('/api/statistics/overview')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.totalPublications).toBe(3);
      expect(response.body.summary.totalDepartments).toBe(2);
      expect(response.body.summary.avgImpactFactor).toBeGreaterThan(0);
      expect(response.body.quartileDistribution).toBeDefined();
      expect(response.body.yearlyTrend).toBeDefined();
      expect(response.body.topDepartments).toBeDefined();
    });

    test('should get overview with details', async () => {
      const response = await request(app)
        .get('/api/statistics/overview?includeDetails=true')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.details).toBeDefined();
      expect(response.body.details.categoryDistribution).toBeDefined();
      expect(response.body.details.topJournals).toBeDefined();
      expect(response.body.details.recentPublications).toBeDefined();
    });

    test('should filter by year range', async () => {
      const response = await request(app)
        .get('/api/statistics/overview?startYear=2023&endYear=2023')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.totalPublications).toBe(2); // 只有2023年的文献
    });
  });

  describe('GET /api/statistics/dashboard', () => {
    test('should get dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/statistics/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.currentYear).toBeDefined();
      expect(response.body.lastYear).toBeDefined();
      expect(response.body.growth).toBeDefined();
      expect(response.body.thisMonth).toBeDefined();
      expect(response.body.growth.direction).toMatch(/^(up|down|stable)$/);
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
        departmentId: testDepartment1.id,
        isActive: true
      });

      deptAdminToken = jwt.sign(
        { userId: deptAdminUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('should allow department admin to view own department statistics', async () => {
      const response = await request(app)
        .get(`/api/statistics/departments/${testDepartment1.id}`)
        .set('Authorization', `Bearer ${deptAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.department.name).toBe('心内科');
    });

    test('should restrict department admin to own department in comparison', async () => {
      const response = await request(app)
        .get(`/api/statistics/comparison?departmentIds=${testDepartment1.id},${testDepartment2.id}`)
        .set('Authorization', `Bearer ${deptAdminToken}`);

      expect(response.status).toBe(200);
      // 应该只返回自己科室的数据
      expect(response.body.comparison).toHaveLength(1);
      expect(response.body.comparison[0].department.name).toBe('心内科');
    });

    test('should restrict department admin in trends analysis', async () => {
      const response = await request(app)
        .get('/api/statistics/trends')
        .set('Authorization', `Bearer ${deptAdminToken}`);

      expect(response.status).toBe(200);
      // 应该只包含自己科室的数据
      expect(response.body.summary.totalPublications).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/statistics/overview');

      expect(response.status).toBe(401);
    });

    test('should handle invalid department ID', async () => {
      const response = await request(app)
        .get('/api/statistics/departments/invalid')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });
  });
});