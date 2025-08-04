// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (at least 6 characters)
export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

// Username validation (alphanumeric and underscore, 3-20 characters)
export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

// DOI validation
export const validateDOI = (doi: string): boolean => {
  if (!doi) return true; // DOI is optional
  const doiRegex = /^10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+$/;
  return doiRegex.test(doi);
};

// PMID validation (numeric)
export const validatePMID = (pmid: string): boolean => {
  if (!pmid) return true; // PMID is optional
  const pmidRegex = /^\d+$/;
  return pmidRegex.test(pmid);
};

// Year validation (1900 to current year)
export const validateYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear;
};

// Impact factor validation (0 to 50)
export const validateImpactFactor = (factor: number): boolean => {
  return factor >= 0 && factor <= 50;
};

// Required field validation
export const validateRequired = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

// Form validation rules for Ant Design
export const formRules = {
  required: {
    required: true,
    message: '此字段为必填项',
  },
  email: {
    type: 'email' as const,
    message: '请输入有效的邮箱地址',
  },
  password: {
    min: 6,
    message: '密码至少需要6个字符',
  },
  username: {
    pattern: /^[a-zA-Z0-9_]{3,20}$/,
    message: '用户名只能包含字母、数字和下划线，长度3-20个字符',
  },
  year: {
    type: 'number' as const,
    min: 1900,
    max: new Date().getFullYear(),
    message: `年份必须在1900到${new Date().getFullYear()}之间`,
  },
  impactFactor: {
    type: 'number' as const,
    min: 0,
    max: 50,
    message: '影响因子必须在0到50之间',
  },
};