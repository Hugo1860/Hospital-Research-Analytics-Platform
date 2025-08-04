'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Publication extends Model {
    static associate(models) {
      // 文献属于一个期刊
      Publication.belongsTo(models.Journal, {
        foreignKey: 'journalId',
        as: 'journal'
      });
      
      // 文献属于一个科室
      Publication.belongsTo(models.Department, {
        foreignKey: 'departmentId',
        as: 'department'
      });
      
      // 文献由一个用户录入
      Publication.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }

    // 类方法：高级搜索
    static async advancedSearch(options = {}) {
      const {
        keyword,
        departmentId,
        journalId,
        publishYear,
        quartile,
        impactFactorMin,
        impactFactorMax,
        page = 1,
        pageSize = 20
      } = options;

      const whereClause = {};
      const journalWhere = {};

      // 关键词搜索（标题和作者）
      if (keyword) {
        whereClause[sequelize.Sequelize.Op.or] = [
          { title: { [sequelize.Sequelize.Op.like]: `%${keyword}%` } },
          { authors: { [sequelize.Sequelize.Op.like]: `%${keyword}%` } }
        ];
      }

      // 科室筛选
      if (departmentId) {
        whereClause.departmentId = departmentId;
      }

      // 期刊筛选
      if (journalId) {
        whereClause.journalId = journalId;
      }

      // 发表年份筛选
      if (publishYear) {
        whereClause.publishYear = publishYear;
      }

      // 期刊分区筛选
      if (quartile) {
        journalWhere.quartile = quartile;
      }

      // 影响因子范围筛选
      if (impactFactorMin || impactFactorMax) {
        journalWhere.impactFactor = {};
        if (impactFactorMin) {
          journalWhere.impactFactor[sequelize.Sequelize.Op.gte] = impactFactorMin;
        }
        if (impactFactorMax) {
          journalWhere.impactFactor[sequelize.Sequelize.Op.lte] = impactFactorMax;
        }
      }

      const offset = (page - 1) * pageSize;

      return await Publication.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: sequelize.models.Journal,
            as: 'journal',
            where: Object.keys(journalWhere).length > 0 ? journalWhere : undefined
          },
          {
            model: sequelize.models.Department,
            as: 'department'
          },
          {
            model: sequelize.models.User,
            as: 'user',
            attributes: ['id', 'username']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset
      });
    }

    // 类方法：获取年度统计
    static async getYearlyStats(startYear, endYear) {
      const publications = await Publication.findAll({
        where: {
          publishYear: {
            [sequelize.Sequelize.Op.between]: [startYear, endYear]
          }
        },
        include: [
          {
            model: sequelize.models.Journal,
            as: 'journal'
          },
          {
            model: sequelize.models.Department,
            as: 'department'
          }
        ]
      });

      const yearlyStats = {};
      
      publications.forEach(pub => {
        const year = pub.publishYear;
        if (!yearlyStats[year]) {
          yearlyStats[year] = {
            total: 0,
            departments: {},
            quartiles: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
            totalImpactFactor: 0
          };
        }
        
        yearlyStats[year].total++;
        yearlyStats[year].departments[pub.department.name] = 
          (yearlyStats[year].departments[pub.department.name] || 0) + 1;
        yearlyStats[year].quartiles[pub.journal.quartile]++;
        yearlyStats[year].totalImpactFactor += parseFloat(pub.journal.impactFactor);
      });

      // 计算平均影响因子
      Object.keys(yearlyStats).forEach(year => {
        const stats = yearlyStats[year];
        stats.avgImpactFactor = stats.total > 0 
          ? Math.round((stats.totalImpactFactor / stats.total) * 1000) / 1000
          : 0;
        delete stats.totalImpactFactor;
      });

      return yearlyStats;
    }

    // 实例方法：获取引用格式
    getCitation(style = 'apa') {
      const { title, authors, publishYear, volume, issue, pages } = this;
      const journalName = this.journal ? this.journal.name : '';
      
      switch (style) {
        case 'apa':
          return `${authors} (${publishYear}). ${title}. ${journalName}${volume ? `, ${volume}` : ''}${issue ? `(${issue})` : ''}${pages ? `, ${pages}` : ''}.`;
        case 'mla':
          return `${authors}. "${title}." ${journalName}${volume ? ` ${volume}` : ''}${issue ? `.${issue}` : ''} (${publishYear})${pages ? `: ${pages}` : ''}.`;
        default:
          return `${authors}. ${title}. ${journalName}. ${publishYear}${volume ? `;${volume}` : ''}${issue ? `(${issue})` : ''}${pages ? `:${pages}` : ''}.`;
      }
    }
  }

  Publication.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: '文献标题不能为空'
        },
        len: {
          args: [1, 500],
          msg: '文献标题长度必须在1-500字符之间'
        }
      }
    },
    authors: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: '作者信息不能为空'
        }
      }
    },
    journalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        async isValidJournal(value) {
          const journal = await sequelize.models.Journal.findByPk(value);
          if (!journal) {
            throw new Error('指定的期刊不存在');
          }
        }
      }
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        async isValidDepartment(value) {
          const department = await sequelize.models.Department.findByPk(value);
          if (!department) {
            throw new Error('指定的科室不存在');
          }
        }
      }
    },
    publishYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: {
          msg: '发表年份必须是整数'
        },
        min: {
          args: 1900,
          msg: '发表年份不能早于1900年'
        },
        max: {
          args: new Date().getFullYear(),
          msg: '发表年份不能超过当前年份'
        }
      }
    },
    volume: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: {
          args: [0, 20],
          msg: '卷号长度不能超过20字符'
        }
      }
    },
    issue: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: {
          args: [0, 20],
          msg: '期号长度不能超过20字符'
        }
      }
    },
    pages: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: {
          args: [0, 50],
          msg: '页码长度不能超过50字符'
        }
      }
    },
    doi: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'DOI长度不能超过100字符'
        }
      }
    },
    pmid: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: {
          args: [0, 20],
          msg: 'PMID长度不能超过20字符'
        },
        isNumeric: {
          msg: 'PMID必须是数字'
        }
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        async isValidUser(value) {
          const user = await sequelize.models.User.findByPk(value);
          if (!user) {
            throw new Error('指定的用户不存在');
          }
        }
      }
    },
    wosNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: {
          args: [0, 50],
          msg: 'WOS号长度不能超过50字符'
        }
      }
    },
    documentType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: {
          args: [0, 50],
          msg: '文献类型长度不能超过50字符'
        }
      }
    },
    journalAbbreviation: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: '期刊简称长度不能超过100字符'
        }
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Publication',
    tableName: 'Publications',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      {
        fields: ['journalId']
      },
      {
        fields: ['departmentId']
      },
      {
        fields: ['publishYear']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['doi']
      },
      {
        fields: ['wosNumber']
      },
      {
        fields: ['documentType']
      }
    ]
  });

  return Publication;
};