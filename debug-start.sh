#!/bin/bash

echo "🔍 诊断前端启动问题..."

# 检查前端目录
echo "📁 检查前端目录结构..."
ls -la frontend/src/

# 检查依赖安装
echo "📦 检查前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "❌ 前端依赖未安装，正在安装..."
    npm install
else
    echo "✅ 前端依赖已安装"
fi

# 检查TypeScript配置
echo "🔧 检查TypeScript配置..."
if [ -f "tsconfig.json" ]; then
    echo "✅ tsconfig.json 存在"
else
    echo "❌ tsconfig.json 不存在，创建默认配置..."
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": [
      "dom",
      "dom.iterable",
      "es6"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "src"
  ]
}
EOF
fi

# 检查public目录
echo "🌐 检查public目录..."
if [ ! -d "public" ]; then
    echo "❌ public目录不存在，创建..."
    mkdir -p public
fi

if [ ! -f "public/index.html" ]; then
    echo "❌ index.html不存在，创建..."
    cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="协和医院SCI期刊分析系统" />
    <title>协和医院SCI期刊分析系统</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF
fi

# 尝试启动前端
echo "🚀 启动前端服务..."
echo "如果出现错误，请查看错误信息..."
npm start