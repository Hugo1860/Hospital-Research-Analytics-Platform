const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Department, Journal, Publication } = require('../../src/models');

describe('Publication Controller', () => {
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

  describe('POST /api/publications', () => {
    test('should create a new publication successfully', async () => {
      const publicationData = {
        title: 'A groundbreaking study on cardiovascular disease',
        authors: 'Smith J, Johnson A, Brown K',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        volume: '123',
        issue: '4',
        pages: '123-130',
        doi: '10.1038/nature12345'
      };

      const response = await request(app)
        .post('/api/publications')
        .set('Authorization', `Bearer ${validToken}`)
        .send(publicationData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('文献创建成功');
      expect(response.body.publication.title).toBe(publicationData.title);
      expect(response.body.publication.journal.name).toBe('Nature');
      expect(response.body.publication.department.name).toBe('心内科');
    });

    test('should fail with duplicate DOI', async () => {
      const publicationData = {
        title: 'First publication',
        authors: 'Smith J',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        doi: '10.1038/nature12345'
      };

      // 创建第一个文献
      await request(app)
        .post('/api/publications')
        .set('Authorization', `Bearer ${validToken}`)
        .send(publicationData);

      // 尝试创建重复DOI的文献
      const response = await request(app)
        .post('/api/publications')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ...publicationData,
          title: 'Second publication'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('DOI "10.1038/nature12345"已存在');
    });

    test('should fail with invalid journal', async () => {
      const publicationData = {
        title: 'Test publication',
        authors: 'Smith J',
        journalId: 99999, // 不存在的期刊ID
        departmentId: testDepartment.id,
        publishYear: 2023
      };

      const response = await request(app)
        .post('/api/publications')
        .set('Authorization', `Bearer ${validToken}`)
        .send(publicationData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('指定的期刊不存在');
    });

    test('should fail when department admin tries to create for other department', async () => {
      // 创建另一个科室
      const otherDepartment = await Department.create({
        name: '外科',
        code: 'SURGERY'
      });

      const publicationData = {
        title: 'Test publication',
        authors: 'Smith J',
        journalId: testJournal.id,
        departmentId: otherDepartment.id, // 不是用户所属科室
        publishYear: 2023
      };

      const response = await request(app)
        .post('/api/publications')
        .set('Authorization', `Bearer ${validToken}`)
        .send(publicationData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('只能为本科室创建文献');
    });
  });

  describe('GET /api/publications', () => {
    beforeEach(async () => {
      // 创建测试文献数据
      await Publication.bulkCreate([
        {
          title: 'Cardiovascular Research Study 1',
          authors: 'Smith J, Johnson A',
          journalId: testJournal.id,
          departmentId: testDepartment.id,
          publishYear: 2023,
          userId: testUser.id
        },
        {
          title: 'Cardiovascular Research Study 2',
          authors: 'Brown K, Wilson L',
          journalId: testJournal.id,
          departmentId: testDepartment.id,
          publishYear: 2022,
          userId: testUser.id
        }
      ]);
    });

    test('should get publications list successfully', async () => {
      const response = await request(app)
        .get('/api/publications')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
      
      // 验证包含关联数据
      expect(response.body.publications[0].journal).toBeDefined();
      expect(response.body.publications[0].department).toBeDefined();
      expect(response.body.publications[0].user).toBeDefined();
    });

    test('should filter publications by keyword', async () => {
      const response = await request(app)
        .get('/api/publications?keyword=Study 1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(1);
      expect(response.body.publications[0].title).toContain('Study 1');
    });

    test('should filter publications by year', async () => {
      const response = await request(app)
        .get('/api/publications?publishYear=2023')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(1);
      expect(response.body.publications[0].publishYear).toBe(2023);
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/publications?page=1&pageSize=1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publications).toHaveLength(1);
      expect(response.body.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/publications/:id', () => {
    let testPublication;

    beforeEach(async () => {
      testPublication = await Publication.create({
        title: 'Test Publication',
        authors: 'Smith J',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      });
    });

    test('should get publication by id successfully', async () => {
      const response = await request(app)
        .get(`/api/publications/${testPublication.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publication.title).toBe('Test Publication');
      expect(response.body.publication.journal).toBeDefined();
      expect(response.body.publication.department).toBeDefined();
    });

    test('should return 404 for non-existent publication', async () => {
      const response = await request(app)
        .get('/api/publications/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('文献不存在');
    });
  });

  describe('PUT /api/publications/:id', () => {
    let testPublication;

    beforeEach(async () => {
      testPublication = await Publication.create({
        title: 'Original Title',
        authors: 'Smith J',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      });
    });

    test('should update publication successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        volume: '456'
      };

      const response = await request(app)
        .put(`/api/publications/${testPublication.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('文献更新成功');
      expect(response.body.publication.title).toBe('Updated Title');
      expect(response.body.publication.volume).toBe('456');
    });

    test('should return 404 for non-existent publication', async () => {
      const response = await request(app)
        .put('/api/publications/99999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('文献不存在');
    });
  });

  describe('DELETE /api/publications/:id', () => {
    let testPublication;

    beforeEach(async () => {
      testPublication = await Publication.create({
        title: 'Test Publication',
        authors: 'Smith J',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      });
    });

    test('should delete publication successfully', async () => {
      const response = await request(app)
        .delete(`/api/publications/${testPublication.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('文献删除成功');

      // 验证文献已被删除
      const deletedPublication = await Publication.findByPk(testPublication.id);
      expect(deletedPublication).toBeNull();
    });

    test('should return 404 for non-existent publication', async () => {
      const response = await request(app)
        .delete('/api/publications/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('文献不存在');
    });
  });

  describe('GET /api/publications/journals/match', () => {
    test('should match journals for autocomplete', async () => {
      const response = await request(app)
        .get('/api/publications/journals/match?name=Nature')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.journals).toHaveLength(1);
      expect(response.body.journals[0].name).toBe('Nature');
      expect(response.body.journals[0].displayName).toContain('IF: 49.962');
    });

    test('should return empty array for short keyword', async () => {
      const response = await request(app)
        .get('/api/publications/journals/match?name=N')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.journals).toHaveLength(0);
    });
  });

  describe('GET /api/publications/statistics', () => {
    beforeEach(async () => {
      await Publication.create({
        title: 'Test Publication',
        authors: 'Smith J',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      });
    });

    test('should get publication statistics', async () => {
      const response = await request(app)
        .get('/api/publications/statistics')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.overview).toBeDefined();
      expect(response.body.overview.totalCount).toBe(1);
      expect(response.body.yearlyStats).toBeDefined();
      expect(response.body.departmentStats).toBeDefined();
      expect(response.body.quartileStats).toBeDefined();
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

    test('should allow regular user to read publications', async () => {
      const response = await request(app)
        .get('/api/publications')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(200);
    });

    test('should deny regular user to create publications', async () => {
      const publicationData = {
        title: 'Test Publication',
        authors: 'Smith J',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023
      };

      const response = await request(app)
        .post('/api/publications')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send(publicationData);

      expect(response.status).toBe(403);
    });
  });
});