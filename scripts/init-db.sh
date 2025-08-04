#!/bin/bash

# 协和医院SCI期刊分析系统 - 数据库初始化脚本

echo "🏥 协和医院SCI期刊分析系统 - 数据库初始化"
echo "================================================"

# 检查MySQL是否运行
if ! pgrep -x "mysqld" > /dev/null; then
    echo "📊 启动MySQL服务..."
    brew services start mysql
    sleep 5
fi

# 尝试不同的MySQL连接方式
echo "🔧 创建数据库..."

# 方式1: 无密码连接
mysql -u root -e "CREATE DATABASE IF NOT EXISTS hospital_journal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 数据库创建成功（无密码）"
    DB_CONNECTED=true
else
    # 方式2: 空密码连接
    mysql -u root -p'' -e "CREATE DATABASE IF NOT EXISTS hospital_journal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ 数据库创建成功（空密码）"
        DB_CONNECTED=true
    else
        # 方式3: 提示用户输入密码
        echo "⚠️  需要MySQL密码，请手动创建数据库："
        echo "   mysql -u root -p"
        echo "   CREATE DATABASE IF NOT EXISTS hospital_journal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        echo ""
        echo "或者跳过数据库创建，直接运行迁移..."
        DB_CONNECTED=false
    fi
fi

# 进入后端目录
cd backend

# 运行数据库迁移
echo "🔄 运行数据库迁移..."
npx sequelize-cli db:migrate 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移完成"
    
    # 运行种子数据
    echo "🌱 导入种子数据..."
    npx sequelize-cli db:seed:all 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ 种子数据导入完成"
    else
        echo "⚠️  种子数据导入失败（可能已存在）"
    fi
    
    echo "================================================"
    echo "🎉 数据库初始化完成！"
    echo "💡 默认管理员账户: admin / admin123"
    echo "================================================"
else
    echo "⚠️  数据库迁移失败，可能需要手动配置MySQL"
    echo "💡 请检查以下配置："
    echo "   1. MySQL是否正在运行"
    echo "   2. 数据库连接参数是否正确"
    echo "   3. 用户权限是否足够"
    echo ""
    echo "🔧 手动解决方案："
    echo "   1. 设置MySQL root密码: mysql_secure_installation"
    echo "   2. 或者修改 backend/.env 中的数据库配置"
    echo "   3. 或者使用Docker运行MySQL"
    echo "================================================"
fi