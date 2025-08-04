#!/bin/bash

# MySQL配置脚本 - 协和医院SCI期刊分析系统

echo "🔧 MySQL配置脚本"
echo "=================="

# 检查MySQL是否运行
if ! pgrep -x "mysqld" > /dev/null; then
    echo "❌ MySQL未运行，正在启动..."
    brew services start mysql
    sleep 5
else
    echo "✅ MySQL正在运行"
fi

# 尝试连接MySQL并设置
echo "🔍 检查MySQL连接..."

# 尝试使用配置的密码连接
if mysql -u root -p'Scar7689@@' -e "SELECT 1;" 2>/dev/null; then
    echo "✅ MySQL root用户密码连接成功"
    MYSQL_CMD="mysql -u root -p'Scar7689@@'"
elif mysql -u root -e "SELECT 1;" 2>/dev/null; then
    echo "✅ MySQL root用户无密码连接成功，正在设置密码..."
    mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Scar7689@@'; FLUSH PRIVILEGES;" 2>/dev/null
    MYSQL_CMD="mysql -u root -p'Scar7689@@'"
    echo "✅ MySQL密码已设置"
elif mysql -u root -p"" -e "SELECT 1;" 2>/dev/null; then
    echo "✅ MySQL root用户空密码连接成功，正在设置密码..."
    mysql -u root -p"" -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Scar7689@@'; FLUSH PRIVILEGES;" 2>/dev/null
    MYSQL_CMD="mysql -u root -p'Scar7689@@'"
    echo "✅ MySQL密码已设置"
else
    echo "❌ 无法连接MySQL"
    echo "💡 请手动设置MySQL root密码："
    echo "   1. 连接到MySQL: mysql -u root -p"
    echo "   2. 执行: ALTER USER 'root'@'localhost' IDENTIFIED BY 'Scar7689@@';"
    echo "   3. 执行: FLUSH PRIVILEGES;"
    exit 1
fi

# 创建数据库
echo "📊 创建数据库..."
$MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS hospital_journal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ 数据库 hospital_journal 创建成功"
else
    echo "⚠️  数据库可能已存在"
fi

# 检查数据库
echo "🔍 验证数据库..."
DB_EXISTS=$($MYSQL_CMD -e "SHOW DATABASES LIKE 'hospital_journal';" 2>/dev/null | grep hospital_journal)

if [ -n "$DB_EXISTS" ]; then
    echo "✅ 数据库验证成功"
    echo "📋 数据库信息:"
    echo "   名称: hospital_journal"
    echo "   字符集: utf8mb4"
    echo "   排序规则: utf8mb4_unicode_ci"
else
    echo "❌ 数据库验证失败"
    exit 1
fi

echo ""
echo "🎉 MySQL配置完成！"
echo "💡 现在可以运行 node start-all.js 启动系统"