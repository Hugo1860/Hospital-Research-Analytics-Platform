#!/bin/bash

echo "🧪 测试前端基础功能..."

cd frontend

# 备份原始文件
if [ -f "src/index.tsx" ]; then
    cp src/index.tsx src/index.tsx.backup
    echo "📁 已备份原始 index.tsx"
fi

# 使用简化版本
cp src/index.simple.tsx src/index.tsx
echo "🔄 使用简化版本测试..."

# 启动开发服务器
echo "🚀 启动测试服务器..."
echo "如果成功，您应该看到一个简单的测试页面"
echo "按 Ctrl+C 停止服务器"

npm start