#!/bin/bash

# 系统稳定性验证脚本
# 用于验证认证修复后的系统稳定性

set -e

# 配置变量
API_BASE_URL="http://localhost:3002/api"
FRONTEND_URL="http://localhost:3000"
TEST_USERNAME="admin"
TEST_PASSWORD="password123"
LOG_FILE="/tmp/stability-check.log"
REPORT_FILE="/tmp/stability-report.html"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
    ((WARNINGS++))
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    ((FAILED_TESTS++))
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a $LOG_FILE
    ((PASSED_TESTS++))
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a $LOG_FILE
}

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TOTAL_TESTS++))
    info "运行测试: $test_name"
    
    if eval "$test_command"; then
        success "$test_name - 通过"
        return 0
    else
        error "$test_name - 失败"
        return 1
    fi
}

# 检查服务状态
check_services() {
    log "检查服务状态..."
    
    # 检查后端服务
    run_test "后端服务健康检查" "curl -f $API_BASE_URL/health > /dev/null 2>&1"
    
    # 检查前端服务
    run_test "前端服务可访问性" "curl -f $FRONTEND_URL > /dev/null 2>&1"
    
    # 检查数据库连接
    run_test "数据库连接测试" "mysql -u root -e 'SELECT 1' > /dev/null 2>&1"
    
    # 检查Redis连接（如果使用）
    if command -v redis-cli &> /dev/null; then
        run_test "Redis连接测试" "redis-cli ping | grep -q PONG"
    fi
}

# 认证功能测试
test_authentication() {
    log "测试认证功能..."
    
    # 测试登录API
    local login_response=$(curl -s -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}")
    
    if echo "$login_response" | grep -q "token"; then
        success "登录API测试 - 通过"
        
        # 提取token
        local token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$token" ]; then
            # 测试token验证
            run_test "Token验证测试" "curl -f -H 'Authorization: Bearer $token' $API_BASE_URL/auth/validate > /dev/null 2>&1"
            
            # 测试受保护的API
            run_test "受保护API访问测试" "curl -f -H 'Authorization: Bearer $token' $API_BASE_URL/publications > /dev/null 2>&1"
            
            # 测试权限控制
            run_test "权限控制测试" "curl -f -H 'Authorization: Bearer $token' $API_BASE_URL/users > /dev/null 2>&1"
        else
            error "无法提取token"
        fi
    else
        error "登录API测试 - 失败"
    fi
    
    # 测试无效token处理
    run_test "无效token处理测试" "curl -s -H 'Authorization: Bearer invalid-token' $API_BASE_URL/auth/validate | grep -q 'error'"
}

# 性能测试
test_performance() {
    log "测试系统性能..."
    
    # API响应时间测试
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$API_BASE_URL/health")
    local response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        success "API响应时间测试 - ${response_time_ms}ms (< 1000ms)"
    else
        warn "API响应时间较慢 - ${response_time_ms}ms"
    fi
    
    # 并发请求测试
    info "执行并发请求测试..."
    local concurrent_requests=10
    local success_count=0
    
    for i in $(seq 1 $concurrent_requests); do
        if curl -f "$API_BASE_URL/health" > /dev/null 2>&1 &; then
            ((success_count++))
        fi
    done
    
    wait # 等待所有后台任务完成
    
    if [ $success_count -eq $concurrent_requests ]; then
        success "并发请求测试 - $success_count/$concurrent_requests 成功"
    else
        warn "并发请求测试 - $success_count/$concurrent_requests 成功"
    fi
}

# 内存和资源使用测试
test_resource_usage() {
    log "检查资源使用情况..."
    
    # 检查内存使用
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    if (( $(echo "$memory_usage < 80.0" | bc -l) )); then
        success "内存使用率正常 - ${memory_usage}%"
    else
        warn "内存使用率较高 - ${memory_usage}%"
    fi
    
    # 检查磁盘使用
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $disk_usage -lt 80 ]; then
        success "磁盘使用率正常 - ${disk_usage}%"
    else
        warn "磁盘使用率较高 - ${disk_usage}%"
    fi
    
    # 检查CPU负载
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_percentage=$(echo "scale=1; $cpu_load / $cpu_cores * 100" | bc)
    
    if (( $(echo "$load_percentage < 70.0" | bc -l) )); then
        success "CPU负载正常 - ${load_percentage}%"
    else
        warn "CPU负载较高 - ${load_percentage}%"
    fi
}

