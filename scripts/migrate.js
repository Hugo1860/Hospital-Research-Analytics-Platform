#!/usr/bin/env node

/**
 * 数据库迁移脚本
 * 用于生产环境的数据库初始化和迁移
 */

const { execSync } = require('child_process');
const path = require('path');

// 设置环境变量
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const backendPath = path.join(__dirname, '../backend');

console.log('🚀 开始数据库迁移...');

try {
  // 切换到后端目录
  process.chdir(backendPath);
  
  console.log('📋 检查数据库连接...');
  execSync('npx sequelize-cli db:migrate:status', { stdio: 'inherit' });
  
  console.log('🔄 执行数据库迁移...');
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
  
  console.log('🌱 执行数据库种子...');
  execSync('npx sequelize-cli db:seed:all', { stdio: 'inherit' });
  
  console.log('✅ 数据库迁移完成！');
  
} catch (error) {
  console.error('❌ 数据库迁移失败:', error.message);
  process.exit(1);
}