#!/bin/bash

# 生产环境部署脚本
set -e

echo "🚀 开始部署医院期刊统计系统..."

# 检查必要的环境变量
if [ -z "$DB_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
    echo "❌ 错误: 请设置必要的环境变量 (DB_PASSWORD, JWT_SECRET)"
    exit 1
fi

# 创建必要的目录
echo "📁 创建目录结构..."
mkdir -p logs uploads ssl backups

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose -f docker-compose.prod.yml down || true

# 备份数据库 (如果存在)
if docker volume ls | grep -q hospital-journal_db_data; then
    echo "💾 备份现有数据库..."
    docker run --rm \
        -v hospital-journal_db_data:/var/lib/mysql \
        -v $(pwd)/backups:/backup \
        mysql:8.0 \
        mysqldump -h database -u root -p$DB_ROOT_PASSWORD hospital_journal > /backup/backup_$(date +%Y%m%d_%H%M%S).sql || true
fi

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 启动服务
echo "🚀 启动服务..."
docker-compose -f docker-compose.prod.yml up -d

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 30

# 执行数据库迁移
echo "🔄 执行数据库迁移..."
docker-compose -f docker-compose.prod.yml exec backend node /app/scripts/migrate.js

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker-compose.prod.yml ps

# 健康检查
echo "🏥 执行健康检查..."
sleep 10

# 检查后端健康状态
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务健康"
else
    echo "❌ 后端服务异常"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# 检查前端健康状态
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ 前端服务健康"
else
    echo "❌ 前端服务异常"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

echo "🎉 部署完成！"
echo "📊 系统访问地址: http://localhost"
echo "📋 查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "🔧 管理服务: docker-compose -f docker-compose.prod.yml [start|stop|restart]"