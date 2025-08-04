const request = require('supertest');
const express = require('express');
const { validate, userSchemas, departmentSchemas } = require('../../src/middleware/validation');

// 创建测试应用
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // 测试用户验证
  app.post('/test/user', validate(userSchemas.register), (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  // 测试科室验证
  app.post('/test/department', validate(departmentSchemas.create), (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  return app;
};

describe('Validation Middleware', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('User validation', () => {
    test('should pass with valid user data', async () => {
      const validUserData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user'
      };

      const response = await request(app)
        .post('/test/user')
        .send(validUserData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should fail with invalid email', async () => {
      const invalidUserData = {
        username: 'testuser',
        password: 'password123',
        email: 'invalid-email',
        role: 'user'
      };

      const response = await request(app)
        .post('/test/user')
        .send(invalidUserData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('请求参数验证失败');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('邮箱格式不正确')
          })
        ])
      );
    });

    test('should fail with short password', async () => {
      const invalidUserData = {
        username: 'testuser',
        password: '123',
        email: 'test@example.com',
        role: 'user'
      };

      const response = await request(app)
        .post('/test/user')
        .send(invalidUserData);

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('密码至少需要6个字符')
          })
        ])
      );
    });

    test('should fail with missing required fields', async () => {
      const incompleteUserData = {
        username: 'testuser'
        // 缺少password和email
      };

      const response = await request(app)
        .post('/test/user')
        .send(incompleteUserData);

      expect(response.status).toBe(400);
      expect(response.body.details.length).toBeGreaterThan(1);
    });
  });

  describe('Department validation', () => {
    test('should pass with valid department data', async () => {
      const validDepartmentData = {
        name: '心内科',
        code: 'CARDIO',
        description: '心血管内科'
      };

      const response = await request(app)
        .post('/test/department')
        .send(validDepartmentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should fail with empty name', async () => {
      const invalidDepartmentData = {
        name: '',
        code: 'CARDIO'
      };

      const response = await request(app)
        .post('/test/department')
        .send(invalidDepartmentData);

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('科室名称不能为空')
          })
        ])
      );
    });

    test('should strip unknown fields', async () => {
      const dataWithExtraFields = {
        name: '心内科',
        code: 'CARDIO',
        description: '心血管内科',
        unknownField: 'should be removed'
      };

      const response = await request(app)
        .post('/test/department')
        .send(dataWithExtraFields);

      expect(response.status).toBe(200);
      expect(response.body.data).not.toHaveProperty('unknownField');
    });
  });
});