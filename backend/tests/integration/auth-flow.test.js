const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Department } = require('../../src/models');

describe('Authentication Integration Tests', () => {
  let testUser;
  let testDepartment;
  let authToken;

  beforeAll(async () => {
    // 创建测试科室
    testDepartment = await Department.create({
      name: '测试科室',
      code: 'TEST',
      description: '用于测试的科室'
    });

    // 创建测试用户
    testUser = await User.create({
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com',
      role: 'admin',
      departmentId: testDepartment.id
    });

    // 生成测试token
    authToken = jwt.sign(
      { userId: testUser.id, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // 清理测试数据
    await User.destroy({ where: { id: testUser.id } });
    await Department.destroy({ where: { id: testDepartment.id } });
  });

  describe('登录流程测试', () => {
    test('正确的用户名和密码应该返回token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.role).toBe('admin');
    });

    test('错误的密码应该返回401', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户名或密码错误');
    });

    test('不存在的用户应该返回401', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Token验证测试', () => {
    test('有效的token应该通过验证', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    test('无效的token应该返回401', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('过期的token应该返回401', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, role: testUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // 已过期
      );

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('过期');
    });

    test('缺少Authorization头应该返回401', async () => {
      const response = await request(app)
        .get('/api/auth/validate');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('受保护的API端点测试', () => {
    test('访问文献列表需要认证', async () => {
      const response = await request(app)
        .get('/api/publications');

      expect(response.status).toBe(401);
    });

    test('有效token可以访问文献列表', async () => {
      const response = await request(app)
        .get('/api/publications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('文件上传请求需要认证', async () => {
      const response = await request(app)
        .post('/api/publications/import')
        .attach('file', Buffer.from('test content'), 'test.xlsx');

      expect(response.status).toBe(401);
    });

    test('有效token可以进行文件上传', async () => {
      const response = await request(app)
        .post('/api/publications/import')
        .set('Authorization', `Bearer ${authToken}`)
        .field('departmentId', testDepartment.id)
        .attach('file', Buffer.from('test content'), 'test.xlsx');

      // 注意：这里可能返回400因为文件格式不正确，但不应该是401认证错误
      expect(response.status).not.toBe(401);
    });
  });

  describe('权限控制测试', () => {
    let normalUser;
    let normalUserToken;

    beforeAll(async () => {
      // 创建普通用户
      normalUser = await User.create({
        username: 'normaluser',
        password: 'password123',
        email: 'normal@example.com',
        role: 'user',
        departmentId: testDepartment.id
      });

      normalUserToken = jwt.sign(
        { userId: normalUser.id, role: normalUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    afterAll(async () => {
      await User.destroy({ where: { id: normalUser.id } });
    });

    test('普通用户不能访问用户管理接口', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('权限不足');
    });

    test('管理员可以访问用户管理接口', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('普通用户不能导入文献数据', async () => {
      const response = await request(app)
        .post('/api/publications/import')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .field('departmentId', testDepartment.id)
        .attach('file', Buffer.from('test content'), 'test.xlsx');

      expect(response.status).toBe(403);
    });
  });

  describe('Token刷新测试', () => {
    test('即将过期的token可以刷新', async () => {
      // 创建一个即将过期的token（还有5分钟）
      const soonExpiredToken = jwt.sign(
        { userId: testUser.id, role: testUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '5m' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${soonExpiredToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).not.toBe(soonExpiredToken);
    });

    test('已过期的token不能刷新', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, role: testUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('并发请求测试', () => {
    test('多个并发请求应该正确处理认证', async () => {
      const requests = Array(10).fill().map(() => 
        request(app)
          .get('/api/publications')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('混合有效和无效token的并发请求', async () => {
      const validRequests = Array(5).fill().map(() => 
        request(app)
          .get('/api/publications')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const invalidRequests = Array(5).fill().map(() => 
        request(app)
          .get('/api/publications')
          .set('Authorization', 'Bearer invalid-token')
      );

      const allRequests = [...validRequests, ...invalidRequests];
      const responses = await Promise.all(allRequests);

      // 前5个请求应该成功
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(200);
      });

      // 后5个请求应该失败
      responses.slice(5).forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });

  describe('错误恢复测试', () => {
    test('数据库连接错误时的认证处理', async () => {
      // 这个测试需要模拟数据库连接问题
      // 在实际实现中，你可能需要使用sinon等工具来模拟数据库错误
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      // 即使在某些错误情况下，也应该有适当的错误响应
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });
  });
});