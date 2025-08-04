import { test, expect } from '@playwright/test';

test.describe('Authentication End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 清除所有存储数据
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('完整的用户登录和文献导入流程', async ({ page }) => {
    // 1. 访问应用首页
    await page.goto('/');

    // 2. 验证重定向到登录页面
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('登录');

    // 3. 填写登录表单
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');

    // 4. 提交登录
    await page.click('[data-testid="login-button"]');

    // 5. 等待登录成功并跳转
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-info"]')).toContainText('admin');

    // 6. 验证token已保存到localStorage
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();

    // 7. 导航到文献管理页面
    await page.click('[data-testid="nav-publications"]');
    await expect(page).toHaveURL('/publications');

    // 8. 点击批量导入按钮
    await page.click('[data-testid="import-button"]');
    await expect(page.locator('[data-testid="import-modal"]')).toBeVisible();

    // 9. 上传测试文件
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('e2e/fixtures/test-publications.xlsx');

    // 10. 选择科室
    await page.selectOption('[data-testid="department-select"]', '1');

    // 11. 开始导入
    await page.click('[data-testid="start-import-button"]');

    // 12. 等待导入完成
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 10000 });

    // 13. 验证导入结果
    await expect(page.locator('[data-testid="import-result"]')).toContainText('导入成功');
    
    // 14. 关闭导入对话框
    await page.click('[data-testid="close-import-modal"]');

    // 15. 验证文献列表已更新
    await expect(page.locator('[data-testid="publications-table"]')).toBeVisible();
  });

  test('token过期后的自动重新登录', async ({ page }) => {
    // 1. 先正常登录
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. 手动设置过期的token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'expired-token');
    });

    // 3. 刷新页面触发token验证
    await page.reload();

    // 4. 应该自动跳转到登录页面
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('登录已过期');

    // 5. 重新登录
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    // 6. 验证重新登录成功
    await expect(page).toHaveURL('/dashboard');
  });

  test('跨标签页状态同步', async ({ context }) => {
    // 1. 创建第一个标签页并登录
    const page1 = await context.newPage();
    await page1.goto('/login');
    await page1.fill('[data-testid="username-input"]', 'admin');
    await page1.fill('[data-testid="password-input"]', 'admin123');
    await page1.click('[data-testid="login-button"]');
    await expect(page1).toHaveURL('/dashboard');

    // 2. 创建第二个标签页
    const page2 = await context.newPage();
    await page2.goto('/');

    // 3. 第二个标签页应该自动跳转到仪表板（已登录状态）
    await expect(page2).toHaveURL('/dashboard');
    await expect(page2.locator('[data-testid="user-info"]')).toContainText('admin');

    // 4. 在第一个标签页登出
    await page1.click('[data-testid="user-menu"]');
    await page1.click('[data-testid="logout-button"]');
    await expect(page1).toHaveURL('/login');

    // 5. 等待第二个标签页同步状态
    await page2.waitForTimeout(1000); // 等待storage事件传播
    await expect(page2).toHaveURL('/login');

    await page1.close();
    await page2.close();
  });

  test('权限控制测试', async ({ page }) => {
    // 1. 使用普通用户登录
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'user');
    await page.fill('[data-testid="password-input"]', 'user123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. 尝试访问用户管理页面（需要管理员权限）
    await page.goto('/users');

    // 3. 应该显示权限不足页面
    await expect(page.locator('[data-testid="permission-denied"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('权限不足');

    // 4. 点击返回按钮
    await page.click('[data-testid="back-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('网络错误处理', async ({ page }) => {
    // 1. 模拟网络离线状态
    await page.context().setOffline(true);

    // 2. 尝试登录
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    // 3. 应该显示网络错误提示
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('网络连接异常');

    // 4. 恢复网络连接
    await page.context().setOffline(false);

    // 5. 重试登录
    await page.click('[data-testid="retry-button"]');

    // 6. 登录应该成功
    await expect(page).toHaveURL('/dashboard');
  });

  test('记住登录状态', async ({ page }) => {
    // 1. 登录并勾选"记住我"
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.check('[data-testid="remember-me"]');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. 关闭浏览器并重新打开
    await page.close();
    const newPage = await page.context().newPage();
    await newPage.goto('/');

    // 3. 应该自动登录到仪表板
    await expect(newPage).toHaveURL('/dashboard');
    await expect(newPage.locator('[data-testid="user-info"]')).toContainText('admin');

    await newPage.close();
  });

  test('文件上传认证测试', async ({ page }) => {
    // 1. 登录
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. 导航到期刊管理页面
    await page.click('[data-testid="nav-journals"]');
    await expect(page).toHaveURL('/journals');

    // 3. 点击导入期刊数据
    await page.click('[data-testid="import-journals-button"]');

    // 4. 上传文件
    const fileInput = page.locator('[data-testid="journal-file-input"]');
    await fileInput.setInputFiles('e2e/fixtures/test-journals.xlsx');

    // 5. 开始导入
    await page.click('[data-testid="start-journal-import"]');

    // 6. 验证导入成功（确保认证头正确传递）
    await expect(page.locator('[data-testid="journal-import-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('API请求重试机制', async ({ page }) => {
    // 1. 登录
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. 拦截API请求并模拟401错误
    await page.route('/api/publications', route => {
      if (route.request().method() === 'GET') {
        // 第一次请求返回401
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Token expired' })
        });
      }
    });

    // 3. 导航到文献页面触发API请求
    await page.click('[data-testid="nav-publications"]');

    // 4. 应该自动处理401错误并重新认证
    await expect(page).toHaveURL('/publications');
    
    // 5. 移除路由拦截，允许正常请求
    await page.unroute('/api/publications');
    
    // 6. 刷新页面验证重新认证成功
    await page.reload();
    await expect(page.locator('[data-testid="publications-table"]')).toBeVisible();
  });
});