# 协和医院SCI期刊分析系统

一个用于管理和统计协和医院各科室SCI文献发表情况的综合平台。

## 功能特性

- 📊 期刊数据管理（影响因子、分区信息）
- 📝 文献信息录入和批量导入
- 📈 统计分析和数据可视化
- 📋 报告生成和导出
- 👥 用户权限管理
- 🔍 高级搜索和筛选

## 技术栈

### 后端
- Node.js + Express.js
- MySQL + Sequelize ORM
- JWT认证
- Excel/PDF处理

### 前端
- React 18 + TypeScript
- Ant Design UI组件库
- Redux Toolkit状态管理
- ECharts数据可视化

## 项目结构

```
├── backend/                 # 后端API服务
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由定义
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── services/       # 业务逻辑
│   │   └── utils/          # 工具函数
│   └── package.json
├── frontend/               # 前端React应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── store/          # 状态管理
│   │   ├── services/       # API服务
│   │   └── utils/          # 工具函数
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- npm 或 yarn

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 环境配置

1. 复制后端环境配置文件：
```bash
cd backend
cp .env.example .env
```

2. 修改 `.env` 文件中的数据库配置

### 数据库设置

```bash
cd backend
# 创建数据库
npx sequelize-cli db:create

# 运行迁移
npm run migrate

# 运行种子数据（可选）
npm run seed
```

### 启动服务

```bash
# 启动后端服务（开发模式）
cd backend
npm run dev

# 启动前端服务
cd frontend
npm start
```

访问 http://localhost:3000 查看前端界面
访问 http://localhost:3001/health 检查后端API状态

## 开发指南

### 代码规范
- 使用ESLint和Prettier进行代码格式化
- 遵循TypeScript严格模式
- 使用语义化的Git提交信息

### 测试
```bash
# 运行后端测试
cd backend
npm test

# 运行前端测试
cd frontend
npm test
```

## 部署

详细的部署说明请参考部署文档。

## 许可证

MIT License