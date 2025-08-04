'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // 用户属于一个科室
      User.belongsTo(models.Department, {
        foreignKey: 'departmentId',
        as: 'department'
      });
      
      // 用户可以录入多个文献
      User.hasMany(models.Publication, {
        foreignKey: 'userId',
        as: 'publications'
      });
      
      // 用户有多个操作日志
      User.hasMany(models.OperationLog, {
        foreignKey: 'userId',
        as: 'operationLogs'
      });
    }

    // 实例方法：验证密码
    async validatePassword(password) {
      return await bcrypt.compare(password, this.password);
    }

    // 实例方法：更新最后登录时间
    async updateLastLogin() {
      this.lastLoginAt = new Date();
      await this.save();
    }

    // 实例方法：检查权限
    hasPermission(resource, action) {
      const permissions = {
        admin: ['*'],
        department_admin: [
          'publications:read',
          'publications:create',
          'publications:update',
          'publications:delete',
          'journals:read',
          'statistics:read'
        ],
        user: [
          'publications:read',
          'journals:read',
          'statistics:read'
        ]
      };

      const userPermissions = permissions[this.role] || [];
      return userPermissions.includes('*') || 
             userPermissions.includes(`${resource}:${action}`);
    }

    // 类方法：创建用户（自动加密密码）
    static async createUser(userData) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      return await User.create({
        ...userData,
        password: hashedPassword
      });
    }

    // 序列化用户信息（排除敏感信息）
    toJSON() {
      const values = Object.assign({}, this.get());
      delete values.password;
      return values;
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: '用户名不能为空'
        },
        len: {
          args: [3, 50],
          msg: '用户名长度必须在3-50字符之间'
        },
        isAlphanumeric: {
          msg: '用户名只能包含字母和数字'
        }
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: '密码不能为空'
        },
        len: {
          args: [6, 255],
          msg: '密码长度必须至少6个字符'
        }
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: '邮箱不能为空'
        },
        isEmail: {
          msg: '邮箱格式不正确'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'department_admin', 'user'),
      allowNull: false,
      defaultValue: 'user',
      validate: {
        isIn: {
          args: [['admin', 'department_admin', 'user']],
          msg: '用户角色必须是admin、department_admin或user'
        }
      }
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        async isValidDepartment(value) {
          if (value && this.role !== 'admin') {
            const department = await sequelize.models.Department.findByPk(value);
            if (!department) {
              throw new Error('指定的科室不存在');
            }
          }
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  });

  return User;
};