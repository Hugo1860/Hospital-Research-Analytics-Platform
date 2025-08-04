const { User, Department } = require('../../src/models');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
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

  describe('Validation', () => {
    test('should create a valid user', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user',
        departmentId: testDepartment.id
      };

      const user = await User.create(userData);
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.departmentId).toBe(userData.departmentId);
      
      // 密码应该被加密
      expect(user.password).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });

    test('should fail validation with invalid email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'invalid-email',
        role: 'user'
      };

      await expect(User.create(userData))
        .rejects
        .toThrow('邮箱格式不正确');
    });

    test('should fail validation with short password', async () => {
      const userData = {
        username: 'testuser',
        password: '123',
        email: 'test@example.com',
        role: 'user'
      };

      await expect(User.create(userData))
        .rejects
        .toThrow('密码长度必须至少6个字符');
    });

    test('should fail validation with duplicate username', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test1@example.com',
        role: 'user'
      };

      await User.create(userData);
      
      await expect(User.create({
        ...userData,
        email: 'test2@example.com'
      })).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'department_admin',
        departmentId: testDepartment.id
      });
    });

    test('should validate correct password', async () => {
      const isValid = await testUser.validatePassword('password123');
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const isValid = await testUser.validatePassword('wrongpassword');
      expect(isValid).toBe(false);
    });

    test('should update last login time', async () => {
      const beforeLogin = testUser.lastLoginAt;
      await testUser.updateLastLogin();
      expect(testUser.lastLoginAt).not.toBe(beforeLogin);
    });

    test('should check permissions correctly', async () => {
      expect(testUser.hasPermission('publications', 'read')).toBe(true);
      expect(testUser.hasPermission('publications', 'create')).toBe(true);
      expect(testUser.hasPermission('users', 'create')).toBe(false);
    });

    test('should exclude password from JSON serialization', () => {
      const userJson = testUser.toJSON();
      expect(userJson).not.toHaveProperty('password');
      expect(userJson).toHaveProperty('username');
      expect(userJson).toHaveProperty('email');
    });
  });

  describe('Class Methods', () => {
    test('should create user with encrypted password', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        email: 'new@example.com',
        role: 'user'
      };

      const user = await User.createUser(userData);
      expect(user.password).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });
  });
});