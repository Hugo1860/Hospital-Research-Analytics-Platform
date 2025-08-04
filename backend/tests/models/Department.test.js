const { Department, User, Publication, Journal } = require('../../src/models');

describe('Department Model', () => {
  beforeEach(async () => {
    // 清理测试数据
    await Department.destroy({ where: {}, force: true });
  });

  describe('Validation', () => {
    test('should create a valid department', async () => {
      const departmentData = {
        name: '心内科',
        code: 'CARDIO',
        description: '心血管内科'
      };

      const department = await Department.create(departmentData);
      expect(department.name).toBe(departmentData.name);
      expect(department.code).toBe(departmentData.code);
      expect(department.description).toBe(departmentData.description);
    });

    test('should fail validation with empty name', async () => {
      const departmentData = {
        name: '',
        code: 'TEST'
      };

      await expect(Department.create(departmentData))
        .rejects
        .toThrow('科室名称不能为空');
    });

    test('should fail validation with duplicate code', async () => {
      const departmentData = {
        name: '心内科',
        code: 'CARDIO'
      };

      await Department.create(departmentData);
      
      await expect(Department.create({
        name: '心外科',
        code: 'CARDIO'
      })).rejects.toThrow();
    });

    test('should fail validation with name too long', async () => {
      const departmentData = {
        name: 'a'.repeat(101),
        code: 'TEST'
      };

      await expect(Department.create(departmentData))
        .rejects
        .toThrow('科室名称长度必须在1-100字符之间');
    });
  });

  describe('Instance Methods', () => {
    test('should get department statistics', async () => {
      // 这个测试需要创建相关的期刊和文献数据
      // 由于涉及多个模型的关联，这里只做基本测试
      const department = await Department.create({
        name: '心内科',
        code: 'CARDIO'
      });

      const stats = await department.getStatistics();
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('avgImpactFactor');
      expect(stats).toHaveProperty('quartileDistribution');
    });
  });
});