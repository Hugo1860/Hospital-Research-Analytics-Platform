#!/bin/bash

# 使用Docker启动MySQL数据库

echo "🐳 使用Docker启动MySQL数据库..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 停止并删除现有容器（如果存在）
docker stop hospital-mysql 2>/dev/null || true
docker rm hospital-mysql 2>/dev/null || true

# 启动MySQL容器
echo "🚀 启动MySQL容器..."
docker run -d \
  --name hospital-mysql \
  -e MYSQL_ROOT_PASSWORD=root123 \
  -e MYSQL_DATABASE=hospital_journal \
  -e MYSQL_USER=hospital_user \
  -e MYSQL_PASSWORD=hospital123 \
  -p 3306:3306 \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci

if [ $? -eq 0 ]; then
    echo "✅ MySQL容器启动成功"
    echo "⏳ 等待MySQL初始化..."
    
    # 等待MySQL完全启动
    for i in {1..30}; do
        if docker exec hospital-mysql mysql -u root -proot123 -e "SELECT 1" &>/dev/null; then
            echo "✅ MySQL已就绪"
            break
        fi
        echo "⏳ 等待MySQL启动... ($i/30)"
        sleep 2
    done
    
    # 更新后端配置
    echo "🔧 更新数据库配置..."
    cd backend
    
    # 备份原配置
    cp .env .env.backup 2>/dev/null || true
    
    # 更新配置
    cat > .env << EOF
# 服务器配置
PORT=3002
NODE_ENV=development

# 数据库配置 (Docker MySQL)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=hospital_journal
DB_USER=root
DB_PASSWORD=root123

# JWT配置
JWT_SECRET=hospital-journal-super-secret-key-2024
JWT_EXPIRES_IN=2h

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# 日志配置
LOG_LEVEL=info
EOF
    
    echo "✅ 数据库配置已更新"
    
    # 运行数据库迁移
    echo "🔄 运行数据库迁移..."
    npx sequelize-cli db:migrate
    
    if [ $? -eq 0 ]; then
        echo "✅ 数据库迁移完成"
        
        # 运行种子数据
        echo "🌱 导入种子数据..."
        npx sequelize-cli db:seed:all
        
        echo "🎉 Docker MySQL数据库设置完成！"
        echo "================================================"
        echo "📊 数据库信息:"
        echo "   主机: localhost:3306"
        echo "   数据库: hospital_journal"
        echo "   用户名: root"
        echo "   密码: root123"
        echo "================================================"
        echo "💡 默认管理员账户: admin / admin123"
        echo "🛑 停止数据库: docker stop hospital-mysql"
        echo "================================================"
    else
        echo "❌ 数据库迁移失败"
        exit 1
    fi
    
else
    echo "❌ MySQL容器启动失败"
    exit 1
fi