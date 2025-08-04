'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Journals', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: '期刊名称'
      },
      issn: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'ISSN号'
      },
      impactFactor: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: false,
        comment: '影响因子'
      },
      quartile: {
        type: Sequelize.ENUM('Q1', 'Q2', 'Q3', 'Q4'),
        allowNull: false,
        comment: '期刊分区'
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '期刊类别'
      },
      publisher: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '出版商'
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '数据年份'
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
      comment: '期刊表'
    });

    // 添加索引
    await queryInterface.addIndex('Journals', ['name'], {
      name: 'idx_journals_name'
    });
    
    await queryInterface.addIndex('Journals', ['issn'], {
      name: 'idx_journals_issn'
    });
    
    await queryInterface.addIndex('Journals', ['quartile'], {
      name: 'idx_journals_quartile'
    });
    
    await queryInterface.addIndex('Journals', ['year'], {
      name: 'idx_journals_year'
    });
    
    await queryInterface.addIndex('Journals', ['impactFactor'], {
      name: 'idx_journals_impact_factor'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Journals');
  }
};