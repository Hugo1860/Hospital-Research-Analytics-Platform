'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Publications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: '文献标题'
      },
      authors: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: '作者列表'
      },
      journalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Journals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: '期刊ID'
      },
      departmentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: '科室ID'
      },
      publishYear: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '发表年份'
      },
      volume: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: '卷号'
      },
      issue: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: '期号'
      },
      pages: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '页码'
      },
      doi: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'DOI'
      },
      pmid: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'PubMed ID'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: '录入用户ID'
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
      comment: '文献发表表'
    });

    // 添加索引
    await queryInterface.addIndex('Publications', ['journalId'], {
      name: 'idx_publications_journal_id'
    });
    
    await queryInterface.addIndex('Publications', ['departmentId'], {
      name: 'idx_publications_department_id'
    });
    
    await queryInterface.addIndex('Publications', ['publishYear'], {
      name: 'idx_publications_publish_year'
    });
    
    await queryInterface.addIndex('Publications', ['userId'], {
      name: 'idx_publications_user_id'
    });
    
    await queryInterface.addIndex('Publications', ['doi'], {
      name: 'idx_publications_doi'
    });
    
    await queryInterface.addIndex('Publications', ['title'], {
      name: 'idx_publications_title',
      type: 'FULLTEXT'
    });
    
    await queryInterface.addIndex('Publications', ['authors'], {
      name: 'idx_publications_authors',
      type: 'FULLTEXT'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Publications');
  }
};