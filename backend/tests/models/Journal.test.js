const { Journal, Publication } = require('../../src/models');

describe('Journal Model', () => {
  beforeEach(async () => {
    // 清理测试数据
    await Publication.destroy({ where: {}, force: true });
    await Journal.destroy({ where: {}, force: true });
  });

  describe('Validation', () => {
    test('should create a valid journal', async () => {
      const journalData = {
        name: 'Nature Medicine',
        issn: '1078-8956',
        impactFactor: 87.241,
        quartile: 'Q1',
        category: 'Medicine, Research & Experimental',
        publisher: 'Nature Publishing Group',
        year: 2023
      };

      const journal = await Journal.create(journalData);
      
      expect(journal.name).toBe(journalData.name);
      expect(journal.issn).toBe(journalData.issn);
      expect(journal.impactFactor).toBe(journalData.impactFactor);
      expect(journal.quartile).toBe(journalData.quartile);
      expect(journal.category).toBe(journalData.category);
      expect(journal.publisher).toBe(journalData.publisher);
      expect(journal.year).toBe(journalData.year);
    });

    test('should fail validation without required fields', async () => {
      const journalData = {
        // 缺少必需字段
        issn: '1078-8956',
        impactFactor: 87.241
      };

      await expect(Journal.create(journalData))
        .rejects
        .toThrow();
    });

    test('should fail validation with invalid ISSN format', async () => {
      const journalData = {
        name: 'Test Journal',
        issn: 'invalid-issn',
        impactFactor: 5.0,
        quartile: 'Q1',
        category: 'Test Category',
        year: 2023
      };

      await expect(Journal.create(journalData))
        .rejects
        .toThrow('ISSN格式不正确');
    });

    test('should fail validation with negative impact factor', async () => {
      const journalData = {
        name: 'Test Journal',
        issn: '1234-5678',
        impactFactor: -1.0,
        quartile: 'Q1',
        category: 'Test Category',
        year: 2023
      };

      await expect(Journal.create(journalData))
        .rejects
        .toThrow('影响因子必须大于0');
    });

    test('should fail validation with invalid quartile', async () => {
      const journalData = {
        name: 'Test Journal',
        issn: '1234-5678',
        impactFactor: 5.0,
        quartile: 'Q5', // 无效分区
        category: 'Test Category',
        year: 2023
      };

      await expect(Journal.create(journalData))
        .rejects
        .toThrow('期刊分区必须是Q1、Q2、Q3或Q4');
    });

    test('should fail validation with invalid year', async () => {
      const journalData = {
        name: 'Test Journal',
        issn: '1234-5678',
        impactFactor: 5.0,
        quartile: 'Q1',
        category: 'Test Category',
        year: 1800 // 无效年份
      };

      await expect(Journal.create(journalData))
        .rejects
        .toThrow('年份必须在1900年之后');
    });

    test('should fail validation with duplicate name and year', async () => {
      const journalData = {
        name: 'Test Journal',
        issn: '1234-5678',
        impactFactor: 5.0,
        quartile: 'Q1',
        category: 'Test Category',
        year: 2023
      };

      await Journal.create(journalData);
      
      await expect(Journal.create({
        ...journalData,
        issn: '8765-4321' // 不同的ISSN
      })).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let testJournal;

    beforeEach(async () => {
      testJournal = await Journal.create({
        name: 'Nature Medicine',
        issn: '1078-8956',
        impactFactor: 87.241,
        quartile: 'Q1',
        category: 'Medicine, Research & Experimental',
        publisher: 'Nature Publishing Group',
        year: 2023
      });
    });

    test('should check if high impact journal', () => {
      expect(testJournal.isHighImpact()).toBe(true);
    });

    test('should check if not high impact journal', async () => {
      const lowImpactJournal = await Journal.create({
        name: 'Low Impact Journal',
        issn: '1234-5678',
        impactFactor: 2.5,
        quartile: 'Q3',
        category: 'Test Category',
        year: 2023
      });

      expect(lowImpactJournal.isHighImpact()).toBe(false);
    });

    test('should get quartile rank', () => {
      expect(testJournal.getQuartileRank()).toBe(1);
    });

    test('should format display name', () => {
      const displayName = testJournal.getDisplayName();
      expect(displayName).toBe('Nature Medicine (IF: 87.241, Q1)');
    });

    test('should get impact factor category', () => {
      expect(testJournal.getImpactFactorCategory()).toBe('very_high');
    });

    test('should format ISSN', () => {
      const formattedISSN = testJournal.getFormattedISSN();
      expect(formattedISSN).toBe('1078-8956');
    });
  });

  describe('Class Methods', () => {
    beforeEach(async () => {
      // 创建多个测试期刊
      await Journal.bulkCreate([
        {
          name: 'Nature Medicine',
          issn: '1078-8956',
          impactFactor: 87.241,
          quartile: 'Q1',
          category: 'Medicine, Research & Experimental',
          year: 2023
        },
        {
          name: 'Science',
          issn: '0036-8075',
          impactFactor: 63.714,
          quartile: 'Q1',
          category: 'Multidisciplinary Sciences',
          year: 2023
        },
        {
          name: 'PLOS ONE',
          issn: '1932-6203',
          impactFactor: 3.752,
          quartile: 'Q2',
          category: 'Multidisciplinary Sciences',
          year: 2023
        },
        {
          name: 'BMC Medicine',
          issn: '1741-7015',
          impactFactor: 9.3,
          quartile: 'Q1',
          category: 'Medicine, General & Internal',
          year: 2022
        }
      ]);
    });

    test('should find by quartile', async () => {
      const q1Journals = await Journal.findByQuartile('Q1');
      expect(q1Journals).toHaveLength(3);
      
      const q2Journals = await Journal.findByQuartile('Q2');
      expect(q2Journals).toHaveLength(1);
    });

    test('should find by category', async () => {
      const medicineJournals = await Journal.findByCategory('Medicine, Research & Experimental');
      expect(medicineJournals).toHaveLength(1);
      expect(medicineJournals[0].name).toBe('Nature Medicine');
    });

    test('should find by impact factor range', async () => {
      const highImpactJournals = await Journal.findByImpactFactorRange(50, 100);
      expect(highImpactJournals).toHaveLength(2);
      
      const mediumImpactJournals = await Journal.findByImpactFactorRange(5, 15);
      expect(mediumImpactJournals).toHaveLength(1);
    });

    test('should find by year', async () => {
      const journals2023 = await Journal.findByYear(2023);
      expect(journals2023).toHaveLength(3);
      
      const journals2022 = await Journal.findByYear(2022);
      expect(journals2022).toHaveLength(1);
    });

    test('should search journals', async () => {
      const results = await Journal.search('Nature');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Nature Medicine');
    });

    test('should get statistics', async () => {
      const stats = await Journal.getStatistics();
      expect(stats.total).toBe(4);
      expect(stats.byQuartile).toHaveProperty('Q1');
      expect(stats.byQuartile).toHaveProperty('Q2');
      expect(stats.byQuartile.Q1).toBe(3);
      expect(stats.byQuartile.Q2).toBe(1);
      expect(stats.averageImpactFactor).toBeCloseTo(41.0, 1);
    });

    test('should get top journals by impact factor', async () => {
      const topJournals = await Journal.getTopByImpactFactor(2);
      expect(topJournals).toHaveLength(2);
      expect(topJournals[0].name).toBe('Nature Medicine');
      expect(topJournals[1].name).toBe('Science');
    });

    test('should import from data', async () => {
      const importData = [
        {
          name: 'New Journal 1',
          issn: '1111-2222',
          impactFactor: 15.5,
          quartile: 'Q1',
          category: 'New Category',
          year: 2023
        },
        {
          name: 'New Journal 2',
          issn: '3333-4444',
          impactFactor: 8.2,
          quartile: 'Q2',
          category: 'New Category',
          year: 2023
        }
      ];

      const result = await Journal.importFromData(importData);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      
      const totalJournals = await Journal.count();
      expect(totalJournals).toBe(6); // 4 existing + 2 new
    });
  });

  describe('Associations', () => {
    let testJournal;

    beforeEach(async () => {
      testJournal = await Journal.create({
        name: 'Test Journal',
        issn: '1234-5678',
        impactFactor: 5.0,
        quartile: 'Q2',
        category: 'Test Category',
        year: 2023
      });
    });

    test('should have publications association', async () => {
      // 这个测试需要创建相关的Publication数据
      // 由于Publication模型依赖其他模型，这里只测试关联是否存在
      const journal = await Journal.findByPk(testJournal.id, {
        include: ['publications']
      });

      expect(journal.publications).toBeDefined();
      expect(Array.isArray(journal.publications)).toBe(true);
    });
  });

  describe('Hooks', () => {
    test('should normalize data before create', async () => {
      const journal = await Journal.create({
        name: '  Test Journal  ', // 带空格
        issn: '1234-5678',
        impactFactor: 5.0,
        quartile: 'q1', // 小写
        category: 'Test Category',
        year: 2023
      });

      expect(journal.name).toBe('Test Journal'); // 去除空格
      expect(journal.quartile).toBe('Q1'); // 转换为大写
    });

    test('should validate ISSN format before save', async () => {
      await expect(Journal.create({
        name: 'Test Journal',
        issn: '12345678', // 缺少连字符
        impactFactor: 5.0,
        quartile: 'Q1',
        category: 'Test Category',
        year: 2023
      })).rejects.toThrow('ISSN格式不正确');
    });
  });
});