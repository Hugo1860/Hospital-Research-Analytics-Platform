#!/bin/bash

# 集成测试和端到端测试运行脚本

set -e

echo "🚀 开始运行集成测试和端到端测试..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查依赖
check_dependencies() {
    echo "📋 检查测试依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 依赖检查通过${NC}"
}

# 启动测试数据库
setup_test_database() {
    echo "🗄️ 设置测试数据库..."
    
    # 设置测试环境变量
    export NODE_ENV=test
    export DB_NAME=hospital_journal_test
    export DB_USER=root
    export DB_PASSWORD=password
    export DB_HOST=localhost
    export DB_PORT=3306
    
    # 创建测试数据库（如果不存在）
    mysql -u${DB_USER} -p${DB_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};" 2>/dev/null || {
        echo -e "${YELLOW}⚠️ 无法连接到MySQL，请确保数据库服务正在运行${NC}"
        echo "请手动创建测试数据库: ${DB_NAME}"
    }
    
    echo -e "${GREEN}✅ 测试数据库设置完成${NC}"
}

# 运行后端集成测试
run_backend_tests() {
    echo "🔧 运行后端集成测试..."
    
    cd backend
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        echo "📦 安装后端依赖..."
        npm install
    fi
    
    # 运行数据库迁移
    echo "🔄 运行数据库迁移..."
    npm run migrate:test || {
        echo -e "${YELLOW}⚠️ 数据库迁移失败，尝试重置数据库${NC}"
        npm run db:reset:test
    }
    
    # 运行集成测试
    echo "🧪 执行后端集成测试..."
    npm run test:integration || {
        echo -e "${RED}❌ 后端集成测试失败${NC}"
        cd ..
        return 1
    }
    
    cd ..
    echo -e "${GREEN}✅ 后端集成测试通过${NC}"
}

# 启动后端服务
start_backend_service() {
    echo "🚀 启动后端测试服务..."
    
    cd backend
    
    # 设置测试环境
    export NODE_ENV=test
    export PORT=3001
    
    # 启动后端服务（后台运行）
    npm start &
    BACKEND_PID=$!
    
    # 等待服务启动
    echo "⏳ 等待后端服务启动..."
    sleep 10
    
    # 检查服务是否启动成功
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端服务启动成功${NC}"
    else
        echo -e "${RED}❌ 后端服务启动失败${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        cd ..
        return 1
    fi
    
    cd ..
    echo $BACKEND_PID > .backend_test_pid
}

# 运行前端集成测试
run_frontend_integration_tests() {
    echo "⚛️ 运行前端集成测试..."
    
    cd frontend
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        echo "📦 安装前端依赖..."
        npm install
    fi
    
    # 安装测试依赖
    if ! npm list @testing-library/react > /dev/null 2>&1; then
        echo "📦 安装测试依赖..."
        npm install --save-dev @testing-library/react @testing-library/jest-dom msw
    fi
    
    # 运行集成测试
    echo "🧪 执行前端集成测试..."
    npm run test:integration || {
        echo -e "${RED}❌ 前端集成测试失败${NC}"
        cd ..
        return 1
    }
    
    cd ..
    echo -e "${GREEN}✅ 前端集成测试通过${NC}"
}

# 启动前端服务
start_frontend_service() {
    echo "🌐 启动前端测试服务..."
    
    cd frontend
    
    # 设置测试环境变量
    export REACT_APP_API_URL=http://localhost:3001/api
    export REACT_APP_ENV=test
    
    # 构建前端应用
    echo "🔨 构建前端应用..."
    npm run build
    
    # 启动前端服务（后台运行）
    npx serve -s build -l 3000 &
    FRONTEND_PID=$!
    
    # 等待服务启动
    echo "⏳ 等待前端服务启动..."
    sleep 5
    
    # 检查服务是否启动成功
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端服务启动成功${NC}"
    else
        echo -e "${RED}❌ 前端服务启动失败${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
        cd ..
        return 1
    fi
    
    cd ..
    echo $FRONTEND_PID > .frontend_test_pid
}

# 运行端到端测试
run_e2e_tests() {
    echo "🎭 运行端到端测试..."
    
    cd frontend
    
    # 安装Playwright
    if ! npm list @playwright/test > /dev/null 2>&1; then
        echo "📦 安装Playwright..."
        npm install --save-dev @playwright/test
        npx playwright install
    fi
    
    # 运行端到端测试
    echo "🧪 执行端到端测试..."
    npx playwright test || {
        echo -e "${RED}❌ 端到端测试失败${NC}"
        cd ..
        return 1
    }
    
    cd ..
    echo -e "${GREEN}✅ 端到端测试通过${NC}"
}

