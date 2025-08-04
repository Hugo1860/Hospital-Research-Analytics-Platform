// 前端安全工具

// XSS 防护
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

// 输入验证
export const validateInput = {
  // 邮箱验证
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 密码强度验证
  password: (password: string): { isValid: boolean; strength: number; issues: string[] } => {
    const issues: string[] = [];
    let strength = 0;

    if (password.length < 8) {
      issues.push('密码长度至少8位');
    } else {
      strength += 1;
    }

    if (!/[a-z]/.test(password)) {
      issues.push('需要包含小写字母');
    } else {
      strength += 1;
    }

    if (!/[A-Z]/.test(password)) {
      issues.push('需要包含大写字母');
    } else {
      strength += 1;
    }

    if (!/\d/.test(password)) {
      issues.push('需要包含数字');
    } else {
      strength += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push('需要包含特殊字符');
    } else {
      strength += 1;
    }

    return {
      isValid: issues.length === 0,
      strength,
      issues
    };
  },

  // 用户名验证
  username: (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  },

  // 手机号验证
  phone: (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // URL验证
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

// CSRF 防护
export class CSRFProtection {
  private static token: string | null = null;

  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    this.token = token;
    return token;
  }

  static getToken(): string | null {
    return this.token;
  }

  static validateToken(token: string): boolean {
    return this.token === token;
  }

  static clearToken(): void {
    this.token = null;
  }
}

// 安全存储
export class SecureStorage {
  private static readonly PREFIX = 'hospital_journal_';

  // 加密存储 (简单的Base64编码，生产环境应使用更强的加密)
  static setItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value);
      const encoded = btoa(serialized);
      localStorage.setItem(this.PREFIX + key, encoded);
    } catch (error) {
      console.error('Failed to store item:', error);
    }
  }

  static getItem<T>(key: string): T | null {
    try {
      const encoded = localStorage.getItem(this.PREFIX + key);
      if (!encoded) return null;
      
      const serialized = atob(encoded);
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Failed to retrieve item:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }

  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // 会话存储
  static setSessionItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value);
      const encoded = btoa(serialized);
      sessionStorage.setItem(this.PREFIX + key, encoded);
    } catch (error) {
      console.error('Failed to store session item:', error);
    }
  }

  static getSessionItem<T>(key: string): T | null {
    try {
      const encoded = sessionStorage.getItem(this.PREFIX + key);
      if (!encoded) return null;
      
      const serialized = atob(encoded);
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Failed to retrieve session item:', error);
      return null;
    }
  }
}

// 内容安全策略
export const ContentSecurityPolicy = {
  // 检查是否允许内联脚本
  allowInlineScript: (): boolean => {
    try {
      eval('1');
      return true;
    } catch {
      return false;
    }
  },

  // 检查是否允许eval
  allowEval: (): boolean => {
    try {
      // eslint-disable-next-line no-eval
      eval('1');
      return true;
    } catch {
      return false;
    }
  },

  // 报告CSP违规
  reportViolation: (violation: any): void => {
    console.warn('CSP Violation:', violation);
    // 在生产环境中，应该将违规报告发送到服务器
  }
};

// 安全的DOM操作
export const secureDOMUtils = {
  // 安全地设置innerHTML
  setInnerHTML: (element: Element, html: string): void => {
    element.textContent = ''; // 清空现有内容
    const sanitized = sanitizeHtml(html);
    element.innerHTML = sanitized;
  },

  // 安全地创建元素
  createElement: (tagName: string, attributes: Record<string, string> = {}): HTMLElement => {
    const element = document.createElement(tagName);
    
    Object.entries(attributes).forEach(([key, value]) => {
      // 过滤危险属性
      if (!['onclick', 'onload', 'onerror', 'onmouseover'].includes(key.toLowerCase())) {
        element.setAttribute(key, value);
      }
    });
    
    return element;
  },

  // 安全地添加事件监听器
  addEventListener: (
    element: Element,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void => {
    // 记录事件监听器以便后续清理
    const detector = MemoryLeakDetector.getInstance();
    detector.trackEventListener(element, event);
    
    element.addEventListener(event, handler, options);
  }
};

// 请求安全
export const secureRequest = {
  // 安全的fetch包装
  fetch: async (url: string, options: RequestInit = {}): Promise<Response> => {
    const csrfToken = CSRFProtection.getToken();
    
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
      },
      credentials: 'include' // 包含cookies
    };

    // 验证URL
    if (!validateInput.url(url)) {
      throw new Error('Invalid URL');
    }

    return fetch(url, secureOptions);
  },

  // 文件上传安全检查
  validateFile: (file: File): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/pdf'
    ];

    if (file.size > maxSize) {
      errors.push('文件大小不能超过10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('不支持的文件类型');
    }

    // 检查文件名
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      errors.push('文件名包含非法字符');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// 安全配置
export const securityConfig = {
  // 密码策略
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90天
    historyCount: 5 // 不能重复使用最近5个密码
  },

  // 会话配置
  session: {
    timeout: 2 * 60 * 60 * 1000, // 2小时
    warningTime: 10 * 60 * 1000, // 10分钟前警告
    maxConcurrentSessions: 3
  },

  // 文件上传限制
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.xlsx', '.xls', '.csv', '.pdf'],
    scanForVirus: true
  }
};

// 导入MemoryLeakDetector (假设已在performance.ts中定义)
import { MemoryLeakDetector } from './performance';