#!/bin/bash

# 协和医院SCI期刊分析系统 - 启动脚本

echo "🏥 协和医院SCI期刊分析系统"
echo "=================================="

# 检查Node.js版本
NODE_VERSION=$(node --version)
echo "📋 Node.js版本: $NODE_VERSION"

# 启动MySQL
echo "📊 启动MySQL服务..."
brew services start mysql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ MySQL服务启动成功"
else
    echo "⚠️  MySQL可能已在运行"
fi

# 等待MySQL启动
sleep 3

# 初始化数据库
echo "🔧 初始化数据库..."
./scripts/init-db.sh > /dev/null 2>&1

# 检查并安装依赖
echo "📦 检查项目依赖..."

if [ ! -d "backend/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd frontend && npm install && cd ..
fi

# 清理可能占用的端口
echo "🧹 清理端口..."
lsof -ti:3001 | xargs kill -9 > /dev/null 2>&1
lsof -ti:3002 | xargs kill -9 > /dev/null 2>&1

# 启动服务
echo "🚀 启动应用服务..."
echo "=================================="

npx concurrently \
  --prefix "[{name}]" \
  --names "BACKEND,FRONTEND" \
  --prefix-colors "blue,green" \
  --kill-others-on-fail \
  "cd backend && npm start" \
  "cd frontend && npm start"