# 清理测试环境
cleanup() {
    echo "🧹 清理测试环境..."
    
    # 停止后端服务
    if [ -f .backend_test_pid ]; then
        BACKEND_PID=$(cat .backend_test_pid)
        kill $BACKEND_PID 2>/dev/null || true
        rm .backend_test_pid
        echo "🛑 后端测试服务已停止"
    fi
    
    # 停止前端服务
    if [ -f .frontend_test_pid ]; then
        FRONTEND_PID=$(cat .frontend_test_pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm .frontend_test_pid
        echo "🛑 前端测试服务已停止"
    fi
    
    # 清理测试数据库
    if [ "$NODE_ENV" = "test" ]; then
        echo "🗄️ 清理测试数据库..."
        mysql -u${DB_USER} -p${DB_PASSWORD} -e "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 生成测试报告
generate_report() {
    echo "📊 生成测试报告..."
    
    REPORT_DIR="test-reports"
    mkdir -p $REPORT_DIR
    
    # 收集测试结果
    echo "# 集成测试和端到端测试报告" > $REPORT_DIR/test-report.md
    echo "" >> $REPORT_DIR/test-report.md
    echo "生成时间: $(date)" >> $REPORT_DIR/test-report.md
    echo "" >> $REPORT_DIR/test-report.md
    
    # 后端测试结果
    if [ -f backend/coverage/lcov-report/index.html ]; then
        echo "## 后端测试覆盖率" >> $REPORT_DIR/test-report.md
        echo "详细报告: [backend/coverage/lcov-report/index.html](../backend/coverage/lcov-report/index.html)" >> $REPORT_DIR/test-report.md
        echo "" >> $REPORT_DIR/test-report.md
    fi
    
    # 前端测试结果
    if [ -f frontend/coverage/lcov-report/index.html ]; then
        echo "## 前端测试覆盖率" >> $REPORT_DIR/test-report.md
        echo "详细报告: [frontend/coverage/lcov-report/index.html](../frontend/coverage/lcov-report/index.html)" >> $REPORT_DIR/test-report.md
        echo "" >> $REPORT_DIR/test-report.md
    fi
    
    # Playwright测试结果
    if [ -f frontend/playwright-report/index.html ]; then
        echo "## 端到端测试报告" >> $REPORT_DIR/test-report.md
        echo "详细报告: [frontend/playwright-report/index.html](../frontend/playwright-report/index.html)" >> $REPORT_DIR/test-report.md
        echo "" >> $REPORT_DIR/test-report.md
    fi
    
    echo -e "${GREEN}✅ 测试报告已生成: $REPORT_DIR/test-report.md${NC}"
}

# 主函数
main() {
    echo "🎯 开始执行完整的集成测试流程..."
    
    # 设置错误处理
    trap cleanup EXIT
    
    # 执行测试步骤
    check_dependencies
    setup_test_database
    
    # 运行后端测试
    if ! run_backend_tests; then
        echo -e "${RED}❌ 后端集成测试失败，停止执行${NC}"
        exit 1
    fi
    
    # 启动服务
    if ! start_backend_service; then
        echo -e "${RED}❌ 无法启动后端服务，停止执行${NC}"
        exit 1
    fi
    
    if ! start_frontend_service; then
        echo -e "${RED}❌ 无法启动前端服务，停止执行${NC}"
        exit 1
    fi
    
    # 运行前端集成测试
    if ! run_frontend_integration_tests; then
        echo -e "${RED}❌ 前端集成测试失败${NC}"
        # 继续执行，不退出
    fi
    
    # 运行端到端测试
    if ! run_e2e_tests; then
        echo -e "${RED}❌ 端到端测试失败${NC}"
        # 继续执行，不退出
    fi
    
    # 生成报告
    generate_report
    
    echo -e "${GREEN}🎉 集成测试和端到端测试执行完成！${NC}"
}

# 解析命令行参数
case "${1:-all}" in
    "backend")
        check_dependencies
        setup_test_database
        run_backend_tests
        ;;
    "frontend")
        check_dependencies
        run_frontend_integration_tests
        ;;
    "e2e")
        check_dependencies
        start_backend_service
        start_frontend_service
        run_e2e_tests
        cleanup
        ;;
    "all"|*)
        main
        ;;
esac