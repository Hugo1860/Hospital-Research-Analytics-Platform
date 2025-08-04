#!/usr/bin/env node

/**
 * 协和医院SCI期刊分析系统 - 统一启动服务
 * 同时启动数据库、后端API和前端服务
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class SystemLauncher {
  constructor() {
    this.processes = [];
    this.isShuttingDown = false;
    
    // 绑定退出处理
    process.on('SIGINT', this.shutdown.bind(this));
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('exit', this.shutdown.bind(this));
  }

  log(service, message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: '\x1b[36m',    // 青色
      success: '\x1b[32m', // 绿色
      error: '\x1b[31m',   // 红色
      warn: '\x1b[33m',    // 黄色
      reset: '\x1b[0m'     // 重置
    };
    
    const color = colors[type] || colors.info;
    console.log(`${color}[${timestamp}] [${service}] ${message}${colors.reset}`);
  }

  async checkPrerequisites() {
    this.log('SYSTEM', '🔍 检查系统环境...', 'info');
    
    // 检查Node.js版本
    const nodeVersion = process.version;
    this.log('SYSTEM', `Node.js版本: ${nodeVersion}`, 'info');
    
    // 检查MySQL是否安装
    try {
      await this.execCommand('mysql --version');
      this.log('SYSTEM', '✅ MySQL已安装', 'success');
    } catch (error) {
      this.log('SYSTEM', '❌ MySQL未安装或不在PATH中', 'error');
      throw new Error('MySQL is required');
    }
    
    // 检查项目目录
    const backendPath = path.join(__dirname, 'backend');
    const frontendPath = path.join(__dirname, 'frontend');
    
    if (!fs.existsSync(backendPath)) {
      throw new Error('Backend directory not found');
    }
    
    if (!fs.existsSync(frontendPath)) {
      throw new Error('Frontend directory not found');
    }
    
    this.log('SYSTEM', '✅ 项目目录检查完成', 'success');
  }

  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async startMySQL() {
    this.log('DATABASE', '🚀 启动MySQL服务...', 'info');
    
    try {
      // 检查MySQL是否已经运行
      await this.execCommand('brew services list | grep mysql');
      
      // 启动MySQL服务
      await this.execCommand('brew services start mysql');
      this.log('DATABASE', '✅ MySQL服务启动成功', 'success');
      
      // 等待MySQL完全启动
      await this.waitForMySQL();
      
    } catch (error) {
      this.log('DATABASE', `❌ MySQL启动失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async waitForMySQL(maxAttempts = 30) {
    this.log('DATABASE', '⏳ 等待MySQL服务就绪...', 'info');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // 尝试多种连接方式
        const commands = [
          'mysql -u root -e "SELECT 1" 2>/dev/null',
          'mysql -u root -p"" -e "SELECT 1" 2>/dev/null',
          'mysql -u root --password="" -e "SELECT 1" 2>/dev/null'
        ];
        
        let connected = false;
        for (const cmd of commands) {
          try {
            await this.execCommand(cmd);
            connected = true;
            break;
          } catch (e) {
            // 继续尝试下一个命令
          }
        }
        
        if (connected) {
          this.log('DATABASE', '✅ MySQL服务就绪', 'success');
          return;
        }
        
        // 如果所有命令都失败，检查MySQL进程是否运行
        const mysqlProcess = await this.execCommand('ps aux | grep mysqld | grep -v grep');
        if (mysqlProcess.trim()) {
          this.log('DATABASE', '✅ MySQL进程运行中，跳过连接测试', 'success');
          return;
        }
        
      } catch (error) {
        if (i === maxAttempts - 1) {
          this.log('DATABASE', '⚠️  MySQL连接测试失败，但进程可能正在运行', 'warn');
          this.log('DATABASE', '💡 请确保MySQL root用户可以无密码连接，或配置正确的密码', 'info');
          // 不抛出错误，让应用继续启动
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async setupDatabase() {
    this.log('DATABASE', '🔧 初始化数据库...', 'info');
    
    try {
      // 尝试创建数据库
      const createDbCommands = [
        'mysql -u root -e "CREATE DATABASE IF NOT EXISTS hospital_journal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"',
        'mysql -u root -p"" -e "CREATE DATABASE IF NOT EXISTS hospital_journal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"',
        'mysql -u root --password="" -e "CREATE DATABASE IF NOT EXISTS hospital_journal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"'
      ];
      
      let dbCreated = false;
      for (const cmd of createDbCommands) {
        try {
          await this.execCommand(cmd);
          dbCreated = true;
          this.log('DATABASE', '✅ 数据库创建成功', 'success');
          break;
        } catch (e) {
          // 继续尝试下一个命令
        }
      }
      
      if (!dbCreated) {
        this.log('DATABASE', '⚠️  无法创建数据库，可能需要手动配置MySQL密码', 'warn');
        this.log('DATABASE', '💡 数据库可能已存在，继续启动应用...', 'info');
      }
      
      // 运行数据库迁移
      const backendPath = path.join(__dirname, 'backend');
      try {
        await this.execCommand(`cd ${backendPath} && npx sequelize-cli db:migrate`);
        this.log('DATABASE', '✅ 数据库迁移完成', 'success');
      } catch (error) {
        this.log('DATABASE', `⚠️  数据库迁移跳过: ${error.message}`, 'warn');
      }
      
      // 运行种子数据
      try {
        await this.execCommand(`cd ${backendPath} && npx sequelize-cli db:seed:all`);
        this.log('DATABASE', '✅ 种子数据导入完成', 'success');
      } catch (error) {
        this.log('DATABASE', `⚠️  种子数据导入跳过: ${error.message}`, 'warn');
      }
      
    } catch (error) {
      this.log('DATABASE', `⚠️  数据库初始化警告: ${error.message}`, 'warn');
      this.log('DATABASE', '💡 应用将尝试继续启动，如遇问题请检查数据库配置', 'info');
    }
  }

  startBackend() {
    return new Promise((resolve, reject) => {
      this.log('BACKEND', '🚀 启动后端服务...', 'info');
      
      const backendPath = path.join(__dirname, 'backend');
      const backend = spawn('npm', ['start'], {
        cwd: backendPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let started = false;

      backend.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('服务器运行在端口')) {
          if (!started) {
            started = true;
            this.log('BACKEND', '✅ 后端服务启动成功 (http://localhost:3002)', 'success');
            resolve(backend);
          }
        }
        // 过滤掉一些不重要的日志
        if (!output.includes('GET /health') && !output.includes('favicon.ico')) {
          this.log('BACKEND', output.trim(), 'info');
        }
      });

      backend.stderr.on('data', (data) => {
        const error = data.toString();
        if (!started && error.includes('EADDRINUSE')) {
          this.log('BACKEND', '⚠️  端口被占用，尝试清理...', 'warn');
          // 尝试清理端口
          exec('lsof -ti:3002 | xargs kill -9', () => {
            // 重新启动
            setTimeout(() => {
              this.startBackend().then(resolve).catch(reject);
            }, 2000);
          });
        } else {
          this.log('BACKEND', error.trim(), 'error');
        }
      });

      backend.on('close', (code) => {
        if (!started) {
          reject(new Error(`Backend exited with code ${code}`));
        }
      });

      this.processes.push({ name: 'backend', process: backend });
    });
  }

  startFrontend() {
    return new Promise((resolve, reject) => {
      this.log('FRONTEND', '🚀 启动前端服务...', 'info');
      
      const frontendPath = path.join(__dirname, 'frontend');
      const frontend = spawn('npm', ['start'], {
        cwd: frontendPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: { ...process.env, BROWSER: 'none' } // 防止自动打开浏览器
      });

      let started = false;

      frontend.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('webpack compiled') || output.includes('Local:')) {
          if (!started) {
            started = true;
            this.log('FRONTEND', '✅ 前端服务启动成功 (http://localhost:3000)', 'success');
            resolve(frontend);
          }
        }
        // 过滤webpack的详细输出
        if (!output.includes('webpack compiled') && !output.includes('asset ')) {
          this.log('FRONTEND', output.trim(), 'info');
        }
      });

      frontend.stderr.on('data', (data) => {
        const error = data.toString();
        if (!started && error.includes('EADDRINUSE')) {
          this.log('FRONTEND', '⚠️  端口3000被占用，前端可能已在运行', 'warn');
          started = true;
          resolve(frontend);
        } else if (!error.includes('webpack')) {
          this.log('FRONTEND', error.trim(), 'error');
        }
      });

      frontend.on('close', (code) => {
        if (!started) {
          reject(new Error(`Frontend exited with code ${code}`));
        }
      });

      this.processes.push({ name: 'frontend', process: frontend });
    });
  }

  async installDependencies() {
    this.log('SYSTEM', '📦 检查并安装依赖...', 'info');
    
    const backendPath = path.join(__dirname, 'backend');
    const frontendPath = path.join(__dirname, 'frontend');
    
    // 检查后端依赖
    if (!fs.existsSync(path.join(backendPath, 'node_modules'))) {
      this.log('BACKEND', '📦 安装后端依赖...', 'info');
      await this.execCommand(`cd ${backendPath} && npm install`);
      this.log('BACKEND', '✅ 后端依赖安装完成', 'success');
    }
    
    // 检查前端依赖
    if (!fs.existsSync(path.join(frontendPath, 'node_modules'))) {
      this.log('FRONTEND', '📦 安装前端依赖...', 'info');
      await this.execCommand(`cd ${frontendPath} && npm install`);
      this.log('FRONTEND', '✅ 前端依赖安装完成', 'success');
    }
  }

  async start() {
    try {
      console.log('\n🏥 协和医院SCI期刊分析系统 - 统一启动服务\n');
      
      // 1. 检查环境
      await this.checkPrerequisites();
      
      // 2. 安装依赖
      await this.installDependencies();
      
      // 3. 启动MySQL
      await this.startMySQL();
      
      // 4. 初始化数据库
      await this.setupDatabase();
      
      // 5. 启动后端服务
      await this.startBackend();
      
      // 6. 启动前端服务
      await this.startFrontend();
      
      // 7. 显示启动完成信息
      this.showStartupInfo();
      
    } catch (error) {
      this.log('SYSTEM', `❌ 启动失败: ${error.message}`, 'error');
      await this.shutdown();
      process.exit(1);
    }
  }

  showStartupInfo() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 协和医院SCI期刊分析系统启动完成！');
    console.log('='.repeat(60));
    console.log('📊 前端界面: http://localhost:3000');
    console.log('🔧 后端API:  http://localhost:3002');
    console.log('💾 数据库:   MySQL (localhost:3306)');
    console.log('📋 健康检查: http://localhost:3002/health');
    console.log('='.repeat(60));
    console.log('💡 默认管理员账户:');
    console.log('   用户名: admin');
    console.log('   密码:   admin123');
    console.log('='.repeat(60));
    console.log('⚠️  按 Ctrl+C 停止所有服务');
    console.log('');
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    this.log('SYSTEM', '🛑 正在关闭所有服务...', 'warn');
    
    // 关闭所有子进程
    for (const { name, process } of this.processes) {
      try {
        this.log(name.toUpperCase(), '🛑 正在关闭...', 'warn');
        process.kill('SIGTERM');
        
        // 等待进程关闭，如果超时则强制杀死
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      } catch (error) {
        // 忽略关闭错误
      }
    }
    
    this.log('SYSTEM', '✅ 所有服务已关闭', 'success');
  }
}

// 启动系统
const launcher = new SystemLauncher();
launcher.start();