#!/bin/bash

echo "🔍 前端问题诊断工具"
echo "===================="

cd frontend

# 检查Node.js和npm版本
echo "📋 环境信息:"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo ""

# 检查依赖安装
echo "📦 检查依赖安装:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules 存在"
    
    # 检查关键依赖
    echo "🔍 检查关键依赖:"
    
    if [ -d "node_modules/react" ]; then
        echo "✅ React 已安装"
    else
        echo "❌ React 未安装"
    fi
    
    if [ -d "node_modules/antd" ]; then
        echo "✅ Ant Design 已安装"
    else
        echo "❌ Ant Design 未安装"
    fi
    
    if [ -d "node_modules/@reduxjs/toolkit" ]; then
        echo "✅ Redux Toolkit 已安装"
    else
        echo "❌ Redux Toolkit 未安装"
    fi
    
    if [ -d "node_modules/react-router-dom" ]; then
        echo "✅ React Router 已安装"
    else
        echo "❌ React Router 未安装"
    fi
else
    echo "❌ node_modules 不存在，正在安装依赖..."
    npm install
fi

echo ""

# 检查TypeScript配置
echo "🔧 检查TypeScript配置:"
if [ -f "tsconfig.json" ]; then
    echo "✅ tsconfig.json 存在"
else
    echo "❌ tsconfig.json 不存在"
fi

# 检查关键文件
echo ""
echo "📁 检查关键文件:"

files=(
    "public/index.html"
    "src/index.tsx"
    "src/App.tsx"
    "src/store/index.ts"
    "src/contexts/AuthContext.tsx"
    "src/components/common/Layout.tsx"
    "src/pages/Dashboard.tsx"
    "src/pages/Login.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file"
    fi
done

echo ""

# 尝试编译检查
echo "🔨 TypeScript 编译检查:"
npx tsc --noEmit --skipLibCheck 2>&1 | head -20

echo ""
echo "🚀 如果上面没有严重错误，可以尝试启动:"
echo "   npm start"
echo ""
echo "💡 如果仍有问题，请运行:"
echo "   ./test-frontend.sh  # 测试简化版本"