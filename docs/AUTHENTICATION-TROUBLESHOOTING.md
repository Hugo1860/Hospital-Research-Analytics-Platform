# 认证问题故障排除指南

## 概述

本文档提供了协和医院SCI期刊分析系统认证相关问题的诊断和解决方案。按照问题类型分类，提供详细的排查步骤和解决方法。

## 常见问题分类

### 🔐 登录问题

#### 问题1: 无法登录 - "用户名或密码错误"

**症状**:
- 输入正确的用户名和密码后显示错误提示
- 登录按钮点击后没有反应

**可能原因**:
1. 后端服务未启动
2. 数据库连接问题
3. 用户账户被禁用
4. 密码加密方式不匹配

**排查步骤**:

```bash
# 1. 检查后端服务状态
curl -f http://localhost:3002/api/health
# 期望返回: {"success": true, "data": {"status": "ok"}}

# 2. 检查数据库连接
# 查看后端日志中是否有数据库连接错误

# 3. 检查用户账户状态
# 在数据库中查询用户信息
SELECT id, username, email, role, isActive FROM users WHERE username = 'your_username';
```

**解决方案**:

```javascript
// 开发环境：使用演示账户
// 用户名: admin
// 密码: password123

// 生产环境：检查用户表
// 1. 确保用户存在且isActive = true
// 2. 重置密码（如果需要）
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash('newPassword', 12);
// 更新数据库中的密码
```

#### 问题2: 登录成功但立即退出

**症状**:
- 登录成功提示出现
- 立即跳转回登录页面
- 控制台显示token验证失败

**可能原因**:
1. Token格式错误
2. Token验证API失败
3. 用户信息获取失败

**排查步骤**:

```javascript
// 1. 检查localStorage中的token
console.log('Token:', localStorage.getItem('auth_token'));
console.log('Token Data:', localStorage.getItem('auth_token_data'));

// 2. 手动验证token
const token = localStorage.getItem('auth_token');
fetch('/api/auth/validate', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(response => response.json())
.then(data => console.log('Token validation:', data));

// 3. 检查token过期时间
import tokenManager from '../utils/tokenManager';
console.log('Token valid:', tokenManager.isTokenValid());
console.log('Token expiry:', new Date(tokenManager.getTokenExpiry()));
```

**解决方案**:

```javascript
// 1. 清除损坏的token数据
localStorage.removeItem('auth_token');
localStorage.removeItem('auth_token_data');
localStorage.removeItem('auth_user');

// 2. 重新登录
// 3. 如果问题持续，检查后端token验证逻辑
```

### 🔄 Token相关问题

#### 问题3: Token频繁过期

**症状**:
- 用户需要频繁重新登录
- 操作过程中突然跳转到登录页面
- 控制台显示"Token expired"错误

**可能原因**:
1. Token过期时间设置过短
2. 系统时间不同步
3. Token刷新机制失效

**排查步骤**:

```javascript
// 1. 检查token过期时间设置
console.log('Token expiry:', tokenManager.getTokenExpiry());
console.log('Current time:', Date.now());
console.log('Remaining time:', tokenManager.getTokenRemainingTime());

// 2. 检查token刷新配置
// 在后端检查JWT_EXPIRES_IN环境变量

// 3. 验证系统时间
console.log('Client time:', new Date().toISOString());
// 与服务器时间对比
```

**解决方案**:

```javascript
// 1. 调整token过期时间（后端）
// .env文件中设置
JWT_EXPIRES_IN=24h  // 24小时

// 2. 启用自动刷新（前端）
// TokenManager会自动处理即将过期的token
const refreshResult = await tokenManager.refreshToken();

// 3. 同步系统时间
// 确保客户端和服务器时间一致
```

#### 问题4: 跨标签页状态不同步

**症状**:
- 在一个标签页登录，其他标签页未同步
- 在一个标签页登出，其他标签页仍显示已登录
- 多个标签页显示不同的用户状态

**可能原因**:
1. localStorage事件监听器未正确设置
2. 浏览器隐私模式或扩展程序干扰
3. TokenManager事件处理逻辑错误

**排查步骤**:

```javascript
// 1. 检查storage事件监听器
console.log('Storage listeners:', window.addEventListener.toString());

// 2. 手动触发storage事件测试
// 在一个标签页执行
localStorage.setItem('test_sync', Date.now().toString());
// 在另一个标签页检查是否收到事件

// 3. 检查TokenManager事件监听器
import tokenManager from '../utils/tokenManager';
tokenManager.addEventListener((eventType, data) => {
  console.log('TokenManager event:', eventType, data);
});
```

**解决方案**:

```javascript
// 1. 重新初始化TokenManager
tokenManager.destroy();
// 刷新页面重新初始化

// 2. 检查浏览器设置
// 确保未启用隐私模式
// 禁用可能干扰的浏览器扩展

// 3. 手动同步状态
// 在AuthContext中添加手动同步方法
const syncAuthState = () => {
  const token = tokenManager.getToken();
  const user = tokenManager.getUser();
  if (token && user) {
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
  }
};
```

### 🚫 权限问题

