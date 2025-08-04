'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      // 一个科室有多个用户
      Department.hasMany(models.User, {
        foreignKey: 'departmentId',
        as: 'users'
      });
      
      // 一个科室有多个文献发表
      Department.hasMany(models.Publication, {
        foreignKey: 'departmentId',
        as: 'publications'
      });
    }

    // 实例方法：获取科室统计信息
    async getStatistics(year = null) {
      const whereClause = year ? { publishYear: year } : {};
      
      const publications = await this.getPublications({
        where: whereClause,
        include: [{
          model: sequelize.models.Journal,
          as: 'journal'
        }]
      });

      const totalCount = publications.length;
      const impactFactors = publications.map(p => parseFloat(p.journal.impactFactor));
      const avgImpactFactor = impactFactors.length > 0 
        ? impactFactors.reduce((sum, if_) => sum + if_, 0) / impactFactors.length 
        : 0;

      const quartileDistribution = {
        Q1: publications.filter(p => p.journal.quartile === 'Q1').length,
        Q2: publications.filter(p => p.journal.quartile === 'Q2').length,
        Q3: publications.filter(p => p.journal.quartile === 'Q3').length,
        Q4: publications.filter(p => p.journal.quartile === 'Q4').length
      };

      return {
        totalCount,
        avgImpactFactor: Math.round(avgImpactFactor * 1000) / 1000,
        quartileDistribution
      };
    }
  }

  Department.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: '科室名称不能为空'
        },
        len: {
          args: [1, 100],
          msg: '科室名称长度必须在1-100字符之间'
        }
      }
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: '科室代码不能为空'
        },
        len: {
          args: [1, 20],
          msg: '科室代码长度必须在1-20字符之间'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Department',
    tableName: 'Departments',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  });

  return Department;
};