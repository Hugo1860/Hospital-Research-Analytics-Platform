'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Journal extends Model {
    static associate(models) {
      // 一个期刊有多个文献发表
      Journal.hasMany(models.Publication, {
        foreignKey: 'journalId',
        as: 'publications'
      });
    }

    // 类方法：按名称搜索期刊
    static async searchByName(keyword, limit = 10) {
      return await Journal.findAll({
        where: {
          name: {
            [sequelize.Sequelize.Op.like]: `%${keyword}%`
          }
        },
        limit,
        order: [['name', 'ASC']]
      });
    }

    // 类方法：获取期刊统计信息
    static async getStatistics() {
      const totalCount = await Journal.count();
      const quartileStats = await Journal.findAll({
        attributes: [
          'quartile',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['quartile']
      });

      const avgImpactFactor = await Journal.findOne({
        attributes: [
          [sequelize.fn('AVG', sequelize.col('impactFactor')), 'avgIF']
        ]
      });

      return {
        totalCount,
        quartileDistribution: quartileStats.reduce((acc, item) => {
          acc[item.quartile] = parseInt(item.dataValues.count);
          return acc;
        }, {}),
        avgImpactFactor: parseFloat(avgImpactFactor.dataValues.avgIF) || 0
      };
    }

    // 实例方法：获取期刊发表统计
    async getPublicationStats(year = null) {
      const whereClause = year ? { publishYear: year } : {};
      
      const publications = await this.getPublications({
        where: whereClause,
        include: [{
          model: sequelize.models.Department,
          as: 'department'
        }]
      });

      const departmentStats = publications.reduce((acc, pub) => {
        const deptName = pub.department.name;
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      }, {});

      return {
        totalPublications: publications.length,
        departmentDistribution: departmentStats
      };
    }
  }

  Journal.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: '期刊名称不能为空'
        },
        len: {
          args: [1, 200],
          msg: '期刊名称长度必须在1-200字符之间'
        }
      }
    },
    issn: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^\d{4}-\d{3}[\dX]$/i,
          msg: 'ISSN格式不正确，应为XXXX-XXXX格式'
        }
      }
    },
    impactFactor: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: '影响因子必须是数字'
        },
        min: {
          args: 0,
          msg: '影响因子不能小于0'
        },
        max: {
          args: 50,
          msg: '影响因子不能大于50'
        }
      }
    },
    quartile: {
      type: DataTypes.ENUM('Q1', 'Q2', 'Q3', 'Q4'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['Q1', 'Q2', 'Q3', 'Q4']],
          msg: '期刊分区必须是Q1、Q2、Q3或Q4'
        }
      }
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: '期刊类别不能为空'
        },
        len: {
          args: [1, 100],
          msg: '期刊类别长度必须在1-100字符之间'
        }
      }
    },
    publisher: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: '出版商名称长度不能超过100字符'
        }
      }
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: {
          msg: '年份必须是整数'
        },
        min: {
          args: 1900,
          msg: '年份不能早于1900年'
        },
        max: {
          args: new Date().getFullYear() + 1,
          msg: '年份不能超过明年'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'Journal',
    tableName: 'Journals',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['issn']
      },
      {
        fields: ['quartile']
      },
      {
        fields: ['year']
      },
      {
        fields: ['impactFactor']
      }
    ]
  });

  return Journal;
};