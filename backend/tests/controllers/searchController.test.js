const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Department, Journal, Publication } = require('../../src/models');

describe('Search Controller', () => {
  let testUser;
  let testDepartment;
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
    testDepartment = await Department.create({
      name: '心内科',
      code: 'CARDIO'
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

    // 创建测试用户
    testUser = await User.create({
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com',
      role: 'user',
      departmentId: testDepartment.id,
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
        title: 'Cardiovascular Disease Research',
        authors: 'Smith J, Johnson A',
        journalId: testJournal1.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        doi: '10.1038/nature12345',
        userId: testUser.id
      },
      {
        title: 'Heart Disease Prevention Study',
        authors: 'Brown K, Wilson L',
        journalId: testJournal2.id,
        departmentId: testDepartment.id,
        publishYear: 2022,
        pmid: '12345678',
        userId: testUser.id
      },
      {
        title: 'Diabetes and Cardiovascular Risk',
        authors: 'Davis M, Taylor R',
        journalId: testJournal1.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      }
    ]);
  });

  describe('GET /api/search/advanced', () => {
    test('should perform advanced search successfully', async () => {
      const response = await request(app)
        .get('/api/search/advanced?keyword=cardiovascular')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(2);
      expect(response.body.searchStats.totalResults).toBe(2);
      expect(response.body.searchStats.distribution).toBeDefined();
      expect(response.body.searchCriteria.keyword).toBe('cardiovascular');
    });

    test('should search by title', async () => {
      const response = await request(app)
        .get('/api/search/advanced?title=Heart Disease')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(1);
      expect(response.body.publications[0].title).toContain('Heart Disease');
    });

    test('should search by authors', async () => {
      const response = await request(app)
        .get('/api/search/advanced?authors=Smith J')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(1);
      expect(response.body.publications[0].authors).toContain('Smith J');
    });

    test('should filter by year range', async () => {
      const response = await request(app)
        .get('/api/search/advanced?startYear=2023&endYear=2023')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(2);
      response.body.publications.forEach(pub => {
        expect(pub.publishYear).toBe(2023);
      });
    });

    test('should filter by quartile', async () => {
      const response = await request(app)
        .get('/api/search/advanced?quartile=Q1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(3);
      response.body.publications.forEach(pub => {
        expect(pub.journal.quartile).toBe('Q1');
      });
    });

    test('should filter by impact factor range', async () => {
      const response = await request(app)
        .get('/api/search/advanced?impactFactorMin=48&impactFactorMax=50')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(2); // Nature的文献
      response.body.publications.forEach(pub => {
        expect(parseFloat(pub.journal.impactFactor)).toBeGreaterThanOrEqual(48);
        expect(parseFloat(pub.journal.impactFactor)).toBeLessThanOrEqual(50);
      });
    });

    test('should search by DOI', async () => {
      const response = await request(app)
        .get('/api/search/advanced?doi=10.1038/nature12345')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(1);
      expect(response.body.publications[0].doi).toBe('10.1038/nature12345');
    });

    test('should search by PMID', async () => {
      const response = await request(app)
        .get('/api/search/advanced?pmid=12345678')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(1);
      expect(response.body.publications[0].pmid).toBe('12345678');
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/search/advanced?page=1&pageSize=2')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(2);
      expect(response.body.searchStats.currentPage).toBe(1);
      expect(response.body.searchStats.pageSize).toBe(2);
      expect(response.body.searchStats.totalPages).toBe(2);
    });

    test('should support sorting', async () => {
      const response = await request(app)
        .get('/api/search/advanced?sortBy=publishYear&sortOrder=ASC')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications[0].publishYear).toBeLessThanOrEqual(
        response.body.publications[1].publishYear
      );
    });
  });

  describe('GET /api/search/quick', () => {
    test('should perform quick search', async () => {
      const response = await request(app)
        .get('/api/search/quick?q=cardiovascular')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.results.publications).toBeDefined();
    });

    test('should search specific type', async () => {
      const response = await request(app)
        .get('/api/search/quick?q=Nature&type=journals')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results.journals).toBeDefined();
      expect(response.body.results.journals).toHaveLength(1);
      expect(response.body.results.journals[0].name).toBe('Nature');
    });

    test('should return empty results for short query', async () => {
      const response = await request(app)
        .get('/api/search/quick?q=a')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual({});
    });

    test('should limit results', async () => {
      const response = await request(app)
        .get('/api/search/quick?q=cardiovascular&limit=1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      if (response.body.results.publications) {
        expect(response.body.results.publications.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('GET /api/search/suggestions', () => {
    test('should get title suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?q=cardiovascular&field=title')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toBeDefined();
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });

    test('should get author suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?q=Smith&field=authors')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toBeDefined();
      expect(response.body.suggestions.length).toBeGreaterThan(0);
    });

    test('should get journal suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?q=Nature&field=journal')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toBeDefined();
      expect(response.body.suggestions).toContain('Nature');
    });

    test('should return empty suggestions for short query', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?q=a&field=title')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toEqual([]);
    });
  });

  describe('POST /api/search/history', () => {
    test('should save search history', async () => {
      const searchData = {
        query: 'cardiovascular disease',
        filters: { quartile: 'Q1', publishYear: 2023 },
        resultCount: 5
      };

      const response = await request(app)
        .post('/api/search/history')
        .set('Authorization', `Bearer ${validToken}`)
        .send(searchData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('搜索历史已保存');
      expect(response.body.searchHistory.query).toBe(searchData.query);
    });

    test('should fail with empty query', async () => {
      const response = await request(app)
        .post('/api/search/history')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ query: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('搜索查询不能为空');
    });
  });

  describe('GET /api/search/popular', () => {
    test('should get popular searches', async () => {
      const response = await request(app)
        .get('/api/search/popular')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.popularSearches).toBeDefined();
      expect(Array.isArray(response.body.popularSearches)).toBe(true);
    });
  });

  describe('Authorization', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/search/advanced?keyword=test');

      expect(response.status).toBe(401);
    });

    test('should respect department restrictions for department admin', async () => {
      // 创建科室管理员
      const deptAdmin = await User.create({
        username: 'deptadmin',
        password: 'password123',
        email: 'deptadmin@example.com',
        role: 'department_admin',
        departmentId: testDepartment.id,
        isActive: true
      });

      const deptAdminToken = jwt.sign(
        { userId: deptAdmin.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/search/advanced?keyword=cardiovascular')
        .set('Authorization', `Bearer ${deptAdminToken}`);

      expect(response.status).toBe(200);
      // 应该只返回本科室的数据
      response.body.publications.forEach(pub => {
        expect(pub.department.id).toBe(testDepartment.id);
      });
    });
  });
});