const {
  validateEmail,
  validatePassword,
  generateRandomString,
  formatDate,
  calculateImpactFactorCategory,
  parseExcelDate,
  sanitizeInput,
  generateSlug,
  isValidDOI,
  isValidISSN,
  calculateAge,
  formatFileSize,
  validatePhoneNumber,
  hashPassword,
  comparePassword
} = require('../../src/utils/helpers');

describe('Helper Functions', () => {
  describe('validateEmail', () => {
    test('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
      expect(validateEmail('123@456.com')).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test..test@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('should validate strong passwords', () => {
      expect(validatePassword('Password123!')).toBe(true);
      expect(validatePassword('MySecure@Pass1')).toBe(true);
      expect(validatePassword('Complex#Pass99')).toBe(true);
    });

    test('should reject weak passwords', () => {
      expect(validatePassword('123456')).toBe(false); // 太短
      expect(validatePassword('password')).toBe(false); // 没有数字和特殊字符
      expect(validatePassword('PASSWORD123')).toBe(false); // 没有小写字母
      expect(validatePassword('password123')).toBe(false); // 没有大写字母
      expect(validatePassword('Password')).toBe(false); // 没有数字
      expect(validatePassword('')).toBe(false);
      expect(validatePassword(null)).toBe(false);
    });
  });

  describe('generateRandomString', () => {
    test('should generate string of specified length', () => {
      expect(generateRandomString(10)).toHaveLength(10);
      expect(generateRandomString(20)).toHaveLength(20);
      expect(generateRandomString(5)).toHaveLength(5);
    });

    test('should generate different strings', () => {
      const str1 = generateRandomString(10);
      const str2 = generateRandomString(10);
      expect(str1).not.toBe(str2);
    });

    test('should contain only alphanumeric characters', () => {
      const str = generateRandomString(100);
      expect(str).toMatch(/^[a-zA-Z0-9]+$/);
    });

    test('should handle edge cases', () => {
      expect(generateRandomString(0)).toBe('');
      expect(generateRandomString(1)).toHaveLength(1);
    });
  });

  describe('formatDate', () => {
    test('should format dates correctly', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2023-12-25');
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('25/12/2023');
      expect(formatDate(date, 'YYYY年MM月DD日')).toBe('2023年12月25日');
    });

    test('should handle string dates', () => {
      expect(formatDate('2023-12-25', 'YYYY-MM-DD')).toBe('2023-12-25');
    });

    test('should handle invalid dates', () => {
      expect(formatDate('invalid-date', 'YYYY-MM-DD')).toBe('Invalid Date');
      expect(formatDate(null, 'YYYY-MM-DD')).toBe('Invalid Date');
      expect(formatDate(undefined, 'YYYY-MM-DD')).toBe('Invalid Date');
    });

    test('should use default format', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('calculateImpactFactorCategory', () => {
    test('should categorize impact factors correctly', () => {
      expect(calculateImpactFactorCategory(0.5)).toBe('very_low');
      expect(calculateImpactFactorCategory(1.5)).toBe('low');
      expect(calculateImpactFactorCategory(3.5)).toBe('medium');
      expect(calculateImpactFactorCategory(7.5)).toBe('high');
      expect(calculateImpactFactorCategory(15.0)).toBe('very_high');
    });

    test('should handle edge cases', () => {
      expect(calculateImpactFactorCategory(0)).toBe('very_low');
      expect(calculateImpactFactorCategory(1)).toBe('very_low');
      expect(calculateImpactFactorCategory(2)).toBe('low');
      expect(calculateImpactFactorCategory(5)).toBe('medium');
      expect(calculateImpactFactorCategory(10)).toBe('high');
    });

    test('should handle invalid inputs', () => {
      expect(calculateImpactFactorCategory(-1)).toBe('very_low');
      expect(calculateImpactFactorCategory(null)).toBe('very_low');
      expect(calculateImpactFactorCategory(undefined)).toBe('very_low');
      expect(calculateImpactFactorCategory('invalid')).toBe('very_low');
    });
  });

  describe('parseExcelDate', () => {
    test('should parse Excel serial dates', () => {
      // Excel日期序列号44927对应2023-01-01
      const date = parseExcelDate(44927);
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(0); // 0-based month
      expect(date.getDate()).toBe(1);
    });

    test('should handle string dates', () => {
      const date = parseExcelDate('2023-01-01');
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(1);
    });

    test('should handle Date objects', () => {
      const inputDate = new Date('2023-01-01');
      const outputDate = parseExcelDate(inputDate);
      expect(outputDate).toEqual(inputDate);
    });

    test('should handle invalid inputs', () => {
      expect(() => parseExcelDate('invalid')).toThrow();
      expect(() => parseExcelDate(null)).toThrow();
      expect(() => parseExcelDate(undefined)).toThrow();
    });
  });

  describe('sanitizeInput', () => {
    test('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>test')).toBe('test');
      expect(sanitizeInput('<b>bold</b> text')).toBe('bold text');
      expect(sanitizeInput('<div><p>nested</p></div>')).toBe('nested');
    });

    test('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('\n\ttest\n\t')).toBe('test');
    });

    test('should handle special characters', () => {
      expect(sanitizeInput('test & test')).toBe('test & test');
      expect(sanitizeInput('test "quotes" test')).toBe('test "quotes" test');
    });

    test('should handle empty and null inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });
  });

  describe('generateSlug', () => {
    test('should generate URL-friendly slugs', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('Test Article Title')).toBe('test-article-title');
      expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
    });

    test('should handle special characters', () => {
      expect(generateSlug('Test & Article!')).toBe('test-article');
      expect(generateSlug('Article (2023)')).toBe('article-2023');
      expect(generateSlug('Test@Email.com')).toBe('testemailcom');
    });

    test('should handle Chinese characters', () => {
      expect(generateSlug('测试文章标题')).toBe('测试文章标题');
      expect(generateSlug('Test 测试 Article')).toBe('test-测试-article');
    });

    test('should handle empty inputs', () => {
      expect(generateSlug('')).toBe('');
      expect(generateSlug(null)).toBe('');
      expect(generateSlug(undefined)).toBe('');
    });
  });

  describe('isValidDOI', () => {
    test('should validate correct DOI formats', () => {
      expect(isValidDOI('10.1038/nature12373')).toBe(true);
      expect(isValidDOI('10.1016/j.cell.2023.01.001')).toBe(true);
      expect(isValidDOI('10.1126/science.abc1234')).toBe(true);
      expect(isValidDOI('10.1371/journal.pone.0123456')).toBe(true);
    });

    test('should reject invalid DOI formats', () => {
      expect(isValidDOI('invalid-doi')).toBe(false);
      expect(isValidDOI('10.1038')).toBe(false);
      expect(isValidDOI('doi:10.1038/nature12373')).toBe(false);
      expect(isValidDOI('')).toBe(false);
      expect(isValidDOI(null)).toBe(false);
      expect(isValidDOI(undefined)).toBe(false);
    });
  });

  describe('isValidISSN', () => {
    test('should validate correct ISSN formats', () => {
      expect(isValidISSN('1234-5678')).toBe(true);
      expect(isValidISSN('0028-0836')).toBe(true);
      expect(isValidISSN('1078-8956')).toBe(true);
    });

    test('should reject invalid ISSN formats', () => {
      expect(isValidISSN('12345678')).toBe(false);
      expect(isValidISSN('1234-567')).toBe(false);
      expect(isValidISSN('1234-567a')).toBe(false);
      expect(isValidISSN('invalid-issn')).toBe(false);
      expect(isValidISSN('')).toBe(false);
      expect(isValidISSN(null)).toBe(false);
    });
  });

  describe('calculateAge', () => {
    test('should calculate age correctly', () => {
      const birthDate = new Date('1990-01-01');
      const referenceDate = new Date('2023-01-01');
      expect(calculateAge(birthDate, referenceDate)).toBe(33);
    });

    test('should handle birthday not yet passed', () => {
      const birthDate = new Date('1990-06-15');
      const referenceDate = new Date('2023-03-01');
      expect(calculateAge(birthDate, referenceDate)).toBe(32);
    });

    test('should handle birthday already passed', () => {
      const birthDate = new Date('1990-03-15');
      const referenceDate = new Date('2023-06-01');
      expect(calculateAge(birthDate, referenceDate)).toBe(33);
    });

    test('should use current date as default reference', () => {
      const birthDate = new Date('1990-01-01');
      const age = calculateAge(birthDate);
      expect(age).toBeGreaterThan(30);
    });
  });

  describe('formatFileSize', () => {
    test('should format file sizes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1048576)).toBe('1.00 MB');
      expect(formatFileSize(1073741824)).toBe('1.00 GB');
      expect(formatFileSize(500)).toBe('500 B');
    });

    test('should handle decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.50 KB');
      expect(formatFileSize(2621440)).toBe('2.50 MB');
    });

    test('should handle zero and negative values', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(-1024)).toBe('0 B');
    });
  });

  describe('validatePhoneNumber', () => {
    test('should validate Chinese phone numbers', () => {
      expect(validatePhoneNumber('13812345678')).toBe(true);
      expect(validatePhoneNumber('15987654321')).toBe(true);
      expect(validatePhoneNumber('18611112222')).toBe(true);
    });

    test('should validate international formats', () => {
      expect(validatePhoneNumber('+86 138 1234 5678')).toBe(true);
      expect(validatePhoneNumber('+1-555-123-4567')).toBe(true);
      expect(validatePhoneNumber('+44 20 7946 0958')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('12345')).toBe(false);
      expect(validatePhoneNumber('abcdefghijk')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber(null)).toBe(false);
    });
  });

  describe('hashPassword', () => {
    test('should hash passwords', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    test('should verify correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    test('should handle invalid hash', async () => {
      const password = 'testpassword123';
      const invalidHash = 'invalid-hash';
      
      const isValid = await comparePassword(password, invalidHash);
      expect(isValid).toBe(false);
    });
  });
});