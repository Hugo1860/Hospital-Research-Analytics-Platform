import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

import App from '../../App';
import authSlice from '../../store/slices/authSlice';
import publicationSlice from '../../store/slices/publicationSlice';
import journalSlice from '../../store/slices/journalSlice';
import statisticsSlice from '../../store/slices/statisticsSlice';
import { tokenManager } from '../../utils/tokenManager';

// Mock server setup
const server = setupServer(
  // Login endpoint
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'admin',
            departmentId: 1
          }
        }
      })
    );
  }),

  // Token validation endpoint
  rest.get('/api/auth/validate', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader === 'Bearer mock-jwt-token') {
      return res(
        ctx.json({
          success: true,
          data: {
            user: {
              id: 1,
              username: 'testuser',
              email: 'test@example.com',
              role: 'admin',
              departmentId: 1
            }
          }
        })
      );
    }
    return res(ctx.status(401), ctx.json({ success: false, message: 'Invalid token' }));
  }),

  // Publications endpoint
  rest.get('/api/publications', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          publications: [],
          total: 0,
          page: 1,
          pageSize: 10
        }
      })
    );
  }),

  // Publication import endpoint
  rest.post('/api/publications/import', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          success: 5,
          failed: 0,
          duplicates: 1,
          errors: []
        }
      })
    );
  }),

  // Journals endpoint
  rest.get('/api/journals', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          journals: [
            {
              id: 1,
              name: 'Nature',
              impactFactor: 42.778,
              quartile: 'Q1'
            }
          ],
          total: 1
        }
      })
    );
  })
);

// Test store setup
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice,
      publications: publicationSlice,
      journals: journalSlice,
      statistics: statisticsSlice
    }
  });
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = createTestStore();
  
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
};

describe('Authentication Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    tokenManager.clearToken();
    localStorage.clear();
  });

  afterAll(() => {
    server.close();
  });

  test('完整的登录到文献导入流程', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // 1. 初始状态应该显示登录页面
    expect(screen.getByText(/登录/i)).toBeInTheDocument();

    // 2. 填写登录表单
    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const loginButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // 3. 提交登录表单
    fireEvent.click(loginButton);

    // 4. 等待登录成功并跳转到仪表板
    await waitFor(() => {
      expect(screen.getByText(/仪表板/i)).toBeInTheDocument();
    });

    // 5. 验证token已保存
    expect(tokenManager.getToken()).toBe('mock-jwt-token');

    // 6. 导航到文献管理页面
    const publicationsLink = screen.getByText(/文献管理/i);
    fireEvent.click(publicationsLink);

    await waitFor(() => {
      expect(screen.getByText(/文献列表/i)).toBeInTheDocument();
    });

    // 7. 点击批量导入按钮
    const importButton = screen.getByText(/批量导入/i);
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText(/选择文件/i)).toBeInTheDocument();
    });

    // 8. 模拟文件上传
    const fileInput = screen.getByLabelText(/选择文件/i);
    const mockFile = new File(['mock content'], 'publications.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // 9. 提交导入
    const submitButton = screen.getByText(/开始导入/i);
    fireEvent.click(submitButton);

    // 10. 等待导入完成
    await waitFor(() => {
      expect(screen.getByText(/导入成功/i)).toBeInTheDocument();
    });

    // 11. 验证导入结果显示
    expect(screen.getByText(/成功: 5/i)).toBeInTheDocument();
    expect(screen.getByText(/重复: 1/i)).toBeInTheDocument();
  });

  test('token过期时的自动处理', async () => {
    // 设置一个即将过期的token
    tokenManager.setToken('expired-token');

    // Mock token验证失败
    server.use(
      rest.get('/api/auth/validate', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ success: false, message: 'Token expired' }));
      })
    );

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // 应该自动跳转到登录页面
    await waitFor(() => {
      expect(screen.getByText(/登录/i)).toBeInTheDocument();
    });

    // Token应该被清除
    expect(tokenManager.getToken()).toBeNull();
  });

  test('权限不足时的错误处理', async () => {
    // 设置普通用户token
    server.use(
      rest.get('/api/auth/validate', (req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            data: {
              user: {
                id: 2,
                username: 'normaluser',
                email: 'normal@example.com',
                role: 'user',
                departmentId: 1
              }
            }
          })
        );
      }),
      rest.post('/api/publications/import', (req, res, ctx) => {
        return res(
          ctx.status(403),
          ctx.json({ success: false, message: 'Permission denied' })
        );
      })
    );

    tokenManager.setToken('normal-user-token');

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // 等待认证完成
    await waitFor(() => {
      expect(screen.getByText(/仪表板/i)).toBeInTheDocument();
    });

    // 尝试访问文献导入功能
    const publicationsLink = screen.getByText(/文献管理/i);
    fireEvent.click(publicationsLink);

    await waitFor(() => {
      expect(screen.getByText(/权限不足/i)).toBeInTheDocument();
    });
  });

  test('网络异常时的错误处理', async () => {
    // Mock网络错误
    server.use(
      rest.post('/api/auth/login', (req, res, ctx) => {
        return res.networkError('Network error');
      })
    );

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // 填写登录表单
    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const loginButton = screen.getByRole('button', { name: /登录/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    // 应该显示网络错误提示
    await waitFor(() => {
      expect(screen.getByText(/网络连接异常/i)).toBeInTheDocument();
    });
  });
});