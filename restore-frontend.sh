#!/bin/bash

echo "🔄 恢复前端原始文件..."

cd frontend

# 恢复原始文件
if [ -f "src/index.tsx.backup" ]; then
    cp src/index.tsx.backup src/index.tsx
    rm src/index.tsx.backup
    echo "✅ 已恢复原始 index.tsx"
else
    echo "❌ 未找到备份文件"
fi

# 清理临时文件
if [ -f "src/index.simple.tsx" ]; then
    rm src/index.simple.tsx
    echo "🧹 已清理临时文件"
fi

if [ -f "src/App.simple.tsx" ]; then
    rm src/App.simple.tsx
    echo "🧹 已清理临时文件"
fi

echo "✅ 恢复完成"