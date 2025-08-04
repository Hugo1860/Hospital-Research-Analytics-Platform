#!/bin/bash

# 数据库备份脚本
set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="hospital_journal_backup_$DATE.sql"

echo "💾 开始数据库备份..."

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
docker-compose -f docker-compose.prod.yml exec -T database \
    mysqldump -u root -p$DB_ROOT_PASSWORD hospital_journal > $BACKUP_DIR/$BACKUP_FILE

# 压缩备份文件
gzip $BACKUP_DIR/$BACKUP_FILE

echo "✅ 备份完成: $BACKUP_DIR/$BACKUP_FILE.gz"

# 清理旧备份 (保留最近7天)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "🧹 清理完成，保留最近7天的备份"