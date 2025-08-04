const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Department, Journal } = require('../../src/models');

describe('Journal Controller', () => {
  let testUser;
  let testDepartment;
  let validToken;

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

  describe('POST /api/journals', () => {
    test('should create a new journal successfully', async () => {
      const journalData = {
        name: 'Nature',
        issn: '0028-0836',
        impactFactor: 49.962,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
        publisher: 'Nature Publishing Group',
        year: 2023
      };

      const response = await request(app)
        .post('/api/journals')
        .set('Authorization', `Bearer ${validToken}`)
        .send(journalData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('期刊创建成功');
      expect(response.body.journal.name).toBe(journalData.name);
      expect(response.body.journal.impactFactor).toBe(journalData.impactFactor.toString());
      expect(response.body.journal.quartile).toBe(journalData.quartile);
    });

    test('should fail with duplicate journal name in same year', async () => {
      const journalData = {
        name: 'Nature',
        impactFactor: 49.962,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
        year: 2023
      };

      // 创建第一个期刊
      await request(app)
        .post('/api/journals')
        .set('Authorization', `Bearer ${validToken}`)
        .send(journalData);

      // 尝试创建重复的期刊
      const response = await request(app)
        .post('/api/journals')
        .set('Authorization', `Bearer ${validToken}`)
        .send(journalData);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('期刊"Nature"已存在');
    });

    test('should fail with invalid impact factor', async () => {
      const journalData = {
        name: 'Test Journal',
        impactFactor: -1, // 无效的影响因子
        quartile: 'Q1',
        category: 'Test Category',
        year: 2023
      };

      const response = await request(app)
        .post('/api/journals')
        .set('Authorization', `Bearer ${validToken}`)
        .send(journalData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/journals', () => {
    beforeEach(async () => {
      // 创建测试期刊数据
      await Journal.bulkCreate([
        {
          name: 'Nature',
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
        },
        {
          name: 'Cell',
          impactFactor: 41.582,
          quartile: 'Q1',
          category: 'Cell Biology',
          year: 2023
        }
      ]);
    });

    test('should get journals list successfully', async () => {
      const response = await request(app)
        .get('/api/journals')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.journals).toHaveLength(3);
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.page).toBe(1);
    });

    test('should filter journals by quartile', async () => {
      const response = await request(app)
        .get('/api/journals?quartile=Q1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.journals).toHaveLength(3);
      response.body.journals.forEach(journal => {
        expect(journal.quartile).toBe('Q1');
      });
    });

    test('should search journals by keyword', async () => {
      const response = await request(app)
        .get('/api/journals?keyword=Nature')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.journals).toHaveLength(1);
      expect(response.body.journals[0].name).toBe('Nature');
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/journals?page=1&pageSize=2')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.journals).toHaveLength(2);
      expect(response.body.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/journals/:id', () => {
    let testJournal;

    beforeEach(async () => {
      testJournal = await Journal.create({
        name: 'Nature',
        impactFactor: 49.962,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
        year: 2023
      });
    });

    test('should get journal by id successfully', async () => {
      const response = await request(app)
        .get(`/api/journals/${testJournal.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.journal.name).toBe('Nature');
      expect(response.body.statistics).toBeDefined();
    });

    test('should return 404 for non-existent journal', async () => {
      const response = await request(app)
        .get('/api/journals/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('期刊不存在');
    });
  });

  describe('PUT /api/journals/:id', () => {
    let testJournal;

    beforeEach(async () => {
      testJournal = await Journal.create({
        name: 'Nature',
        impactFactor: 49.962,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
        year: 2023
      });
    });

    test('should update journal successfully', async () => {
      const updateData = {
        impactFactor: 50.0,
        quartile: 'Q1'
      };

      const response = await request(app)
        .put(`/api/journals/${testJournal.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('期刊更新成功');
      expect(response.body.journal.impactFactor).toBe('50.0000');
    });

    test('should return 404 for non-existent journal', async () => {
      const response = await request(app)
        .put('/api/journals/99999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ impactFactor: 50.0 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('期刊不存在');
    });
  });

  describe('DELETE /api/journals/:id', () => {
    let testJournal;

    beforeEach(async () => {
      testJournal = await Journal.create({
        name: 'Nature',
        impactFactor: 49.962,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
        year: 2023
      });
    });

    test('should delete journal successfully', async () => {
      const response = await request(app)
        .delete(`/api/journals/${testJournal.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('期刊删除成功');

      // 验证期刊已被删除
      const deletedJournal = await Journal.findByPk(testJournal.id);
      expect(deletedJournal).toBeNull();
    });

    test('should return 404 for non-existent journal', async () => {
      const response = await request(app)
        .delete('/api/journals/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('期刊不存在');
    });
  });

  describe('GET /api/journals/search', () => {
    beforeEach(async () => {
      await Journal.bulkCreate([
        {
          name: 'Nature Medicine',
          impactFactor: 36.13,
          quartile: 'Q1',
          category: 'Medicine',
          year: 2023
        },
        {
          name: 'Nature Biotechnology',
          impactFactor: 33.1,
          quartile: 'Q1',
          category: 'Biotechnology',
          year: 2023
        }
      ]);
    });

    test('should search journals for autocomplete', async () => {
      const response = await request(app)
        .get('/api/journals/search?q=Nature')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.journals).toHaveLength(2);
      response.body.journals.forEach(journal => {
        expect(journal.name).toContain('Nature');
      });
    });

    test('should return empty array for short keyword', async () => {
      const response = await request(app)
        .get('/api/journals/search?q=N')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.journals).toHaveLength(0);
    });
  });

  describe('Authorization', () => {
    let regularUser;
    let regularUserToken;

    beforeEach(async () => {
      regularUser = await User.create({
        username: 'user',
        password: 'password123',
        email: 'user@example.com',
        role: 'user',
        departmentId: testDepartment.id,
        isActive: true
      });

      regularUserToken = jwt.sign(
        { userId: regularUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('should allow regular user to read journals', async () => {
      const response = await request(app)
        .get('/api/journals')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(200);
    });

    test('should deny regular user to create journals', async () => {
      const journalData = {
        name: 'Test Journal',
        impactFactor: 1.0,
        quartile: 'Q4',
        category: 'Test',
        year: 2023
      };

      const response = await request(app)
        .post('/api/journals')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send(journalData);

      expect(response.status).toBe(403);
    });
  });
});