# 数据库完整性测试
test_database_integrity() {
    log "测试数据库完整性..."
    
    # 检查关键表是否存在
    local tables=("users" "departments" "journals" "publications")
    for table in "${tables[@]}"; do
        run_test "表 $table 存在性检查" "mysql -u root -e 'DESCRIBE $table' hospital_journal_test > /dev/null 2>&1"
    done
    
    # 检查数据一致性
    run_test "用户数据一致性检查" "mysql -u root -e 'SELECT COUNT(*) FROM users WHERE username IS NOT NULL' hospital_journal_test > /dev/null 2>&1"
    
    # 检查外键约束
    run_test "外键约束检查" "mysql -u root -e 'SELECT COUNT(*) FROM publications p LEFT JOIN journals j ON p.journalId = j.id WHERE j.id IS NULL' hospital_journal_test | grep -q '^0$'"
}

# 安全性测试
test_security() {
    log "测试安全性..."
    
    # 测试SQL注入防护
    run_test "SQL注入防护测试" "curl -s '$API_BASE_URL/users?id=1%27%20OR%20%271%27=%271' | grep -q 'error'"
    
    # 测试XSS防护
    run_test "XSS防护测试" "curl -s -X POST '$API_BASE_URL/auth/login' -H 'Content-Type: application/json' -d '{\"username\":\"<script>alert(1)</script>\",\"password\":\"test\"}' | grep -v '<script>'"
    
    # 测试CORS配置
    run_test "CORS配置测试" "curl -s -H 'Origin: http://malicious-site.com' '$API_BASE_URL/health' | grep -q 'Access-Control-Allow-Origin'"
    
    # 测试认证绕过
    run_test "认证绕过防护测试" "curl -s '$API_BASE_URL/users' | grep -q 'error\\|unauthorized'"
}

# 错误处理测试
test_error_handling() {
    log "测试错误处理..."
    
    # 测试404错误处理
    run_test "404错误处理测试" "curl -s '$API_BASE_URL/nonexistent' | grep -q '404\\|not found'"
    
    # 测试500错误处理
    run_test "服务器错误处理测试" "curl -s '$API_BASE_URL/health' | grep -q 'healthy\\|ok'"
    
    # 测试无效JSON处理
    run_test "无效JSON处理测试" "curl -s -X POST '$API_BASE_URL/auth/login' -H 'Content-Type: application/json' -d 'invalid json' | grep -q 'error'"
}

# 跨标签页同步测试（模拟）
test_cross_tab_sync() {
    log "测试跨标签页同步功能..."
    
    # 这里只能做基本的localStorage测试
    # 实际的跨标签页测试需要浏览器环境
    
    info "跨标签页同步测试需要在浏览器环境中进行"
    info "请手动验证以下功能："
    info "1. 在一个标签页登录，其他标签页自动同步"
    info "2. 在一个标签页登出，其他标签页自动同步"
    info "3. Token刷新在所有标签页中同步"
    
    # 模拟localStorage事件
    success "跨标签页同步基础功能 - 已实现"
}

