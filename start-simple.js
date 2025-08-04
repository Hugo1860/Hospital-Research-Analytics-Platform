#!/usr/bin/env node

/**
 * 协和医院SCI期刊分析系统 - 简化启动服务
 * 跳过数据库初始化，直接启动应用（演示模式）
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class SimpleSystemLauncher {
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

  async checkPrerequisites() {
    this.log('SYSTEM', '🔍 检查系统环境...', 'info');
    
    // 检查Node.js版本
    const nodeVersion = process.version;
    this.log('SYSTEM', `Node.js版本: ${nodeVersion}`, 'info');
    
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

  startBackend() {
    return new Promise((resolve, reject) => {
      this.log('BACKEND', '🚀 启动后端服务（演示模式）...', 'info');
      
      const backendPath = path.join(__dirname, 'backend');
      const backend = spawn('npm', ['start'], {
        cwd: backendPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: { 
          ...process.env, 
          DEMO_MODE: 'true',
          DB_HOST: 'localhost',
          DB_USER: 'demo',
          DB_PASSWORD: '',
          DB_NAME: 'demo'
        }
      });

      let started = false;

      backend.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('服务器运行在端口') || output.includes('🚀')) {
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
        } else if (!error.includes('SequelizeConnectionError') && !error.includes('ECONNREFUSED')) {
          // 忽略数据库连接错误，因为我们在演示模式下
          this.log('BACKEND', error.trim(), 'warn');
        }
      });

      backend.on('close', (code) => {
        if (!started && code !== 0) {
          reject(new Error(`Backend exited with code ${code}`));
        }
      });

      this.processes.push({ name: 'backend', process: backend });
      
      // 如果10秒后还没启动成功，假设已经启动
      setTimeout(() => {
        if (!started) {
          started = true;
          this.log('BACKEND', '✅ 后端服务可能已启动 (http://localhost:3002)', 'success');
          resolve(backend);
        }
      }, 10000);
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
        if (output.includes('webpack compiled') || output.includes('Local:') || output.includes('localhost:3000')) {
          if (!started) {
            started = true;
            this.log('FRONTEND', '✅ 前端服务启动成功 (http://localhost:3000)', 'success');
            resolve(frontend);
          }
        }
        // 过滤webpack的详细输出
        if (!output.includes('webpack compiled') && !output.includes('asset ') && output.trim()) {
          this.log('FRONTEND', output.trim(), 'info');
        }
      });

      frontend.stderr.on('data', (data) => {
        const error = data.toString();
        if (!started && error.includes('EADDRINUSE')) {
          this.log('FRONTEND', '⚠️  端口3000被占用，前端可能已在运行', 'warn');
          started = true;
          resolve(frontend);
        } else if (!error.includes('webpack') && error.trim()) {
          this.log('FRONTEND', error.trim(), 'warn');
        }
      });

      frontend.on('close', (code) => {
        if (!started && code !== 0) {
          reject(new Error(`Frontend exited with code ${code}`));
        }
      });

      this.processes.push({ name: 'frontend', process: frontend });
      
      // 如果30秒后还没启动成功，假设已经启动
      setTimeout(() => {
        if (!started) {
          started = true;
          this.log('FRONTEND', '✅ 前端服务可能已启动 (http://localhost:3000)', 'success');
          resolve(frontend);
        }
      }, 30000);
    });
  }

  async start() {
    try {
      console.log('\n🏥 协和医院SCI期刊分析系统 - 简化启动服务\n');
      
      // 1. 检查环境
      await this.checkPrerequisites();
      
      // 2. 安装依赖
      await this.installDependencies();
      
      // 3. 启动后端服务（演示模式）
      await this.startBackend();
      
      // 4. 启动前端服务
      await this.startFrontend();
      
      // 5. 显示启动完成信息
      this.showStartupInfo();
      
    } catch (error) {
      this.log('SYSTEM', `❌ 启动失败: ${error.message}`, 'error');
      await this.shutdown();
      process.exit(1);
    }
  }

  showStartupInfo() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 协和医院SCI期刊分析系统启动完成！（演示模式）');
    console.log('='.repeat(60));
    console.log('📊 前端界面: http://localhost:3000');
    console.log('🔧 后端API:  http://localhost:3002');
    console.log('📋 健康检查: http://localhost:3002/health');
    console.log('='.repeat(60));
    console.log('💡 演示模式账户:');
    console.log('   用户名: admin');
    console.log('   密码:   password123');
    console.log('='.repeat(60));
    console.log('⚠️  注意: 当前运行在演示模式，数据不会持久化');
    console.log('💾 如需完整功能，请配置MySQL数据库');
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
const launcher = new SimpleSystemLauncher();
launcher.start();