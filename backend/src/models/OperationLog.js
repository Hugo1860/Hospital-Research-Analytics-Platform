'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OperationLog extends Model {
    static associate(models) {
      // 操作日志属于一个用户
      OperationLog.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }

    // 类方法：记录操作日志
    static async logOperation(userId, action, resource, resourceId = null, details = null, req = null) {
      const logData = {
        userId,
        action,
        resource,
        resourceId,
        details
      };

      if (req) {
        logData.ipAddress = req.ip || req.connection.remoteAddress;
        logData.userAgent = req.get('User-Agent');
      }

      return await OperationLog.create(logData);
    }

    // 类方法：获取用户操作历史
    static async getUserOperationHistory(userId, options = {}) {
      const {
        action,
        resource,
        startDate,
        endDate,
        page = 1,
        pageSize = 50
      } = options;

      const whereClause = { userId };

      if (action) {
        whereClause.action = action;
      }

      if (resource) {
        whereClause.resource = resource;
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[sequelize.Sequelize.Op.gte] = startDate;
        }
        if (endDate) {
          whereClause.createdAt[sequelize.Sequelize.Op.lte] = endDate;
        }
      }

      const offset = (page - 1) * pageSize;

      return await OperationLog.findAndCountAll({
        where: whereClause,
        include: [{
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username']
        }],
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset
      });
    }

    // 类方法：获取系统操作统计
    static async getOperationStats(days = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await OperationLog.findAll({
        where: {
          createdAt: {
            [sequelize.Sequelize.Op.gte]: startDate
          }
        },
        attributes: [
          'action',
          'resource',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date']
        ],
        group: ['action', 'resource', sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'DESC']]
      });

      return logs;
    }

    // 实例方法：格式化操作描述
    getDescription() {
      const actionMap = {
        'create': '创建',
        'update': '更新',
        'delete': '删除',
        'read': '查看',
        'login': '登录',
        'logout': '登出',
        'import': '导入',
        'export': '导出'
      };

      const resourceMap = {
        'user': '用户',
        'department': '科室',
        'journal': '期刊',
        'publication': '文献',
        'report': '报告'
      };

      const actionText = actionMap[this.action] || this.action;
      const resourceText = resourceMap[this.resource] || this.resource;

      return `${actionText}${resourceText}`;
    }
  }

  OperationLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: '操作类型不能为空'
        },
        isIn: {
          args: [['create', 'read', 'update', 'delete', 'login', 'logout', 'import', 'export']],
          msg: '操作类型不正确'
        }
      }
    },
    resource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: '操作资源不能为空'
        }
      }
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        isIP: {
          msg: 'IP地址格式不正确'
        }
      }
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'OperationLog',
    tableName: 'OperationLogs',
    timestamps: true,
    updatedAt: false, // 操作日志不需要更新时间
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['action']
      },
      {
        fields: ['resource']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return OperationLog;
};