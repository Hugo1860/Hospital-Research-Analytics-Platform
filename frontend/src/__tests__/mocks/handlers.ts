import { rest } from 'msw';

export const handlers = [
  // 认证相关的mock handlers
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
    return res(
      ctx.status(401),
      ctx.json({ success: false, message: 'Invalid token' })
    );
  }),

  rest.post('/api/auth/refresh', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          token: 'new-mock-jwt-token'
        }
      })
    );
  }),

  // 文献相关的mock handlers
  rest.get('/api/publications', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          publications: [
            {
              id: 1,
              title: 'Test Publication',
              authors: 'Test Author',
              journalId: 1,
              departmentId: 1,
              publishYear: 2023
            }
          ],
          total: 1,
          page: 1,
          pageSize: 10
        }
      })
    );
  }),

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

  // 期刊相关的mock handlers
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
  }),

  rest.post('/api/journals/import', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          success: 10,
          failed: 0,
          duplicates: 2,
          errors: []
        }
      })
    );
  }),

  // 统计相关的mock handlers
  rest.get('/api/statistics/overview', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          totalPublications: 100,
          totalDepartments: 10,
          averageImpactFactor: 5.2,
          topDepartments: [
            { departmentName: '心内科', publicationCount: 25 },
            { departmentName: '神经科', publicationCount: 20 }
          ],
          yearlyTrend: [
            { year: 2021, count: 30 },
            { year: 2022, count: 35 },
            { year: 2023, count: 35 }
          ]
        }
      })
    );
  }),

  rest.get('/api/statistics/department', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: [
          {
            departmentId: 1,
            departmentName: '心内科',
            totalPublications: 25,
            averageImpactFactor: 6.5,
            quartileDistribution: {
              Q1: 10,
              Q2: 8,
              Q3: 5,
              Q4: 2
            },
            yearlyTrend: [
              { year: 2021, count: 8 },
              { year: 2022, count: 9 },
              { year: 2023, count: 8 }
            ]
          }
        ]
      })
    );
  }),

  // 用户管理相关的mock handlers
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          users: [
            {
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
              role: 'admin',
              departmentId: 1
            }
          ],
          total: 1
        }
      })
    );
  }),

  // 科室相关的mock handlers
  rest.get('/api/departments', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          departments: [
            {
              id: 1,
              name: '心内科',
              code: 'CARDIO',
              description: '心血管内科'
            }
          ],
          total: 1
        }
      })
    );
  }),

  // 报告相关的mock handlers
  rest.post('/api/reports/generate', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          reportId: 'report-123',
          downloadUrl: '/api/reports/download/report-123'
        }
      })
    );
  }),

  rest.get('/api/reports', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          reports: [
            {
              id: 'report-123',
              name: '2023年度统计报告',
              type: 'annual',
              status: 'completed',
              createdAt: '2023-12-01T00:00:00Z'
            }
          ],
          total: 1
        }
      })
    );
  }),

  // 健康检查
  rest.get('/api/health', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString()
        }
      })
    );
  }),

  // 错误处理的fallback
  rest.get('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(
      ctx.status(404),
      ctx.json({ success: false, message: 'Not found' })
    );
  }),

  rest.post('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(
      ctx.status(404),
      ctx.json({ success: false, message: 'Not found' })
    );
  })
];