#### 问题5: 权限检查失败

**症状**:
- 用户无法访问应有权限的功能
- 页面显示"权限不足"错误
- 按钮或菜单项不显示

**可能原因**:
1. 用户角色配置错误
2. 权限检查逻辑错误
3. 权限缓存问题

**排查步骤**:

```javascript
// 1. 检查用户角色和权限
const { state, hasPermission, hasRole } = useAuth();
console.log('User:', state.user);
console.log('User role:', state.user?.role);

// 2. 测试权限检查
console.log('Can read publications:', hasPermission('publications', 'read'));
console.log('Can create publications:', hasPermission('publications', 'create'));
console.log('Is admin:', hasRole('admin'));

// 3. 检查权限缓存
console.log('Permission cache:', window.__PERMISSION_CACHE__);
```

**解决方案**:

```javascript
// 1. 清除权限缓存
delete window.__PERMISSION_CACHE__;

// 2. 更新用户角色（数据库）
UPDATE users SET role = 'admin' WHERE username = 'your_username';

// 3. 重新登录以刷新权限
tokenManager.removeToken();
// 用户重新登录
```

#### 问题6: API请求权限被拒绝

**症状**:
- API请求返回403错误
- 控制台显示"Permission denied"
- 前端权限检查通过但API调用失败

**可能原因**:
1. 后端权限验证逻辑与前端不一致
2. Token中的用户信息过期
3. 中间件权限检查错误

**排查步骤**:

```javascript
// 1. 检查API请求头
// 在浏览器开发者工具Network标签中查看请求
// 确认Authorization头是否正确

// 2. 验证token内容
const token = tokenManager.getToken();
// 使用jwt.io解码token查看payload

// 3. 测试API权限
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3002/api/publications
```

**解决方案**:

```javascript
// 1. 同步前后端权限逻辑
// 确保前端hasPermission函数与后端中间件一致

// 2. 刷新用户信息
const response = await authAPI.getCurrentUser();
const user = response.data.data.user;
tokenManager.setUser(user);

// 3. 检查后端权限中间件
// 确保中间件正确解析token和验证权限
```

### 🌐 网络问题

#### 问题7: 网络请求失败

**症状**:
- 登录时显示"网络连接异常"
- API请求超时
- 间歇性连接问题

**可能原因**:
1. 后端服务未启动或崩溃
2. 网络连接问题
3. CORS配置错误
4. 防火墙或代理问题

**排查步骤**:

```bash
# 1. 检查后端服务状态
ps aux | grep node
netstat -tlnp | grep 3002

# 2. 测试网络连接
curl -v http://localhost:3002/api/health
ping localhost

# 3. 检查CORS配置
# 在浏览器开发者工具Console中查看CORS错误
```

**解决方案**:

```javascript
// 1. 启动后端服务
cd backend
npm start

// 2. 配置CORS（后端）
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// 3. 配置代理（前端开发环境）
// package.json中添加
"proxy": "http://localhost:3002"
```

### 🔧 开发环境问题

#### 问题8: 开发环境认证问题

**症状**:
- 开发环境下认证功能异常
- 热重载后认证状态丢失
- 环境变量配置问题

**可能原因**:
1. 环境变量未正确设置
2. 开发服务器配置问题
3. 模块热替换影响

**排查步骤**:

```javascript
// 1. 检查环境变量
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('Environment:', process.env.NODE_ENV);

// 2. 检查开发服务器配置
// 查看package.json中的scripts配置

// 3. 测试模块热替换
// 修改认证相关代码，观察是否正确重载
```

**解决方案**:

```bash
# 1. 设置环境变量
# .env.development文件
REACT_APP_API_URL=http://localhost:3002/api
REACT_APP_ENV=development

# 2. 重启开发服务器
npm start

# 3. 清除浏览器缓存
# 在开发者工具中右键刷新按钮选择"清空缓存并硬性重新加载"
```

## 诊断工具

### 1. 认证状态检查器

```javascript
// 在浏览器控制台中运行
const checkAuthStatus = () => {
  console.group('🔍 认证状态诊断');
  
  // Token信息
  const token = localStorage.getItem('auth_token');
  const tokenData = localStorage.getItem('auth_token_data');
  const user = localStorage.getItem('auth_user');
  
  console.log('Token存在:', !!token);
  console.log('Token数据:', tokenData ? JSON.parse(tokenData) : null);
  console.log('用户信息:', user ? JSON.parse(user) : null);
  
  // TokenManager状态
  import('../utils/tokenManager').then(({ default: tokenManager }) => {
    console.log('Token有效:', tokenManager.isTokenValid());
    console.log('Token过期时间:', new Date(tokenManager.getTokenExpiry()));
    console.log('剩余时间:', tokenManager.getTokenRemainingTime() / 1000 / 60, '分钟');
    console.log('性能指标:', tokenManager.getPerformanceMetrics());
  });
  
  console.groupEnd();
};

// 运行诊断
checkAuthStatus();
```

### 2. 权限检查器

