# 协和医院SCI期刊分析系统 - 生产环境部署指南

## 系统要求

### 硬件要求
- CPU: 2核心以上
- 内存: 4GB 以上
- 磁盘: 20GB 以上可用空间
- 网络: 稳定的互联网连接

### 软件要求
- Docker 20.10+
- Docker Compose 2.0+
- Linux 操作系统 (推荐 Ubuntu 20.04+)

## 部署步骤

### 1. 环境准备

```bash
# 克隆项目代码
git clone <repository-url>
cd hospital-journal-statistics

# 复制环境配置文件
cp .env.production.example .env.production

# 编辑环境配置
nano .env.production
```

### 2. 配置环境变量

编辑 `.env.production` 文件，设置以下关键配置：

```bash
# 数据库配置
DB_ROOT_PASSWORD=your-secure-root-password
DB_NAME=hospital_journal
DB_USER=hospital_user
DB_PASSWORD=your-secure-db-password

# JWT 配置
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters

# CORS 配置
CORS_ORIGIN=https://your-domain.com

# Redis 配置
REDIS_PASSWORD=your-secure-redis-password
```

### 3. SSL 证书配置 (可选)

如果需要 HTTPS 支持：

```bash
# 创建 SSL 证书目录
mkdir -p ssl

# 复制证书文件
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem

# 设置权限
chmod 600 ssl/*
```

### 4. 执行部署

```bash
# 运行部署脚本
./scripts/deploy.sh
```

部署脚本会自动执行以下操作：
- 构建 Docker 镜像
- 启动所有服务
- 执行数据库迁移
- 运行健康检查

### 5. 验证部署

部署完成后，访问以下地址验证：

- 前端界面: http://your-server-ip
- API 健康检查: http://your-server-ip/api/health
- 系统健康检查: http://your-server-ip/health

默认管理员账户：
- 用户名: admin
- 密码: admin123 (首次登录后请修改)

## 运维管理

### 服务管理

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 启动服务
docker-compose -f docker-compose.prod.yml start

# 停止服务
docker-compose -f docker-compose.prod.yml stop

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f [service-name]
```

### 数据库管理

```bash
# 数据库备份
./scripts/backup.sh

# 数据库迁移
./scripts/migrate.js

# 连接数据库
docker-compose -f docker-compose.prod.yml exec database mysql -u root -p
```

### 系统监控

```bash
# 运行监控脚本
./scripts/monitor.sh

# 查看系统资源使用
docker stats

# 查看磁盘使用情况
docker system df
```

### 日志管理

日志文件位置：
- 应用日志: `logs/` 目录
- Nginx 日志: `nginx_logs/` 目录
- 数据库日志: Docker 容器内

```bash
# 查看应用日志
tail -f logs/app.log

# 查看 Nginx 访问日志
tail -f nginx_logs/access.log

# 查看 Nginx 错误日志
tail -f nginx_logs/error.log
```

## 安全配置

### 防火墙设置

```bash
# 开放必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# 启用防火墙
sudo ufw enable
```

### 定期维护

建议设置以下定时任务：

```bash
# 编辑 crontab
crontab -e

# 添加以下任务
# 每天凌晨2点备份数据库
0 2 * * * /path/to/project/scripts/backup.sh

# 每周日凌晨3点清理 Docker 镜像
0 3 * * 0 docker system prune -f

# 每小时运行监控检查
0 * * * * /path/to/project/scripts/monitor.sh >> /var/log/hospital-journal-monitor.log
```

## 故障排除

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查端口占用
   netstat -tlnp | grep :80
   
   # 检查 Docker 服务
   systemctl status docker
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库容器状态
   docker-compose -f docker-compose.prod.yml logs database
   
   # 重启数据库服务
   docker-compose -f docker-compose.prod.yml restart database
   ```

3. **前端页面无法访问**
   ```bash
   # 检查 Nginx 配置
   docker-compose -f docker-compose.prod.yml exec frontend nginx -t
   
   # 重新加载 Nginx 配置
   docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload
   ```

### 性能优化

1. **数据库优化**
   - 定期执行 `OPTIMIZE TABLE` 命令
   - 监控慢查询日志
   - 适当调整 MySQL 配置参数

2. **应用优化**
   - 启用 Redis 缓存
   - 配置 CDN 加速静态资源
   - 使用负载均衡器

3. **系统优化**
   - 定期清理 Docker 镜像和容器
   - 监控磁盘空间使用情况
   - 优化系统内核参数

## 升级指南

### 应用升级

```bash
# 1. 备份数据
./scripts/backup.sh

# 2. 拉取最新代码
git pull origin main

# 3. 重新部署
./scripts/deploy.sh
```

### 数据库升级

```bash
# 执行数据库迁移
./scripts/migrate.js
```

## 联系支持

如遇到部署或运维问题，请联系技术支持团队。

---

**注意**: 请确保在生产环境中使用强密码，并定期更新系统和依赖包。