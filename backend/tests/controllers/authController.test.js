const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Department } = require('../../src/models');

describe('Auth Controller', () => {
  let testDepartment;

  beforeEach(async () => {
    // 清理测试数据
    await User.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });

    // 创建测试科室
    testDepartment = await Department.create({
      name: '心内科',
      code: 'CARDIO'
    });
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user',
        departmentId: testDepartment.id
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('用户注册成功');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user.department.name).toBe('心内科');
    });

    test('should fail with duplicate username', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test1@example.com',
        role: 'user'
      };

      // 创建第一个用户
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // 尝试创建重复用户名的用户
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          email: 'test2@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('用户名已存在');
    });

    test('should fail with duplicate email', async () => {
      const userData = {
        username: 'testuser1',
        password: 'password123',
        email: 'test@example.com',
        role: 'user'
      };

      // 创建第一个用户
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // 尝试创建重复邮箱的用户
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          username: 'testuser2'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('邮箱已被使用');
    });

    test('should fail with invalid department', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user',
        departmentId: 99999 // 不存在的科室ID
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('指定的科室不存在');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user',
        departmentId: testDepartment.id,
        isActive: true
      });
    });

    test('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('登录成功');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should fail with incorrect username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'wronguser',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('用户名或密码错误');
    });

    test('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('用户名或密码错误');
    });

    test('should fail with inactive user', async () => {
      // 禁用用户
      await testUser.update({ isActive: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('账户已被禁用，请联系管理员');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user',
        departmentId: testDepartment.id,
        isActive: true
      });

      validToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.department.name).toBe('心内科');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('访问令牌缺失');
    });
  });

  describe('PUT /api/auth/password', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user',
        departmentId: testDepartment.id,
        isActive: true
      });

      validToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('密码修改成功');

      // 验证新密码可以登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'newpassword123'
        });

      expect(loginResponse.status).toBe(200);
    });

    test('should fail with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('当前密码不正确');
    });

    test('should fail with short new password', async () => {
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('新密码长度至少需要6个字符');
    });
  });
});