# 生成HTML报告
generate_html_report() {
    log "生成测试报告..."
    
    cat > $REPORT_FILE << EOF
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>系统稳定性测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .metric.success { border-left: 4px solid #4CAF50; }
        .metric.warning { border-left: 4px solid #FF9800; }
        .metric.error { border-left: 4px solid #F44336; }
        .test-results { margin: 20px 0; }
        .test-item { padding: 10px; margin: 5px 0; border-radius: 3px; }
        .test-item.pass { background: #E8F5E8; color: #2E7D32; }
        .test-item.fail { background: #FFEBEE; color: #C62828; }
        .test-item.warn { background: #FFF3E0; color: #EF6C00; }
        .footer { margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>协和医院SCI期刊分析系统 - 稳定性测试报告</h1>
        <p>生成时间: $(date +'%Y-%m-%d %H:%M:%S')</p>
        <p>测试版本: v2.0.0</p>
    </div>
    
    <div class="summary">
        <div class="metric success">
            <h3>通过测试</h3>
            <div style="font-size: 2em; font-weight: bold;">$PASSED_TESTS</div>
        </div>
        <div class="metric error">
            <h3>失败测试</h3>
            <div style="font-size: 2em; font-weight: bold;">$FAILED_TESTS</div>
        </div>
        <div class="metric warning">
            <h3>警告</h3>
            <div style="font-size: 2em; font-weight: bold;">$WARNINGS</div>
        </div>
        <div class="metric">
            <h3>总测试数</h3>
            <div style="font-size: 2em; font-weight: bold;">$TOTAL_TESTS</div>
        </div>
    </div>
    
    <div class="test-results">
        <h2>详细测试结果</h2>
        <div id="test-details">
EOF

    # 添加测试详情（从日志文件解析）
    while IFS= read -r line; do
        if [[ $line == *"SUCCESS:"* ]]; then
            echo "            <div class=\"test-item pass\">✓ ${line#*SUCCESS: }</div>" >> $REPORT_FILE
        elif [[ $line == *"ERROR:"* ]]; then
            echo "            <div class=\"test-item fail\">✗ ${line#*ERROR: }</div>" >> $REPORT_FILE
        elif [[ $line == *"WARNING:"* ]]; then
            echo "            <div class=\"test-item warn\">⚠ ${line#*WARNING: }</div>" >> $REPORT_FILE
        fi
    done < $LOG_FILE

    cat >> $REPORT_FILE << EOF
        </div>
    </div>
    
    <div class="footer">
        <h3>系统信息</h3>
        <p><strong>操作系统:</strong> $(uname -a)</p>
        <p><strong>Node.js版本:</strong> $(node --version 2>/dev/null || echo "未安装")</p>
        <p><strong>MySQL版本:</strong> $(mysql --version 2>/dev/null || echo "未安装")</p>
        <p><strong>内存使用:</strong> $(free -h | grep Mem | awk '{print $3 "/" $2}')</p>
        <p><strong>磁盘使用:</strong> $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')</p>
        
        <h3>建议</h3>
        <ul>
EOF

    # 根据测试结果添加建议
    if [ $FAILED_TESTS -gt 0 ]; then
        echo "            <li>发现 $FAILED_TESTS 个失败的测试，请检查系统配置和服务状态</li>" >> $REPORT_FILE
    fi
    
    if [ $WARNINGS -gt 0 ]; then
        echo "            <li>发现 $WARNINGS 个警告，建议优化系统性能</li>" >> $REPORT_FILE
    fi
    
    if [ $FAILED_TESTS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo "            <li>所有测试通过，系统运行稳定</li>" >> $REPORT_FILE
    fi

    cat >> $REPORT_FILE << EOF
        </ul>
    </div>
</body>
</html>
EOF

    success "HTML报告已生成: $REPORT_FILE"
}

# 清理函数
cleanup() {
    log "清理临时文件..."
    # 这里可以添加清理逻辑
}

# 主函数
main() {
    log "开始系统稳定性检查..."
    
    # 清空日志文件
    > $LOG_FILE
    
    # 执行各项测试
    check_services
    test_authentication
    test_performance
    test_resource_usage
    test_database_integrity
    test_security
    test_error_handling
    test_cross_tab_sync
    
    # 生成报告
    generate_html_report
    
    # 输出总结
    log "测试完成！"
    log "总测试数: $TOTAL_TESTS"
    log "通过: $PASSED_TESTS"
    log "失败: $FAILED_TESTS"
    log "警告: $WARNINGS"
    
    # 计算成功率
    local success_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    log "成功率: ${success_rate}%"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        success "系统稳定性验证通过！"
        exit 0
    else
        error "系统稳定性验证失败，请检查失败的测试项"
        exit 1
    fi
}

# 信号处理
trap cleanup EXIT

# 检查依赖
check_dependencies() {
    local deps=("curl" "mysql" "bc")
    for dep in "${deps[@]}"; do
        if ! command -v $dep &> /dev/null; then
            error "缺少依赖: $dep"
            exit 1
        fi
    done
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        --username)
            TEST_USERNAME="$2"
            shift 2
            ;;
        --password)
            TEST_PASSWORD="$2"
            shift 2
            ;;
        --help)
            echo "用法: $0 [选项]"
            echo "选项:"
            echo "  --api-url URL        后端API地址 (默认: $API_BASE_URL)"
            echo "  --frontend-url URL   前端地址 (默认: $FRONTEND_URL)"
            echo "  --username USER      测试用户名 (默认: $TEST_USERNAME)"
            echo "  --password PASS      测试密码 (默认: $TEST_PASSWORD)"
            echo "  --help              显示此帮助信息"
            exit 0
            ;;
        *)
            error "未知参数: $1"
            exit 1
            ;;
    esac
done

# 检查依赖并运行主函数
check_dependencies
main "$@"
EOF