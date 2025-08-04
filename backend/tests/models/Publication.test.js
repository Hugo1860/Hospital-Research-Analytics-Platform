const { Publication, Journal, Department, User } = require('../../src/models');

describe('Publication Model', () => {
  let testDepartment;
  let testJournal;
  let testUser;

  beforeEach(async () => {
    // 清理测试数据
    await Publication.destroy({ where: {}, force: true });
    await Journal.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });

    // 创建测试数据
    testDepartment = await Department.create({
      name: '心内科',
      code: 'CARDIO'
    });

    testJournal = await Journal.create({
      name: 'Nature Medicine',
      issn: '1078-8956',
      impactFactor: 87.241,
      quartile: 'Q1',
      category: 'Medicine, Research & Experimental',
      year: 2023
    });

    testUser = await User.create({
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com',
      role: 'user',
      departmentId: testDepartment.id
    });
  });

  describe('Validation', () => {
    test('should create a valid publication', async () => {
      const publicationData = {
        title: 'Test Publication Title',
        authors: 'John Doe, Jane Smith',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        volume: '15',
        issue: '3',
        pages: '123-130',
        doi: '10.1038/nm.test.2023',
        pmid: '12345678',
        userId: testUser.id
      };

      const publication = await Publication.create(publicationData);
      
      expect(publication.title).toBe(publicationData.title);
      expect(publication.authors).toBe(publicationData.authors);
      expect(publication.journalId).toBe(publicationData.journalId);
      expect(publication.departmentId).toBe(publicationData.departmentId);
      expect(publication.publishYear).toBe(publicationData.publishYear);
      expect(publication.volume).toBe(publicationData.volume);
      expect(publication.issue).toBe(publicationData.issue);
      expect(publication.pages).toBe(publicationData.pages);
      expect(publication.doi).toBe(publicationData.doi);
      expect(publication.pmid).toBe(publicationData.pmid);
      expect(publication.userId).toBe(publicationData.userId);
    });

    test('should fail validation without required fields', async () => {
      const publicationData = {
        // 缺少必需字段
        authors: 'John Doe',
        journalId: testJournal.id
      };

      await expect(Publication.create(publicationData))
        .rejects
        .toThrow();
    });

    test('should fail validation with invalid year', async () => {
      const publicationData = {
        title: 'Test Publication',
        authors: 'John Doe',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 1800, // 无效年份
        userId: testUser.id
      };

      await expect(Publication.create(publicationData))
        .rejects
        .toThrow('发表年份必须在1900年之后');
    });

    test('should fail validation with future year', async () => {
      const nextYear = new Date().getFullYear() + 2;
      const publicationData = {
        title: 'Test Publication',
        authors: 'John Doe',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: nextYear,
        userId: testUser.id
      };

      await expect(Publication.create(publicationData))
        .rejects
        .toThrow('发表年份不能超过当前年份');
    });

    test('should fail validation with invalid DOI format', async () => {
      const publicationData = {
        title: 'Test Publication',
        authors: 'John Doe',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        doi: 'invalid-doi-format',
        userId: testUser.id
      };

      await expect(Publication.create(publicationData))
        .rejects
        .toThrow('DOI格式不正确');
    });

    test('should fail validation with non-numeric PMID', async () => {
      const publicationData = {
        title: 'Test Publication',
        authors: 'John Doe',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        pmid: 'not-a-number',
        userId: testUser.id
      };

      await expect(Publication.create(publicationData))
        .rejects
        .toThrow('PMID必须是数字');
    });
  });

  describe('Associations', () => {
    let testPublication;

    beforeEach(async () => {
      testPublication = await Publication.create({
        title: 'Test Publication',
        authors: 'John Doe, Jane Smith',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      });
    });

    test('should have journal association', async () => {
      const publication = await Publication.findByPk(testPublication.id, {
        include: ['journal']
      });

      expect(publication.journal).toBeDefined();
      expect(publication.journal.name).toBe('Nature Medicine');
      expect(publication.journal.impactFactor).toBe(87.241);
    });

    test('should have department association', async () => {
      const publication = await Publication.findByPk(testPublication.id, {
        include: ['department']
      });

      expect(publication.department).toBeDefined();
      expect(publication.department.name).toBe('心内科');
    });

    test('should have user association', async () => {
      const publication = await Publication.findByPk(testPublication.id, {
        include: ['user']
      });

      expect(publication.user).toBeDefined();
      expect(publication.user.username).toBe('testuser');
    });
  });

  describe('Instance Methods', () => {
    let testPublication;

    beforeEach(async () => {
      testPublication = await Publication.create({
        title: 'Test Publication',
        authors: 'John Doe, Jane Smith',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      });
    });

    test('should get impact factor from journal', async () => {
      const impactFactor = await testPublication.getImpactFactor();
      expect(impactFactor).toBe(87.241);
    });

    test('should get quartile from journal', async () => {
      const quartile = await testPublication.getQuartile();
      expect(quartile).toBe('Q1');
    });

    test('should format citation correctly', async () => {
      const citation = await testPublication.formatCitation();
      expect(citation).toContain('John Doe, Jane Smith');
      expect(citation).toContain('Test Publication');
      expect(citation).toContain('Nature Medicine');
      expect(citation).toContain('2023');
    });

    test('should check if high impact', async () => {
      const isHighImpact = await testPublication.isHighImpact();
      expect(isHighImpact).toBe(true); // IF > 10
    });
  });

  describe('Class Methods', () => {
    beforeEach(async () => {
      // 创建多个测试文献
      await Publication.bulkCreate([
        {
          title: 'Publication 1',
          authors: 'Author 1',
          journalId: testJournal.id,
          departmentId: testDepartment.id,
          publishYear: 2023,
          userId: testUser.id
        },
        {
          title: 'Publication 2',
          authors: 'Author 2',
          journalId: testJournal.id,
          departmentId: testDepartment.id,
          publishYear: 2022,
          userId: testUser.id
        },
        {
          title: 'Publication 3',
          authors: 'Author 3',
          journalId: testJournal.id,
          departmentId: testDepartment.id,
          publishYear: 2023,
          userId: testUser.id
        }
      ]);
    });

    test('should get publications by year', async () => {
      const publications2023 = await Publication.getByYear(2023);
      expect(publications2023).toHaveLength(2);
      
      const publications2022 = await Publication.getByYear(2022);
      expect(publications2022).toHaveLength(1);
    });

    test('should get publications by department', async () => {
      const publications = await Publication.getByDepartment(testDepartment.id);
      expect(publications).toHaveLength(3);
    });

    test('should get publications by year range', async () => {
      const publications = await Publication.getByYearRange(2022, 2023);
      expect(publications).toHaveLength(3);
    });

    test('should get statistics', async () => {
      const stats = await Publication.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.byYear).toHaveProperty('2023');
      expect(stats.byYear).toHaveProperty('2022');
      expect(stats.byYear['2023']).toBe(2);
      expect(stats.byYear['2022']).toBe(1);
    });

    test('should search publications', async () => {
      const results = await Publication.search('Publication 1');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Publication 1');
    });
  });

  describe('Hooks', () => {
    test('should set default values before create', async () => {
      const publication = await Publication.create({
        title: 'Test Publication',
        authors: 'John Doe',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      });

      expect(publication.createdAt).toBeDefined();
      expect(publication.updatedAt).toBeDefined();
    });

    test('should update timestamp on update', async () => {
      const publication = await Publication.create({
        title: 'Test Publication',
        authors: 'John Doe',
        journalId: testJournal.id,
        departmentId: testDepartment.id,
        publishYear: 2023,
        userId: testUser.id
      });

      const originalUpdatedAt = publication.updatedAt;
      
      // 等待一毫秒确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1));
      
      await publication.update({ title: 'Updated Title' });
      
      expect(publication.updatedAt).not.toEqual(originalUpdatedAt);
    });
  });
});