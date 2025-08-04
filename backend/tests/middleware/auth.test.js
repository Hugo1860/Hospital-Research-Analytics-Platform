const jwt = require('jsonwebtoken');
const { authenticateToken, requirePermission } = require('../../src/middleware/auth');
const { User, Department } = require('../../src/models');

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const mockNext = jest.fn();

describe('Auth Middleware', () => {
  let testUser;
  let testDepartment;
  let validToken;

  beforeEach(async () => {
    // 清理测试数据
    await User.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });

    // 创建测试科室
    testDepartment = await Department.create({
      name: '心内科',
      code: 'CARDIO'
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

    // 清理mock函数
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    test('should authenticate valid token', async () => {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUser.id);
      expect(req.user.username).toBe('testuser');
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail without authorization header', async () => {
      const req = { headers: {} };
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '访问令牌缺失'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should fail with malformed authorization header', async () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat'
        }
      };
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '访问令牌格式错误'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should fail with invalid token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid_token'
        }
      };
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '访问令牌无效'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should fail with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // 已过期
      );

      const req = {
        headers: {
          authorization: `Bearer ${expiredToken}`
        }
      };
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '访问令牌已过期'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should fail with non-existent user', async () => {
      const invalidUserToken = jwt.sign(
        { userId: 99999 }, // 不存在的用户ID
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${invalidUserToken}`
        }
      };
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '用户不存在'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should fail with inactive user', async () => {
      // 禁用用户
      await testUser.update({ isActive: false });

      const req = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '账户已被禁用'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    test('should allow admin user all permissions', async () => {
      // 创建管理员用户
      const adminUser = await User.create({
        username: 'admin',
        password: 'password123',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true
      });

      const req = { user: adminUser };
      const res = mockResponse();
      const middleware = requirePermission('users', 'create');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow department admin to manage publications', async () => {
      // 创建科室管理员
      const deptAdmin = await User.create({
        username: 'deptadmin',
        password: 'password123',
        email: 'deptadmin@example.com',
        role: 'department_admin',
        departmentId: testDepartment.id,
        isActive: true
      });

      const req = { user: deptAdmin };
      const res = mockResponse();
      const middleware = requirePermission('publications', 'create');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should deny normal user admin permissions', async () => {
      const req = { user: testUser };
      const res = mockResponse();
      const middleware = requirePermission('users', 'create');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: '权限不足'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should allow normal user to read publications', async () => {
      const req = { user: testUser };
      const res = mockResponse();
      const middleware = requirePermission('publications', 'read');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should deny normal user to create users', async () => {
      const req = { user: testUser };
      const res = mockResponse();
      const middleware = requirePermission('users', 'create');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: '权限不足'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle missing user in request', () => {
      const req = {}; // 没有user属性
      const res = mockResponse();
      const middleware = requirePermission('publications', 'read');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '用户认证信息缺失'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle invalid resource', () => {
      const req = { user: testUser };
      const res = mockResponse();
      const middleware = requirePermission('invalid_resource', 'read');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: '权限不足'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle invalid action', () => {
      const req = { user: testUser };
      const res = mockResponse();
      const middleware = requirePermission('publications', 'invalid_action');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: '权限不足'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Permission Matrix', () => {
    let adminUser, deptAdmin, normalUser;

    beforeEach(async () => {
      adminUser = await User.create({
        username: 'admin',
        password: 'password123',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true
      });

      deptAdmin = await User.create({
        username: 'deptadmin',
        password: 'password123',
        email: 'deptadmin@example.com',
        role: 'department_admin',
        departmentId: testDepartment.id,
        isActive: true
      });

      normalUser = await User.create({
        username: 'normaluser',
        password: 'password123',
        email: 'normaluser@example.com',
        role: 'user',
        departmentId: testDepartment.id,
        isActive: true
      });
    });

    const testPermission = (user, resource, action, shouldAllow) => {
      const req = { user };
      const res = mockResponse();
      const middleware = requirePermission(resource, action);

      middleware(req, res, mockNext);

      if (shouldAllow) {
        expect(mockNext).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      } else {
        expect(res.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      }

      jest.clearAllMocks();
    };

    test('admin permissions', () => {
      // 管理员应该有所有权限
      testPermission(adminUser, 'users', 'create', true);
      testPermission(adminUser, 'users', 'read', true);
      testPermission(adminUser, 'users', 'update', true);
      testPermission(adminUser, 'users', 'delete', true);
      testPermission(adminUser, 'publications', 'create', true);
      testPermission(adminUser, 'publications', 'read', true);
      testPermission(adminUser, 'publications', 'update', true);
      testPermission(adminUser, 'publications', 'delete', true);
      testPermission(adminUser, 'statistics', 'read', true);
      testPermission(adminUser, 'reports', 'create', true);
    });

    test('department admin permissions', () => {
      // 科室管理员权限
      testPermission(deptAdmin, 'users', 'create', false);
      testPermission(deptAdmin, 'users', 'read', false);
      testPermission(deptAdmin, 'publications', 'create', true);
      testPermission(deptAdmin, 'publications', 'read', true);
      testPermission(deptAdmin, 'publications', 'update', true);
      testPermission(deptAdmin, 'publications', 'delete', true);
      testPermission(deptAdmin, 'statistics', 'read', true);
      testPermission(deptAdmin, 'reports', 'create', true);
    });

    test('normal user permissions', () => {
      // 普通用户权限
      testPermission(normalUser, 'users', 'create', false);
      testPermission(normalUser, 'users', 'read', false);
      testPermission(normalUser, 'users', 'update', false);
      testPermission(normalUser, 'users', 'delete', false);
      testPermission(normalUser, 'publications', 'create', false);
      testPermission(normalUser, 'publications', 'read', true);
      testPermission(normalUser, 'publications', 'update', false);
      testPermission(normalUser, 'publications', 'delete', false);
      testPermission(normalUser, 'statistics', 'read', true);
      testPermission(normalUser, 'reports', 'create', false);
    });
  });
});