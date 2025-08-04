import { authAPI } from '../services/api';

// 用户名可用性检查
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    // 这里应该调用实际的API来检查用户名是否可用
    // 暂时使用模拟逻辑
    
    // 模拟一些已存在的用户名
    const existingUsernames = ['admin', 'test', 'user', 'manager', 'demo'];
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return !existingUsernames.includes(username.toLowerCase());
  } catch (error) {
    // 如果检查失败，默认认为可用
    return true;
  }
};

// 邮箱可用性检查
export const checkEmailAvailability = async (email: string): Promise<boolean> => {
  try {
    // 这里应该调用实际的API来检查邮箱是否可用
    // 暂时使用模拟逻辑
    
    // 模拟一些已存在的邮箱
    const existingEmails = ['admin@hospital.com', 'test@hospital.com', 'user@hospital.com'];
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return !existingEmails.includes(email.toLowerCase());
  } catch (error) {
    // 如果检查失败，默认认为可用
    return true;
  }
};

// 密码强度检查
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  // 长度检查
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('密码长度至少8个字符');
  }

  // 包含小写字母
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('包含小写字母');
  }

  // 包含大写字母
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('包含大写字母');
  }

  // 包含数字
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('包含数字');
  }

  // 包含特殊字符
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('包含特殊字符');
  }

  return {
    score,
    feedback,
    isStrong: score >= 3,
  };
};