#!/usr/bin/env node

/**
 * 性能测试脚本
 * 测试API响应时间、并发处理能力等性能指标
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class PerformanceTester {
  constructor(baseUrl = 'http://localhost') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  // 记录测试结果
  logResult(test, metrics, status = 'INFO') {
    const result = {
      test,
      metrics,
      status,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
    console.log(`${icon} ${test}:`);
    
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }

  // HTTP请求辅助函数
  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = process.hrtime.bigint();
      const url = `${this.baseUrl}${path}`;
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const endTime = process.hrtime.bigint();
          const responseTime = Number(endTime - startTime) / 1000000; // 转换为毫秒
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            responseTime
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  // 计算统计数据
  calculateStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  // 测试单个端点响应时间
  async testEndpointPerformance(endpoint, iterations = 10) {
    console.log(`\n⏱️  测试端点性能: ${endpoint}`);
    
    const responseTimes = [];
    const errors = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const response = await this.makeRequest(endpoint);
        responseTimes.push(response.responseTime);
        
        if (response.statusCode >= 400) {
          errors.push({
            iteration: i + 1,
            statusCode: response.statusCode,
            responseTime: response.responseTime
          });
        }
        
      } catch (error) {
        errors.push({
          iteration: i + 1,
          error: error.message
        });
      }
    }
    
    const stats = this.calculateStats(responseTimes);
    const errorRate = (errors.length / iterations) * 100;
    
    const status = stats.avg < 200 && errorRate < 5 ? 'PASS' : 'FAIL';
    
    this.logResult(`端点性能 - ${endpoint}`, {
      '平均响应时间': `${stats.avg.toFixed(2)}ms`,
      '最小响应时间': `${stats.min.toFixed(2)}ms`,
      '最大响应时间': `${stats.max.toFixed(2)}ms`,
      'P95响应时间': `${stats.p95.toFixed(2)}ms`,
      'P99响应时间': `${stats.p99.toFixed(2)}ms`,
      '错误率': `${errorRate.toFixed(2)}%`,
      '总请求数': iterations
    }, status);
    
    return { stats, errorRate, errors };
  }

  // 并发测试
  async testConcurrency(endpoint, concurrency = 10, duration = 30000) {
    console.log(`\n🚀 并发测试: ${endpoint} (${concurrency}个并发用户, ${duration/1000}秒)`);
    
    const startTime = Date.now();
    const results = [];
    let activeRequests = 0;
    let totalRequests = 0;
    let totalErrors = 0;
    
    const makeRequestLoop = async () => {
      while (Date.now() - startTime < duration) {
        if (activeRequests < concurrency) {
          activeRequests++;
          totalRequests++;
          
          try {
            const response = await this.makeRequest(endpoint);
            results.push(response.responseTime);
            
            if (response.statusCode >= 400) {
              totalErrors++;
            }
          } catch (error) {
            totalErrors++;
          } finally {
            activeRequests--;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    };
    
    // 启动并发请求
    const workers = Array(concurrency).fill().map(() => makeRequestLoop());
    await Promise.all(workers);
    
    // 等待所有请求完成
    while (activeRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const actualDuration = Date.now() - startTime;
    const stats = this.calculateStats(results);
    const throughput = (totalRequests / actualDuration) * 1000; // 请求/秒
    const errorRate = (totalErrors / totalRequests) * 100;
    
    const status = throughput > 10 && errorRate < 5 ? 'PASS' : 'FAIL';
    
    this.logResult(`并发测试 - ${endpoint}`, {
      '总请求数': totalRequests,
      '成功请求数': totalRequests - totalErrors,
      '错误请求数': totalErrors,
      '错误率': `${errorRate.toFixed(2)}%`,
      '吞吐量': `${throughput.toFixed(2)} 请求/秒`,
      '平均响应时间': `${stats.avg.toFixed(2)}ms`,
      'P95响应时间': `${stats.p95.toFixed(2)}ms`,
      '测试时长': `${actualDuration}ms`
    }, status);
    
    return { stats, throughput, errorRate, totalRequests };
  }

  // 内存泄漏测试
  async testMemoryLeak(endpoint, iterations = 100) {
    console.log(`\n🧠 内存泄漏测试: ${endpoint}`);
    
    const memoryUsage = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        await this.makeRequest(endpoint);
        
        // 每10次请求记录一次内存使用
        if (i % 10 === 0) {
          const usage = process.memoryUsage();
          memoryUsage.push({
            iteration: i,
            heapUsed: usage.heapUsed / 1024 / 1024, // MB
            heapTotal: usage.heapTotal / 1024 / 1024,
            rss: usage.rss / 1024 / 1024
          });
        }
        
      } catch (error) {
        console.warn(`请求失败 (iteration ${i}):`, error.message);
      }
    }
    
    // 分析内存趋势
    const heapUsedTrend = memoryUsage.map(m => m.heapUsed);
    const initialMemory = heapUsedTrend[0];
    const finalMemory = heapUsedTrend[heapUsedTrend.length - 1];
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
    
    const status = memoryIncreasePercent < 50 ? 'PASS' : 'FAIL'; // 内存增长超过50%认为有问题
    
    this.logResult(`内存泄漏测试 - ${endpoint}`, {
      '初始内存使用': `${initialMemory.toFixed(2)}MB`,
      '最终内存使用': `${finalMemory.toFixed(2)}MB`,
      '内存增长': `${memoryIncrease.toFixed(2)}MB`,
      '内存增长百分比': `${memoryIncreasePercent.toFixed(2)}%`,
      '测试迭代数': iterations
    }, status);
    
    return { memoryUsage, memoryIncrease, memoryIncreasePercent };
  }

  // 缓存效果测试
  async testCacheEffectiveness(endpoint, iterations = 20) {
    console.log(`\n💾 缓存效果测试: ${endpoint}`);
    
    const firstRequestTimes = [];
    const cachedRequestTimes = [];
    
    // 第一次请求 (缓存未命中)
    for (let i = 0; i < 5; i++) {
      try {
        const response = await this.makeRequest(endpoint);
        firstRequestTimes.push(response.responseTime);
        
        // 清除缓存的请求间隔
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn('缓存测试请求失败:', error.message);
      }
    }
    
    // 后续请求 (应该命中缓存)
    for (let i = 0; i < iterations - 5; i++) {
      try {
        const response = await this.makeRequest(endpoint);
        cachedRequestTimes.push(response.responseTime);
        
        // 检查缓存头
        if (response.headers['x-cache'] === 'HIT') {
          // 缓存命中
        }
        
      } catch (error) {
        console.warn('缓存测试请求失败:', error.message);
      }
    }
    
    const firstStats = this.calculateStats(firstRequestTimes);
    const cachedStats = this.calculateStats(cachedRequestTimes);
    const cacheImprovement = ((firstStats.avg - cachedStats.avg) / firstStats.avg) * 100;
    
    const status = cacheImprovement > 20 ? 'PASS' : 'WARN'; // 缓存应该至少提升20%性能
    
    this.logResult(`缓存效果测试 - ${endpoint}`, {
      '首次请求平均时间': `${firstStats.avg.toFixed(2)}ms`,
      '缓存请求平均时间': `${cachedStats.avg.toFixed(2)}ms`,
      '性能提升': `${cacheImprovement.toFixed(2)}%`,
      '首次请求数': firstRequestTimes.length,
      '缓存请求数': cachedRequestTimes.length
    }, status);
    
    return { firstStats, cachedStats, cacheImprovement };
  }

  // 生成性能报告
  generateReport() {
    console.log('\n📊 生成性能测试报告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.status === 'PASS').length,
        failedTests: this.results.filter(r => r.status === 'FAIL').length,
        warningTests: this.results.filter(r => r.status === 'WARN').length
      }
    };
    
    // 保存报告到文件
    const reportPath = path.join(__dirname, '../performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📋 性能测试总结:');
    console.log(`✅ 通过: ${report.summary.passedTests}`);
    console.log(`❌ 失败: ${report.summary.failedTests}`);
    console.log(`⚠️  警告: ${report.summary.warningTests}`);
    console.log(`📄 详细报告已保存到: ${reportPath}`);
    
    return report;
  }

  // 运行所有性能测试
  async runAllTests() {
    console.log('⚡ 开始性能测试...');
    console.log(`🎯 目标: ${this.baseUrl}`);
    
    const endpoints = [
      '/api/health',
      '/api/publications',
      '/api/journals',
      '/api/statistics/overview'
    ];
    
    // 单端点性能测试
    for (const endpoint of endpoints) {
      await this.testEndpointPerformance(endpoint, 10);
    }
    
    // 并发测试
    await this.testConcurrency('/api/health', 10, 10000);
    await this.testConcurrency('/api/publications', 5, 15000);
    
    // 内存泄漏测试
    await this.testMemoryLeak('/api/health', 50);
    
    // 缓存效果测试
    await this.testCacheEffectiveness('/api/statistics/overview', 20);
    
    return this.generateReport();
  }
}

// 命令行执行
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost';
  const tester = new PerformanceTester(baseUrl);
  
  tester.runAllTests()
    .then(report => {
      const exitCode = report.summary.failedTests > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ 性能测试失败:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTester;