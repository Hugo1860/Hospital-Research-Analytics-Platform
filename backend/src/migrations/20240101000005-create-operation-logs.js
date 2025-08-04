'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OperationLogs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '操作用户ID'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '操作类型'
      },
      resource: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '操作资源'
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '资源ID'
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '操作详情'
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP地址'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '用户代理'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '操作日志表'
    });

    // 添加索引
    await queryInterface.addIndex('OperationLogs', ['userId'], {
      name: 'idx_operation_logs_user_id'
    });
    
    await queryInterface.addIndex('OperationLogs', ['action'], {
      name: 'idx_operation_logs_action'
    });
    
    await queryInterface.addIndex('OperationLogs', ['resource'], {
      name: 'idx_operation_logs_resource'
    });
    
    await queryInterface.addIndex('OperationLogs', ['createdAt'], {
      name: 'idx_operation_logs_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('OperationLogs');
  }
};