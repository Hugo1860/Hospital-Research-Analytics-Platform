# 集成测试和端到端测试文档

## 概述

本文档描述了协和医院SCI期刊分析系统的集成测试和端到端测试实现，涵盖了认证流程、权限控制、文件上传、错误处理等关键功能的测试。

## 测试架构

### 测试类型

1. **单元测试** - 测试单个组件或函数的功能
2. **集成测试** - 测试多个组件或服务之间的交互
3. **端到端测试** - 测试完整的用户流程

### 测试工具

- **前端集成测试**: React Testing Library + MSW (Mock Service Worker)
- **后端集成测试**: Jest + Supertest
- **端到端测试**: Playwright
- **测试数据库**: MySQL (独立的测试数据库)

## 测试覆盖范围

### 认证流程测试

#### 1. 登录流程
- ✅ 正确的用户名和密码登录成功
- ✅ 错误的密码登录失败
- ✅ 不存在的用户登录失败
- ✅ Token正确保存到localStorage
- ✅ 登录成功后跳转到仪表板

#### 2. Token验证
- ✅ 有效token通过验证
- ✅ 无效token返回401错误
- ✅ 过期token返回401错误
- ✅ 缺少Authorization头返回401错误

#### 3. Token刷新
- ✅ 即将过期的token可以刷新
- ✅ 已过期的token不能刷新
- ✅ 自动token刷新机制

#### 4. 跨标签页状态同步
- ✅ 登录状态在多个标签页间同步
- ✅ 登出状态在多个标签页间同步
- ✅ Token更新在多个标签页间同步

### 权限控制测试

#### 1. 角色权限
- ✅ 管理员可以访问所有功能
- ✅ 科室管理员只能管理本科室数据
- ✅ 普通用户只能查看数据
- ✅ 权限不足时显示错误页面

#### 2. API权限
- ✅ 受保护的API需要认证
- ✅ 不同角色的API访问权限控制
- ✅ 文件上传请求的权限验证

### 文献管理测试

#### 1. 文献CRUD操作
- ✅ 创建文献记录
- ✅ 查询文献列表
- ✅ 更新文献信息
- ✅ 删除文献记录

#### 2. 批量导入功能
- ✅ Excel文件上传和解析
- ✅ 数据验证和错误处理
- ✅ 导入结果反馈
- ✅ 重复数据处理

#### 3. 期刊自动匹配
- ✅ 期刊名称智能匹配
- ✅ 影响因子自动获取
- ✅ 分区信息自动填充

### 错误处理测试

#### 1. 网络错误
- ✅ 网络连接异常处理
- ✅ 服务器错误处理
- ✅ 超时错误处理
- ✅ 错误重试机制

#### 2. 认证错误
- ✅ Token过期自动处理
- ✅ 权限不足错误提示
- ✅ 登录失败错误提示

#### 3. 数据验证错误
- ✅ 表单验证错误提示
- ✅ 文件格式错误处理
- ✅ 数据完整性验证

## 测试文件结构

```
frontend/
├── src/
│   ├── __tests__/
│   │   ├── integration/
│   │   │   └── auth-flow.test.tsx          # 前端集成测试
│   │   └── mocks/
│   │       ├── server.ts                   # MSW服务器配置
│   │       └── handlers.ts                 # API mock处理器
│   └── setupTests.ts                       # 测试环境配置
├── e2e/
│   ├── auth-flow.spec.ts                   # 端到端测试
│   └── fixtures/                           # 测试数据文件
└── playwright.config.ts                    # Playwright配置

backend/
├── tests/
│   └── integration/
│       └── auth-flow.test.js               # 后端集成测试
└── jest.config.js                          # Jest配置

scripts/
└── run-integration-tests.sh                # 测试运行脚本
```

## 运行测试

### 1. 运行所有测试
```bash
./scripts/run-integration-tests.sh
```

### 2. 运行特定类型的测试
```bash
# 只运行后端集成测试
./scripts/run-integration-tests.sh backend

# 只运行前端集成测试
./scripts/run-integration-tests.sh frontend

# 只运行端到端测试
./scripts/run-integration-tests.sh e2e
```

### 3. 手动运行测试

#### 前端集成测试
```bash
cd frontend
npm run test:integration
```

#### 后端集成测试
```bash
cd backend
npm run test:integration
```

#### 端到端测试
```bash
cd frontend
npm run test:e2e
```

## 测试环境配置

### 数据库配置
- 测试数据库名: `hospital_journal_test`
- 自动创建和清理测试数据
- 独立于开发和生产数据库

### 环境变量
```bash
NODE_ENV=test
DB_NAME=hospital_journal_test
DB_USER=root
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=3306
```

### 服务端口
- 后端测试服务: http://localhost:3001
- 前端测试服务: http://localhost:3000

## 测试数据

### 测试用户
- **管理员**: username: `admin`, password: `admin123`
- **普通用户**: username: `user`, password: `user123`

### 测试文件
- `e2e/fixtures/test-publications.xlsx` - 文献导入测试文件
- `e2e/fixtures/test-journals.xlsx` - 期刊导入测试文件

## 测试报告

测试完成后会生成以下报告：

1. **覆盖率报告**
   - 前端: `frontend/coverage/lcov-report/index.html`
   - 后端: `backend/coverage/lcov-report/index.html`

2. **端到端测试报告**
   - Playwright报告: `frontend/playwright-report/index.html`

3. **综合测试报告**
   - 汇总报告: `test-reports/test-report.md`

## 持续集成

### GitHub Actions配置
```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: hospital_journal_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: ./scripts/run-integration-tests.sh
```

## 最佳实践

### 1. 测试隔离
- 每个测试用例独立运行
- 测试前后清理数据
- 使用独立的测试数据库

### 2. Mock策略
- 外部API调用使用Mock
- 文件系统操作使用Mock
- 时间相关功能使用Mock

### 3. 错误场景测试
- 网络异常情况
- 服务器错误响应
- 边界条件测试

### 4. 性能考虑
- 并发测试执行
- 测试数据最小化
- 合理的超时设置

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务是否运行
   - 验证数据库连接参数
   - 确认测试数据库已创建

2. **端口冲突**
   - 确保测试端口未被占用
   - 检查防火墙设置
   - 验证服务启动状态

3. **文件权限问题**
   - 确保测试脚本有执行权限
   - 检查文件上传目录权限
   - 验证临时文件创建权限

4. **依赖安装问题**
   - 清理node_modules重新安装
   - 检查npm/yarn版本兼容性
   - 验证网络连接

### 调试技巧

1. **启用详细日志**
   ```bash
   DEBUG=* ./scripts/run-integration-tests.sh
   ```

2. **单独运行失败的测试**
   ```bash
   npm test -- --testNamePattern="specific test name"
   ```

3. **保留测试环境**
   ```bash
   # 设置环境变量跳过清理
   KEEP_TEST_ENV=true ./scripts/run-integration-tests.sh
   ```

## 更新和维护

### 添加新测试
1. 在相应目录创建测试文件
2. 更新mock handlers（如需要）
3. 添加测试数据（如需要）
4. 更新文档

### 测试维护
- 定期更新测试依赖
- 清理过时的测试用例
- 优化测试执行时间
- 保持测试覆盖率

## 总结

本测试套件提供了全面的集成测试和端到端测试覆盖，确保系统的认证、权限、数据管理等核心功能的正确性和稳定性。通过自动化测试流程，可以及时发现和修复问题，提高系统质量和可靠性。