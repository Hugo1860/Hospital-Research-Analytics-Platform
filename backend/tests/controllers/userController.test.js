const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Department } = require('../../src/models');

describe('User Controller', () => {
  let testDepartment;
  let adminUser;
  let adminToken;
  let departmentAdmin;
  let departmentAdminToken;
  let normalUser;

  beforeEach(async () => {
    // 清理测试数据
    await User.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });

    // 创建测试科室
    testDepartment = await Department.create({
      name: '心内科',
      code: 'CARDIO'
    });

    // 创建管理员用户
    adminUser = await User.create({
      username: 'admin',
      password: 'password123',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true
    });

    adminToken = jwt.sign(
      { userId: adminUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 创建科室管理员
    departmentAdmin = await User.create({
      username: 'deptadmin',
      password: 'password123',
      email: 'deptadmin@example.com',
      role: 'department_admin',
      departmentId: testDepartment.id,
      isActive: true
    });

    departmentAdminToken = jwt.sign(
      { userId: departmentAdmin.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 创建普通用户
    normalUser = await User.create({
      username: 'user',
      password: 'password123',
      email: 'user@example.com',
      role: 'user',
      departmentId: testDepartment.id,
      isActive: true
    });
  });

  describe('GET /api/users', () => {
    test('should get all users as admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(response.body.users[0]).not.toHaveProperty('password');
    });

    test('should get users with pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&pageSize=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(2);
    });

    test('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].role).toBe('admin');
    });

    test('should filter users by department', async () => {
      const response = await request(app)
        .get(`/api/users?departmentId=${testDepartment.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(2); // departmentAdmin and normalUser
    });

    test('should search users by keyword', async () => {
      const response = await request(app)
        .get('/api/users?keyword=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeGreaterThan(0);
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
    });

    test('should fail with insufficient permissions', async () => {
      const normalUserToken = jwt.sign(
        { userId: normalUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/users/:id', () => {
    test('should get user by id as admin', async () => {
      const response = await request(app)
        .get(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(normalUser.id);
      expect(response.body.user.username).toBe('user');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user.department).toBeDefined();
    });

    test('should fail with non-existent user id', async () => {
      const response = await request(app)
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('用户不存在');
    });
  });

  describe('POST /api/users', () => {
    test('should create new user as admin', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        email: 'newuser@example.com',
        role: 'user',
        departmentId: testDepartment.id
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('用户创建成功');
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should fail with duplicate username', async () => {
      const userData = {
        username: 'admin', // 已存在的用户名
        password: 'password123',
        email: 'newadmin@example.com',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('用户名已存在');
    });

    test('should fail with duplicate email', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        email: 'admin@example.com', // 已存在的邮箱
        role: 'user'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('邮箱已被使用');
    });

    test('should fail with invalid data', async () => {
      const userData = {
        username: '', // 空用户名
        password: '123', // 密码太短
        email: 'invalid-email', // 无效邮箱
        role: 'invalid_role' // 无效角色
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/users/:id', () => {
    test('should update user as admin', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com',
        role: 'department_admin'
      };

      const response = await request(app)
        .put(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('用户信息更新成功');
      expect(response.body.user.username).toBe(updateData.username);
      expect(response.body.user.email).toBe(updateData.email);
      expect(response.body.user.role).toBe(updateData.role);
    });

    test('should fail to update non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'newname' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('用户不存在');
    });

    test('should fail with duplicate username', async () => {
      const response = await request(app)
        .put(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'admin' }); // 已存在的用户名

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('用户名已存在');
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('should delete user as admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('用户删除成功');

      // 验证用户已被删除
      const deletedUser = await User.findByPk(normalUser.id);
      expect(deletedUser).toBeNull();
    });

    test('should fail to delete non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('用户不存在');
    });

    test('should fail to delete self', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('不能删除自己的账户');
    });
  });

  describe('PUT /api/users/:id/status', () => {
    test('should toggle user status as admin', async () => {
      const response = await request(app)
        .put(`/api/users/${normalUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('用户状态更新成功');

      // 验证状态已更新
      const updatedUser = await User.findByPk(normalUser.id);
      expect(updatedUser.isActive).toBe(false);
    });

    test('should fail to deactivate self', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('不能禁用自己的账户');
    });
  });

  describe('PUT /api/users/:id/password', () => {
    test('should reset user password as admin', async () => {
      const response = await request(app)
        .put(`/api/users/${normalUser.id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'newpassword123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('密码重置成功');
      expect(response.body.tempPassword).toBeDefined();

      // 验证新密码可以登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'user',
          password: 'newpassword123'
        });

      expect(loginResponse.status).toBe(200);
    });

    test('should fail with invalid password', async () => {
      const response = await request(app)
        .put(`/api/users/${normalUser.id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: '123' }); // 密码太短

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('密码长度至少需要6个字符');
    });
  });

  describe('GET /api/users/:id/logs', () => {
    test('should get user operation logs as admin', async () => {
      const response = await request(app)
        .get(`/api/users/${normalUser.id}/logs`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toBeDefined();
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    test('should get logs with pagination', async () => {
      const response = await request(app)
        .get(`/api/users/${normalUser.id}/logs?page=1&pageSize=10`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(10);
    });

    test('should filter logs by action', async () => {
      const response = await request(app)
        .get(`/api/users/${normalUser.id}/logs?action=login`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/users/batch', () => {
    test('should batch update users as admin', async () => {
      const batchData = {
        userIds: [normalUser.id, departmentAdmin.id],
        operation: {
          type: 'status',
          value: false
        }
      };

      const response = await request(app)
        .post('/api/users/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(batchData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('批量操作完成');
      expect(response.body.updated).toBe(2);
    });

    test('should fail batch operation on self', async () => {
      const batchData = {
        userIds: [adminUser.id],
        operation: {
          type: 'status',
          value: false
        }
      };

      const response = await request(app)
        .post('/api/users/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(batchData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('批量操作不能包含自己的账户');
    });
  });

  describe('GET /api/users/export', () => {
    test('should export users as admin', async () => {
      const response = await request(app)
        .get('/api/users/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    test('should export users with filters', async () => {
      const response = await request(app)
        .get('/api/users/export?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});