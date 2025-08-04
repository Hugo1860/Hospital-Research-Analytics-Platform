/**
 * TokenManager 单元测试
 */

import TokenManager from '../tokenManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {})
};

describe('TokenManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
  });

  afterAll(() => {
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
  });

  describe('Token基本操作', () => {
    test('应该能够设置和获取token', () => {
      const testToken = 'test-jwt-token';
      const expiry = Date.now() + 60 * 60 * 1000; // 1小时后过期

      TokenManager.setToken(testToken, expiry);
      
      expect(TokenManager.getToken()).toBe(testToken);
      expect(TokenManager.isTokenValid()).toBe(true);
    });

    test('应该能够移除token', () => {
      const testToken = 'test-jwt-token';
      TokenManager.setToken(testToken);
      
      expect(TokenManager.getToken()).toBe(testToken);
      
      TokenManager.removeToken();
      
      expect(TokenManager.getToken()).toBeNull();
      expect(TokenManager.isTokenValid()).toBe(false);
    });

    test('应该正确处理过期的token', () => {
      const testToken = 'expired-token';
      const expiry = Date.now() - 1000; // 1秒前过期

      TokenManager.setToken(testToken, expiry);
      
      expect(TokenManager.getToken()).toBeNull();
      expect(TokenManager.isTokenValid()).toBe(false);
      expect(TokenManager.isTokenExpired()).toBe(true);
    });
  });

  describe('Token过期检查', () => {
    test('应该正确计算token剩余时间', () => {
      const testToken = 'test-token';
      const expiry = Date.now() + 60 * 1000; // 1分钟后过期

      TokenManager.setToken(testToken, expiry);
      
      const remaining = TokenManager.getTokenRemainingTime();
      expect(remaining).toBeGreaterThan(50 * 1000); // 应该大于50秒
      expect(remaining).toBeLessThanOrEqual(60 * 1000); // 应该小于等于60秒
    });

    test('应该正确检测即将过期的token', () => {
      const testToken = 'expiring-token';
      const expiry = Date.now() + 2 * 60 * 1000; // 2分钟后过期

      TokenManager.setToken(testToken, expiry);
      
      // 默认阈值是5分钟，所以2分钟后过期的token应该被认为即将过期
      expect(TokenManager.isTokenExpiringSoon()).toBe(true);
      
      // 使用1分钟阈值，2分钟后过期的token不应该被认为即将过期
      expect(TokenManager.isTokenExpiringSoon(1 * 60 * 1000)).toBe(false);
    });
  });

  describe('重定向路径管理', () => {
    test('应该能够设置和获取重定向路径', () => {
      const testPath = '/publications/import';
      
      TokenManager.setRedirectPath(testPath);
      
      const retrievedPath = TokenManager.getAndClearRedirectPath();
      expect(retrievedPath).toBe(testPath);
      
      // 再次获取应该返回null，因为已经被清除
      const secondRetrieve = TokenManager.getAndClearRedirectPath();
      expect(secondRetrieve).toBeNull();
    });
  });

  describe('事件监听', () => {
    test('应该能够添加和移除事件监听器', () => {
      const mockListener = jest.fn();
      
      TokenManager.addEventListener(mockListener);
      
      // 设置token应该触发事件
      TokenManager.setToken('test-token');
      expect(mockListener).toHaveBeenCalledWith('token_updated', expect.any(Object));
      
      mockListener.mockClear();
      
      // 移除token应该触发事件
      TokenManager.removeToken();
      expect(mockListener).toHaveBeenCalledWith('token_removed', undefined);
      
      mockListener.mockClear();
      
      // 移除监听器后不应该再触发事件
      TokenManager.removeEventListener(mockListener);
      TokenManager.setToken('another-token');
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('用户信息管理', () => {
    test('应该能够设置和获取用户信息', () => {
      const testUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };

      TokenManager.setUser(testUser);
      
      const retrievedUser = TokenManager.getUser();
      expect(retrievedUser).toEqual(testUser);
    });

    test('设置用户信息应该触发事件', () => {
      const mockListener = jest.fn();
      TokenManager.addEventListener(mockListener);

      const testUser = { id: 1, username: 'test' };
      TokenManager.setUser(testUser);

      expect(mockListener).toHaveBeenCalledWith('user_updated', expect.objectContaining({
        source: 'local',
        user: testUser
      }));

      TokenManager.removeEventListener(mockListener);
    });

    test('应该正确处理无效的用户数据', () => {
      localStorageMock.setItem('auth_user', 'invalid-json');
      
      expect(TokenManager.getUser()).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('跨标签页同步', () => {
    let mockStorageEvent: (event: StorageEvent) => void;

    beforeEach(() => {
      // Mock window.addEventListener
      jest.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
        if (type === 'storage') {
          mockStorageEvent = listener as (event: StorageEvent) => void;
        }
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('应该监听storage事件', () => {
      // TokenManager在初始化时应该添加storage监听器
      expect(window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    test('应该处理跨标签页token更新事件', () => {
      const mockListener = jest.fn();
      TokenManager.addEventListener(mockListener);

      // 模拟其他标签页设置token的storage事件
      const storageEvent = new StorageEvent('storage', {
        key: 'auth_token',
        oldValue: null,
        newValue: 'new-token-from-other-tab',
        storageArea: localStorage,
        url: 'http://localhost:3000'
      });

      mockStorageEvent(storageEvent);

      expect(mockListener).toHaveBeenCalledWith('token_updated', expect.objectContaining({
        source: 'cross_tab',
        token: 'new-token-from-other-tab'
      }));

      TokenManager.removeEventListener(mockListener);
    });

    test('应该处理跨标签页token移除事件', () => {
      const mockListener = jest.fn();
      TokenManager.addEventListener(mockListener);

      // 模拟其他标签页移除token的storage事件
      const storageEvent = new StorageEvent('storage', {
        key: 'auth_token',
        oldValue: 'old-token',
        newValue: null,
        storageArea: localStorage,
        url: 'http://localhost:3000'
      });

      mockStorageEvent(storageEvent);

      expect(mockListener).toHaveBeenCalledWith('token_removed', expect.objectContaining({
        source: 'cross_tab'
      }));

      TokenManager.removeEventListener(mockListener);
    });

    test('应该处理跨标签页用户信息更新事件', () => {
      const mockListener = jest.fn();
      TokenManager.addEventListener(mockListener);

      const newUser = { id: 2, username: 'newuser' };
      const storageEvent = new StorageEvent('storage', {
        key: 'auth_user',
        oldValue: '{"id":1,"username":"olduser"}',
        newValue: JSON.stringify(newUser),
        storageArea: localStorage,
        url: 'http://localhost:3000'
      });

      mockStorageEvent(storageEvent);

      expect(mockListener).toHaveBeenCalledWith('user_updated', expect.objectContaining({
        source: 'cross_tab',
        user: newUser
      }));

      TokenManager.removeEventListener(mockListener);
    });

    test('应该忽略非相关的storage事件', () => {
      const mockListener = jest.fn();
      TokenManager.addEventListener(mockListener);

      // 模拟非认证相关的storage事件
      const storageEvent = new StorageEvent('storage', {
        key: 'some_other_key',
        oldValue: 'old',
        newValue: 'new',
        storageArea: localStorage,
        url: 'http://localhost:3000'
      });

      mockStorageEvent(storageEvent);

      expect(mockListener).not.toHaveBeenCalled();

      TokenManager.removeEventListener(mockListener);
    });
  });

  describe('Token过期检查定时器', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该定期检查token有效性', () => {
      const mockListener = jest.fn();
      TokenManager.addEventListener(mockListener);

      // 设置一个即将过期的token
      const expiry = Date.now() + 30 * 1000; // 30秒后过期
      TokenManager.setToken('expiring-token', expiry);

      mockListener.mockClear();

      // 快进时间到token过期后
      jest.advanceTimersByTime(35 * 1000);

      // 应该触发token_expired事件
      expect(mockListener).toHaveBeenCalledWith('token_expired');

      TokenManager.removeEventListener(mockListener);
    });
  });

  describe('错误处理', () => {
    test('应该正确处理localStorage异常', () => {
      // Mock localStorage抛出异常
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      TokenManager.setToken('test-token');
      
      expect(consoleSpy.error).toHaveBeenCalled();
      
      // 恢复原始方法
      localStorageMock.setItem = originalSetItem;
    });

    test('应该正确处理无效的token数据', () => {
      // 直接设置无效的token数据
      localStorageMock.setItem('auth_token_data', 'invalid-json');
      
      expect(TokenManager.getToken()).toBeNull();
      expect(TokenManager.isTokenValid()).toBe(false);
    });

    test('应该正确处理事件监听器异常', () => {
      const faultyListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      TokenManager.addEventListener(faultyListener);
      
      // 设置token应该不会因为监听器异常而失败
      expect(() => {
        TokenManager.setToken('test-token');
      }).not.toThrow();

      expect(consoleSpy.error).toHaveBeenCalled();
      
      TokenManager.removeEventListener(faultyListener);
    });

    test('应该正确处理storage事件解析异常', () => {
      let mockStorageEvent: (event: StorageEvent) => void;

      jest.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
        if (type === 'storage') {
          mockStorageEvent = listener as (event: StorageEvent) => void;
        }
      });

      // 模拟包含无效JSON的storage事件
      const storageEvent = new StorageEvent('storage', {
        key: 'auth_token_data',
        oldValue: null,
        newValue: 'invalid-json',
        storageArea: localStorage,
        url: 'http://localhost:3000'
      });

      expect(() => {
        mockStorageEvent!(storageEvent);
      }).not.toThrow();

      expect(consoleSpy.error).toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('资源清理', () => {
    test('destroy方法应该清理所有资源', () => {
      const mockListener = jest.fn();
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      TokenManager.addEventListener(mockListener);
      
      // 调用destroy方法
      TokenManager.destroy();
      
      // 应该移除window事件监听器
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
      
      // 设置token后不应该触发事件（监听器已被清除）
      TokenManager.setToken('test-token');
      expect(mockListener).not.toHaveBeenCalled();
      
      removeEventListenerSpy.mockRestore();
    });
  });
});