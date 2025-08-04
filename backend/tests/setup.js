// 测试环境设置
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_NAME = 'hospital_journal_test';

// 全局测试配置
beforeAll(async () => {
  // 测试前的全局设置
});

afterAll(async () => {
  // 测试后的清理工作
});

beforeEach(() => {
  // 每个测试前的设置
});

afterEach(() => {
  // 每个测试后的清理
});