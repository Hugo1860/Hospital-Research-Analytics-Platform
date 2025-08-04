'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 首先创建默认科室
    const [departments] = await queryInterface.sequelize.query(
      "SELECT id FROM Departments WHERE code = 'ADMIN' LIMIT 1"
    );

    let adminDepartmentId;
    if (departments.length === 0) {
      // 创建管理科室
      await queryInterface.bulkInsert('Departments', [
        {
          name: '系统管理科',
          code: 'ADMIN',
          description: '系统管理部门',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const [newDepartments] = await queryInterface.sequelize.query(
        "SELECT id FROM Departments WHERE code = 'ADMIN' LIMIT 1"
      );
      adminDepartmentId = newDepartments[0].id;
    } else {
      adminDepartmentId = departments[0].id;
    }

    // 检查是否已存在admin用户
    const [existingUsers] = await queryInterface.sequelize.query(
      "SELECT id FROM Users WHERE username = 'admin' LIMIT 1"
    );

    if (existingUsers.length === 0) {
      // 创建默认管理员用户
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      await queryInterface.bulkInsert('Users', [
        {
          username: 'admin',
          password: hashedPassword,
          email: 'admin@hospital.com',
          role: 'admin',
          departmentId: adminDepartmentId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      console.log('默认管理员账户创建成功:');
      console.log('用户名: admin');
      console.log('密码: password123');
    }

    // 创建一些示例科室
    const sampleDepartments = [
      { name: '内科', code: 'NK', description: '内科医学科室' },
      { name: '外科', code: 'WK', description: '外科医学科室' },
      { name: '儿科', code: 'EK', description: '儿科医学科室' },
      { name: '妇产科', code: 'FCK', description: '妇产科医学科室' },
      { name: '急诊科', code: 'JZK', description: '急诊医学科室' },
      { name: '影像科', code: 'YXK', description: '医学影像科室' },
      { name: '检验科', code: 'JYK', description: '医学检验科室' },
      { name: '药剂科', code: 'YJK', description: '药剂学科室' },
      { name: '心内科', code: 'XNK', description: '心血管内科' },
      { name: '神经科', code: 'SJK', description: '神经医学科室' }
    ];

    for (const dept of sampleDepartments) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM Departments WHERE code = '${dept.code}' LIMIT 1`
      );

      if (existing.length === 0) {
        await queryInterface.bulkInsert('Departments', [
          {
            name: dept.name,
            code: dept.code,
            description: dept.description,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]);
      }
    }

    // 创建一些示例用户
    const sampleUsers = [
      {
        username: 'dept_admin',
        password: await bcrypt.hash('password123', 12),
        email: 'dept_admin@hospital.com',
        role: 'department_admin'
      },
      {
        username: 'user1',
        password: await bcrypt.hash('password123', 12),
        email: 'user1@hospital.com',
        role: 'user'
      }
    ];

    for (const user of sampleUsers) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM Users WHERE username = '${user.username}' LIMIT 1`
      );

      if (existing.length === 0) {
        // 获取内科的ID作为默认科室
        const [nkDept] = await queryInterface.sequelize.query(
          "SELECT id FROM Departments WHERE code = 'NK' LIMIT 1"
        );
        const departmentId = nkDept.length > 0 ? nkDept[0].id : adminDepartmentId;

        await queryInterface.bulkInsert('Users', [
          {
            username: user.username,
            password: user.password,
            email: user.email,
            role: user.role,
            departmentId: departmentId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // 删除示例用户
    await queryInterface.bulkDelete('Users', {
      username: ['admin', 'dept_admin', 'user1']
    });

    // 删除示例科室（保留系统管理科）
    await queryInterface.bulkDelete('Departments', {
      code: ['NK', 'WK', 'EK', 'FCK', 'JZK', 'YXK', 'JYK', 'YJK', 'XNK', 'SJK']
    });
  }
};