```javascript
const checkPermissions = (username) => {
  console.group('🔐 权限诊断');
  
  // 获取用户信息
  fetch(`/api/users?username=${username}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
  })
  .then(response => response.json())
  .then(data => {
    const user = data.data[0];
    console.log('用户角色:', user.role);
    console.log('所属科室:', user.department);
    
    // 测试各种权限
    const permissions = [
      ['publications', 'read'],
      ['publications', 'create'],
      ['publications', 'update'],
      ['publications', 'delete'],
      ['journals', 'read'],
      ['users', 'read'],
      ['statistics', 'read']
    ];
    
    permissions.forEach(([resource, action]) => {
      // 这里需要导入hasPermission函数
      console.log(`${resource}:${action}:`, 'TODO: 检查权限');
    });
  })
  .catch(error => console.error('权限检查失败:', error));
  
  console.groupEnd();
};
```

### 3. 网络连接测试

```javascript
const testNetworkConnection = async () => {
  console.group('🌐 网络连接测试');
  
  const endpoints = [
    '/api/health',
    '/api/auth/validate',
    '/api/users',
    '/api/publications'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      console.log(`${endpoint}:`, response.status, response.statusText);
    } catch (error) {
      console.error(`${endpoint}:`, error.message);
    }
  }
  
  console.groupEnd();
};
```

## 性能诊断

### 内存使用检查

```javascript
const checkMemoryUsage = () => {
  console.group('💾 内存使用诊断');
  
  if (performance.memory) {
    const memory = performance.memory;
    console.log('已使用内存:', (memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('总内存:', (memory.totalJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('内存限制:', (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2), 'MB');
    console.log('使用率:', ((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100).toFixed(1), '%');
  } else {
    console.log('浏览器不支持内存API');
  }
  
  // 检查缓存大小
  console.log('localStorage大小:', JSON.stringify(localStorage).length, 'bytes');
  console.log('权限缓存项数:', Object.keys(window.__PERMISSION_CACHE__ || {}).length);
  
  console.groupEnd();
};
```

### 缓存性能检查

```javascript
const checkCachePerformance = () => {
  console.group('⚡ 缓存性能诊断');
  
  // TokenManager性能指标
  import('../utils/tokenManager').then(({ default: tokenManager }) => {
    const metrics = tokenManager.getPerformanceMetrics();
    console.log('Token缓存命中率:', (metrics.cacheHitRate * 100).toFixed(1), '%');
    console.log('缓存命中次数:', metrics.cacheHits);
    console.log('缓存未命中次数:', metrics.cacheMisses);
    console.log('去重请求次数:', metrics.duplicateRequestsPrevented);
  });
  
  // 请求管理器性能指标
  import('../services/enhancedApi').then(({ cacheManager }) => {
    const metrics = cacheManager.getMetrics();
    console.log('请求缓存大小:', metrics.cacheSize);
    console.log('活跃请求数:', metrics.activeRequests);
    console.log('队列请求数:', metrics.queuedRequests);
  });
  
  console.groupEnd();
};
```

## 预防措施

### 1. 监控和告警

```javascript
// 设置认证错误监控
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.response?.status === 401) {
    console.warn('检测到认证错误:', event.reason);
    // 发送错误报告到监控系统
  }
});

// 定期健康检查
setInterval(async () => {
  try {
    await fetch('/api/health');
  } catch (error) {
    console.error('健康检查失败:', error);
    // 触发告警
  }
}, 5 * 60 * 1000); // 每5分钟检查一次
```

### 2. 自动恢复机制

```javascript
// 自动重连机制
const autoReconnect = async () => {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      await fetch('/api/health');
      console.log('连接恢复');
      break;
    } catch (error) {
      retryCount++;
      console.log(`重连尝试 ${retryCount}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
    }
  }
};
```

### 3. 数据备份和恢复

```javascript
// 备份认证状态
const backupAuthState = () => {
  const authState = {
    token: localStorage.getItem('auth_token'),
    tokenData: localStorage.getItem('auth_token_data'),
    user: localStorage.getItem('auth_user'),
    timestamp: Date.now()
  };
  
  sessionStorage.setItem('auth_backup', JSON.stringify(authState));
};

// 恢复认证状态
const restoreAuthState = () => {
  const backup = sessionStorage.getItem('auth_backup');
  if (backup) {
    const authState = JSON.parse(backup);
    
    // 检查备份是否过期（1小时）
    if (Date.now() - authState.timestamp < 3600000) {
      localStorage.setItem('auth_token', authState.token);
      localStorage.setItem('auth_token_data', authState.tokenData);
      localStorage.setItem('auth_user', authState.user);
      
      console.log('认证状态已从备份恢复');
      return true;
    }
  }
  return false;
};
```

## 联系支持

如果以上解决方案无法解决您的问题，请联系技术支持：

- **邮箱**: tech-support@hospital.com
- **电话**: 400-123-4567
- **工单系统**: https://support.hospital.com

提交问题时，请包含以下信息：
1. 问题详细描述
2. 重现步骤
3. 浏览器和版本信息
4. 控制台错误日志
5. 网络请求日志（如适用）

---

**最后更新**: 2024-01-31  
**版本**: v2.0.0