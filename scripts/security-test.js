#!/usr/bin/env node

/**
 * 安全测试脚本
 * 检查常见的安全漏洞和配置问题
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

class SecurityTester {
  constructor(baseUrl = 'http://localhost') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  // 记录测试结果
  logResult(test, status, message, details = null) {
    const result = {
      test,
      status, // 'PASS', 'FAIL', 'WARN'
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${message}`);
    
    if (details) {
      console.log(`   详情: ${JSON.stringify(details, null, 2)}`);
    }
  }

  // HTTP请求辅助函数
  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  // 测试安全头
  async testSecurityHeaders() {
    console.log('\n🔒 测试安全头...');
    
    try {
      const response = await this.makeRequest('/');
      const headers = response.headers;
      
      // 检查必要的安全头
      const requiredHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': null, // 只检查存在性
        'content-security-policy': null,
        'referrer-policy': 'strict-origin-when-cross-origin'
      };
      
      Object.entries(requiredHeaders).forEach(([header, expectedValue]) => {
        const actualValue = headers[header];
        
        if (!actualValue) {
          this.logResult(
            `安全头检查: ${header}`,
            'FAIL',
            '缺少安全头',
            { expected: expectedValue || '任意值', actual: '未设置' }
          );
        } else if (expectedValue && actualValue !== expectedValue) {
          this.logResult(
            `安全头检查: ${header}`,
            'WARN',
            '安全头值可能不够安全',
            { expected: expectedValue, actual: actualValue }
          );
        } else {
          this.logResult(
            `安全头检查: ${header}`,
            'PASS',
            '安全头配置正确',
            { value: actualValue }
          );
        }
      });
      
    } catch (error) {
      this.logResult('安全头检查', 'FAIL', '无法连接到服务器', { error: error.message });
    }
  }

  // 测试HTTPS重定向
  async testHTTPSRedirect() {
    console.log('\n🔐 测试HTTPS重定向...');
    
    try {
      const response = await this.makeRequest('/', { method: 'GET' });
      
      if (response.statusCode === 301 || response.statusCode === 302) {
        const location = response.headers.location;
        if (location && location.startsWith('https://')) {
          this.logResult('HTTPS重定向', 'PASS', 'HTTP请求正确重定向到HTTPS');
        } else {
          this.logResult('HTTPS重定向', 'FAIL', '重定向目标不是HTTPS', { location });
        }
      } else if (this.baseUrl.startsWith('https://')) {
        this.logResult('HTTPS重定向', 'PASS', '服务器已使用HTTPS');
      } else {
        this.logResult('HTTPS重定向', 'WARN', '服务器未强制使用HTTPS');
      }
      
    } catch (error) {
      this.logResult('HTTPS重定向', 'FAIL', '测试失败', { error: error.message });
    }
  }

  // 测试SQL注入防护
  async testSQLInjection() {
    console.log('\n💉 测试SQL注入防护...');
    
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1#"
    ];
    
    for (const payload of sqlPayloads) {
      try {
        const response = await this.makeRequest(`/api/publications?search=${encodeURIComponent(payload)}`);
        
        if (response.statusCode === 500) {
          this.logResult(
            'SQL注入防护',
            'FAIL',
            '可能存在SQL注入漏洞',
            { payload, statusCode: response.statusCode }
          );
        } else if (response.statusCode === 400) {
          this.logResult(
            'SQL注入防护',
            'PASS',
            '输入验证正常工作',
            { payload }
          );
        } else {
          this.logResult(
            'SQL注入防护',
            'PASS',
            '请求被正常处理',
            { payload, statusCode: response.statusCode }
          );
        }
        
      } catch (error) {
        this.logResult(
          'SQL注入防护',
          'WARN',
          '测试请求失败',
          { payload, error: error.message }
        );
      }
    }
  }

  // 测试XSS防护
  async testXSSProtection() {
    console.log('\n🚫 测试XSS防护...');
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")',
      '<svg onload="alert(1)">'
    ];
    
    for (const payload of xssPayloads) {
      try {
        const response = await this.makeRequest('/api/publications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload,
            authors: 'Test Author',
            journalId: 1,
            departmentId: 1,
            publishYear: 2023
          })
        });
        
        if (response.body.includes(payload)) {
          this.logResult(
            'XSS防护',
            'FAIL',
            '可能存在XSS漏洞',
            { payload }
          );
        } else {
          this.logResult(
            'XSS防护',
            'PASS',
            '输入被正确过滤或转义',
            { payload }
          );
        }
        
      } catch (error) {
        this.logResult(
          'XSS防护',
          'WARN',
          '测试请求失败',
          { payload, error: error.message }
        );
      }
    }
  }

  // 测试认证绕过
  async testAuthBypass() {
    console.log('\n🔑 测试认证绕过...');
    
    const protectedEndpoints = [
      '/api/users',
      '/api/publications',
      '/api/journals',
      '/api/statistics'
    ];
    
    for (const endpoint of protectedEndpoints) {
      try {
        const response = await this.makeRequest(endpoint);
        
        if (response.statusCode === 401 || response.statusCode === 403) {
          this.logResult(
            '认证检查',
            'PASS',
            `端点 ${endpoint} 正确要求认证`,
            { statusCode: response.statusCode }
          );
        } else if (response.statusCode === 200) {
          this.logResult(
            '认证检查',
            'FAIL',
            `端点 ${endpoint} 可能存在认证绕过`,
            { statusCode: response.statusCode }
          );
        } else {
          this.logResult(
            '认证检查',
            'WARN',
            `端点 ${endpoint} 返回意外状态码`,
            { statusCode: response.statusCode }
          );
        }
        
      } catch (error) {
        this.logResult(
          '认证检查',
          'WARN',
          `测试端点 ${endpoint} 失败`,
          { error: error.message }
        );
      }
    }
  }

  // 测试文件上传安全
  async testFileUploadSecurity() {
    console.log('\n📁 测试文件上传安全...');
    
    // 这里只是示例，实际测试需要构造multipart/form-data
    const maliciousFiles = [
      { name: 'test.php', content: '<?php echo "test"; ?>' },
      { name: 'test.jsp', content: '<% out.println("test"); %>' },
      { name: '../../../etc/passwd', content: 'malicious content' },
      { name: 'test.exe', content: 'MZ\x90\x00' } // PE header
    ];
    
    for (const file of maliciousFiles) {
      this.logResult(
        '文件上传安全',
        'WARN',
        `需要手动测试恶意文件上传: ${file.name}`,
        { filename: file.name }
      );
    }
  }

  // 测试敏感信息泄露
  async testInformationDisclosure() {
    console.log('\n🔍 测试敏感信息泄露...');
    
    const sensitiveEndpoints = [
      '/.env',
      '/config.json',
      '/package.json',
      '/api/debug',
      '/api/config',
      '/server-status',
      '/phpinfo.php'
    ];
    
    for (const endpoint of sensitiveEndpoints) {
      try {
        const response = await this.makeRequest(endpoint);
        
        if (response.statusCode === 200) {
          this.logResult(
            '敏感信息泄露',
            'FAIL',
            `敏感端点 ${endpoint} 可访问`,
            { statusCode: response.statusCode }
          );
        } else {
          this.logResult(
            '敏感信息泄露',
            'PASS',
            `敏感端点 ${endpoint} 不可访问`,
            { statusCode: response.statusCode }
          );
        }
        
      } catch (error) {
        this.logResult(
          '敏感信息泄露',
          'PASS',
          `敏感端点 ${endpoint} 不可访问`,
          { error: error.message }
        );
      }
    }
  }

  // 生成报告
  generateReport() {
    console.log('\n📊 生成安全测试报告...');
    
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      warnings: this.results.filter(r => r.status === 'WARN').length
    };
    
    const report = {
      summary,
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results
    };
    
    // 保存报告到文件
    const reportPath = path.join(__dirname, '../security-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📋 测试总结:');
    console.log(`✅ 通过: ${summary.passed}`);
    console.log(`❌ 失败: ${summary.failed}`);
    console.log(`⚠️  警告: ${summary.warnings}`);
    console.log(`📄 详细报告已保存到: ${reportPath}`);
    
    return report;
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🔐 开始安全测试...');
    console.log(`🎯 目标: ${this.baseUrl}`);
    
    await this.testSecurityHeaders();
    await this.testHTTPSRedirect();
    await this.testSQLInjection();
    await this.testXSSProtection();
    await this.testAuthBypass();
    await this.testFileUploadSecurity();
    await this.testInformationDisclosure();
    
    return this.generateReport();
  }
}

// 命令行执行
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost';
  const tester = new SecurityTester(baseUrl);
  
  tester.runAllTests()
    .then(report => {
      const exitCode = report.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ 安全测试失败:', error);
      process.exit(1);
    });
}

module.exports = SecurityTester;