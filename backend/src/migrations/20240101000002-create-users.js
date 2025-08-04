'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: '用户名'
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '密码（加密）'
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: '邮箱'
      },
      role: {
        type: Sequelize.ENUM('admin', 'department_admin', 'user'),
        allowNull: false,
        defaultValue: 'user',
        comment: '用户角色'
      },
      departmentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '所属科室ID'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否激活'
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '最后登录时间'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '用户表'
    });

    // 添加索引
    await queryInterface.addIndex('Users', ['username'], {
      name: 'idx_users_username',
      unique: true
    });
    
    await queryInterface.addIndex('Users', ['email'], {
      name: 'idx_users_email',
      unique: true
    });
    
    await queryInterface.addIndex('Users', ['departmentId'], {
      name: 'idx_users_department_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};