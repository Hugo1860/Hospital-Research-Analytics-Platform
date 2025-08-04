'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Publications', 'wosNumber', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'WOS号'
    });

    await queryInterface.addColumn('Publications', 'documentType', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: '文献类型'
    });

    await queryInterface.addColumn('Publications', 'journalAbbreviation', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: '期刊简称'
    });

    await queryInterface.addColumn('Publications', 'address', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '地址信息'
    });

    // 添加索引
    await queryInterface.addIndex('Publications', ['wosNumber'], {
      name: 'idx_publications_wos_number'
    });

    await queryInterface.addIndex('Publications', ['documentType'], {
      name: 'idx_publications_document_type'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Publications', 'idx_publications_document_type');
    await queryInterface.removeIndex('Publications', 'idx_publications_wos_number');
    
    await queryInterface.removeColumn('Publications', 'address');
    await queryInterface.removeColumn('Publications', 'journalAbbreviation');
    await queryInterface.removeColumn('Publications', 'documentType');
    await queryInterface.removeColumn('Publications', 'wosNumber');
  }
};