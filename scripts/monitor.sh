#!/bin/bash

# 系统监控脚本
set -e

echo "📊 医院期刊统计系统监控报告"
echo "================================"
echo "时间: $(date)"
echo ""

# 检查 Docker 服务状态
echo "🐳 Docker 服务状态:"
docker-compose -f docker-compose.prod.yml ps
echo ""

# 检查系统资源使用情况
echo "💻 系统资源使用情况:"
echo "CPU 使用率:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
echo ""

# 检查磁盘使用情况
echo "💾 磁盘使用情况:"
df -h
echo ""

# 检查 Docker 卷使用情况
echo "📦 Docker 卷使用情况:"
docker system df
echo ""

# 检查服务健康状态
echo "🏥 服务健康检查:"

# 检查数据库连接
if docker-compose -f docker-compose.prod.yml exec -T database mysql -u root -p$DB_ROOT_PASSWORD -e "SELECT 1" > /dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接异常"
fi

# 检查后端 API
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ 后端 API 正常"
else
    echo "❌ 后端 API 异常"
fi

# 检查前端服务
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ 前端服务正常"
else
    echo "❌ 前端服务异常"
fi

echo ""

# 检查最近的错误日志
echo "📋 最近的错误日志:"
echo "后端错误日志 (最近10行):"
docker-compose -f docker-compose.prod.yml logs --tail=10 backend | grep -i error || echo "无错误日志"
echo ""

echo "前端错误日志 (最近10行):"
docker-compose -f docker-compose.prod.yml logs --tail=10 frontend | grep -i error || echo "无错误日志"
echo ""

# 数据库统计
echo "📈 数据库统计:"
docker-compose -f docker-compose.prod.yml exec -T database mysql -u root -p$DB_ROOT_PASSWORD hospital_journal -e "
SELECT 
    '用户数量' as metric, COUNT(*) as value FROM users
UNION ALL
SELECT 
    '科室数量' as metric, COUNT(*) as value FROM departments
UNION ALL
SELECT 
    '期刊数量' as metric, COUNT(*) as value FROM journals
UNION ALL
SELECT 
    '文献数量' as metric, COUNT(*) as value FROM publications;
" 2>/dev/null || echo "无法获取数据库统计"

echo ""
echo "监控报告完成 ✅"