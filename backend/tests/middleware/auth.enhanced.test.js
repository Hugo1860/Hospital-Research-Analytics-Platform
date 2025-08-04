/**
 * 增强的认证中间件测试
 * 测试新的错误处理和响应格式
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Department } = require('../../src/models');
const { 
  authenticateToken, 
  AUTH_ERROR_TYPES, 
  createAuthErrorResponse,
  checkPermissionByRole 
} = require('../../src/middleware/auth');

describe('Enhanced Auth Middleware', () => {
  let testUser;
  let validToken;
  let expiredToken;
  let invalidToken;

  beforeAll(async () => {
    // 创建测试用户
    const department = await Department.create({
      name: '测试科室',
      code: 'TEST',
      description: '测试用科室'
    });

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'department_admin',
      departmentId: department.id,
      isActive: true
    });

    // 创建有效token
    validToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // 创建过期token
    expiredToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '-1h' }
    );

    // 创建无效token
    invalidToken = 'invalid.token.here';
  });

  afterAll(async () => {
    // 清理测试数据
    if (testUser) {
      await User.destroy({ where: { id: testUser.id } });
      await Department.destroy({ where: { id: testUser.departmentId } });
    }
  });

  describe('createAuthErrorResponse', () => {
    it('应该创建标准化的错误响应', () => {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.TOKEN_MISSING,
        '访问令牌缺失',
        { test: 'data' }
      );

      expect(errorResponse).toHaveProperty('success', false);
      expect(errorResponse).toHaveProperty('error', '访问令牌缺失');
      expect(errorResponse).toHaveProperty('code', AUTH_ERROR_TYPES.TOKEN_MISSING);
      expect(errorResponse).toHaveProperty('type', AUTH_ERROR_TYPES.TOKEN_MISSING);
      expect(errorResponse).toHaveProperty('timestamp');
      expect(errorResponse).toHaveProperty('details');
      expect(errorResponse.details).toHaveProperty('test', 'data');
    });

    it('应该为TOKEN_EXPIRED类型添加特殊信息', () => {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.TOKEN_EXPIRED,
        'Token已过期',
        { expiry: 1234567890 }
      );

      expect(errorResponse.details).toHaveProperty('expiry', 1234567890);
      expect(errorResponse.details).toHaveProperty('suggestion', '请重新登录获取新的访问令牌');
    });

    it('应该为USER_INACTIVE类型添加特殊信息', () => {
      const errorResponse = createAuthErrorResponse(
        AUTH_ERROR_TYPES.USER_INACTIVE,
        '用户已被禁用'
      );

      expect(errorResponse.details).toHaveProperty('reason', '账户已被禁用');
      expect(errorResponse.details).toHaveProperty('contact', '系统管理员');
      expect(errorResponse.details).toHaveProperty('suggestion', '请联系系统管理员激活账户');
    });
  });

  describe('checkPermissionByRole', () => {
    it('管理员应该拥有所有权限', () => {
      expect(checkPermissionByRole('admin', 'publications', 'create')).toBe(true);
      expect(checkPermissionByRole('admin', 'journals', 'delete')).toBe(true);
      expect(checkPermissionByRole('admin', 'any', 'action')).toBe(true);
    });

    it('科室管理员应该有限制的权限', () => {
      expect(checkPermissionByRole('department_admin', 'publications', 'read')).toBe(true);
      expect(checkPermissionByRole('department_admin', 'publications', 'create')).toBe(true);
      expect(checkPermissionByRole('department_admin', 'journals', 'read')).toBe(true);
      expect(checkPermissionByRole('department_admin', 'journals', 'create')).toBe(false);
    });

    it('普通用户应该只有读权限', () => {
      expect(checkPermissionByRole('user', 'publications', 'read')).toBe(true);
      expect(checkPermissionByRole('user', 'publications', 'create')).toBe(false);
      expect(checkPermissionByRole('user', 'journals', 'read')).toBe(true);
      expect(checkPermissionByRole('user', 'journals', 'create')).toBe(false);
    });
  });

  describe('认证中间件错误处理', () => {
    it('应该返回详细的TOKEN_MISSING错误', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', AUTH_ERROR_TYPES.TOKEN_MISSING);
      expect(response.body).toHaveProperty('error', '请求缺少Authorization头');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.details).toHaveProperty('header', 'Authorization');
      expect(response.body.details).toHaveProperty('format', 'Bearer <token>');
    });

    it('应该返回详细的TOKEN_MALFORMED错误', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toHaveProperty('code', AUTH_ERROR_TYPES.TOKEN_MALFORMED);
      expect(response.body).toHaveProperty('error', 'Authorization头格式不正确');
      expect(response.body.details).toHaveProperty('received', 'InvalidFormat token');
      expect(response.body.details).toHaveProperty('expected', 'Bearer <token>');
    });

    it('应该返回详细的TOKEN_EXPIRED错误', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('code', AUTH_ERROR_TYPES.TOKEN_EXPIRED);
      expect(response.body).toHaveProperty('error', '访问令牌已过期');
      expect(response.body.details).toHaveProperty('expiry');
      expect(response.body.details).toHaveProperty('suggestion', '请重新登录获取新的访问令牌');
    });

    it('应该返回详细的TOKEN_INVALID错误', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('code', AUTH_ERROR_TYPES.TOKEN_INVALID);
      expect(response.body).toHaveProperty('error', '无效的访问令牌');
      expect(response.body.details).toHaveProperty('reason');
      expect(response.body.details).toHaveProperty('suggestion', '请检查令牌格式或重新登录');
    });

    it('应该成功验证有效token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user).toHaveProperty('id', testUser.id);
      expect(response.body.data.user).toHaveProperty('username', testUser.username);
    });
  });

  describe('文件上传认证', () => {
    it('应该识别文件上传请求', async () => {
      const response = await request(app)
        .post('/api/publications/import')
        .set('Content-Type', 'multipart/form-data')
        .expect(401);

      expect(response.body.details).toHaveProperty('isFileUpload', true);
    });

    it('应该为文件上传请求提供特殊错误信息', async () => {
      const response = await request(app)
        .post('/api/publications/import')
        .set('Content-Type', 'multipart/form-data')
        .expect(401);

      expect(response.body).toHaveProperty('code', AUTH_ERROR_TYPES.TOKEN_MISSING);
      expect(response.body.details).toHaveProperty('isFileUpload', true);
      expect(response.body.details).toHaveProperty('suggestion');
    });
  });

  describe('权限检查增强', () => {
    it('应该返回详细的权限不足错误', async () => {
      // 创建普通用户token
      const userToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // 更新用户角色为普通用户
      await testUser.update({ role: 'user' });

      const response = await request(app)
        .post('/api/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '测试文献',
          authors: '测试作者',
          journalId: 1
        })
        .expect(403);

      expect(response.body).toHaveProperty('code', AUTH_ERROR_TYPES.PERMISSION_DENIED);
      expect(response.body.details).toHaveProperty('requiredPermissions');
      expect(response.body.details).toHaveProperty('currentRole', 'user');
      expect(response.body.details).toHaveProperty('userId', testUser.id);
      expect(response.body.details).toHaveProperty('username', testUser.username);
      expect(response.body.details).toHaveProperty('suggestion', '请联系管理员申请相应权限');

      // 恢复用户角色
      await testUser.update({ role: 'department_admin' });
    });
  });

  describe('认证状态监控', () => {
    it('应该在开发环境中添加认证状态头', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.headers).toHaveProperty('x-auth-status', 'authenticated');
      expect(response.headers).toHaveProperty('x-user-role', testUser.role);
      expect(response.headers).toHaveProperty('x-user-department', testUser.departmentId.toString());
      expect(response.headers).toHaveProperty('x-token-expires');

      process.env.NODE_ENV = originalEnv;
    });

    it('应该为匿名用户设置正确的状态头', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.headers).toHaveProperty('x-auth-status', 'anonymous');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('用户状态验证', () => {
    it('应该拒绝已禁用用户的访问', async () => {
      // 禁用用户
      await testUser.update({ isActive: false });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('code', AUTH_ERROR_TYPES.USER_INACTIVE);
      expect(response.body).toHaveProperty('error', '用户账户已被禁用');
      expect(response.body.details).toHaveProperty('userId', testUser.id);
      expect(response.body.details).toHaveProperty('username', testUser.username);
      expect(response.body.details).toHaveProperty('reason', '账户已被禁用');
      expect(response.body.details).toHaveProperty('contact', '系统管理员');
      expect(response.body.details).toHaveProperty('suggestion', '请联系系统管理员激活账户');

      // 重新激活用户
      await testUser.update({ isActive: true });
    });

    it('应该拒绝不存在用户的token', async () => {
      const nonExistentUserToken = jwt.sign(
        { userId: 99999 },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${nonExistentUserToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('code', AUTH_ERROR_TYPES.USER_NOT_FOUND);
      expect(response.body).toHaveProperty('error', '用户不存在');
      expect(response.body.details).toHaveProperty('userId', 99999);
    });
  });
});