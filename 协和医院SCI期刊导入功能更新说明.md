# 协和医院SCI期刊导入功能更新说明

## 更新概述

根据协和医院的需求，我们已经成功更新了期刊导入功能，支持协和医院专用的导入模板格式。新的导入模板包含以下字段：

## 新增字段

| 字段名称 | 数据库字段 | 是否必填 | 说明 |
|---------|-----------|---------|------|
| WOS号 | wosNumber | 否 | Web of Science数据库中的唯一标识符 |
| 文章标题 | title | **是** | 文献的完整标题 |
| 作者 | authors | **是** | 所有作者姓名，用逗号分隔 |
| 文献类型 | documentType | 否 | 如：Article, Review, Letter等 |
| 期刊名称 | journalName | **是** | 期刊的完整名称 |
| 期刊简称 | journalAbbreviation | 否 | 期刊的标准简称 |
| ISSN | issn | 否 | 期刊的国际标准刊号，格式：XXXX-XXXX |
| 年 | publishYear | **是** | 发表年份 |
| 卷 | volume | 否 | 期刊卷号 |
| 期 | issue | 否 | 期刊期号 |
| 地址 | address | 否 | 作者单位地址信息 |
| 页码 | pages | 否 | 文献页码范围 |
| DOI | doi | 否 | 数字对象标识符 |
| PMID | pmid | 否 | PubMed数据库ID |
| 科室 | departmentName | **是** | 发表文献的科室名称 |

## 技术实现

### 1. 数据库更新

- **新增迁移文件**: `backend/src/migrations/20240201000001-add-wos-fields-to-publications.js`
- **更新Publication模型**: 添加了 `wosNumber`, `documentType`, `journalAbbreviation`, `address` 字段
- **添加索引**: 为WOS号和文献类型字段添加了数据库索引

### 2. 后端功能更新

#### 文献解析器 (`backend/src/utils/publicationParser.js`)
- 更新字段映射以支持协和医院模板
- 增强期刊匹配功能，支持通过期刊名称、简称、ISSN进行匹配
- 添加新字段的数据验证和清理功能
- 支持WOS号、ISSN格式验证

#### 文献控制器 (`backend/src/controllers/publicationController.js`)
- 更新导入功能以处理新字段
- 添加WOS号重复检查
- 增强期刊匹配逻辑
- 更新模板下载功能使用协和医院专用模板

#### 模板生成器 (`backend/src/utils/templateGenerator.js`)
- 创建协和医院专用的Excel导入模板
- 包含详细的字段说明和示例数据
- 支持多工作表（模板+说明）

### 3. 前端功能更新

#### 文献表单 (`frontend/src/components/publications/PublicationForm.tsx`)
- 添加新字段的输入控件：WOS号、文献类型、期刊简称、地址信息
- 更新表单验证规则
- 优化表单布局

#### 文献列表 (`frontend/src/components/publications/PublicationList.tsx`)
- 更新Publication接口定义
- 在详情模态框中显示新字段
- 支持新字段的搜索和筛选

### 4. 系统名称更新

将系统名称从"医院期刊发表信息统计系统"更新为"**协和医院SCI期刊分析系统**"，涉及文件：
- 前端组件（侧边栏、登录页面等）
- 后端API响应
- 文档和配置文件
- 测试文件

## 功能特性

### 1. 智能期刊匹配
- 支持通过期刊名称精确匹配
- 支持通过期刊简称模糊匹配
- 支持通过ISSN精确匹配
- 优先级：ISSN > 期刊名称 > 期刊简称

### 2. 数据验证
- **WOS号**: 最大50字符
- **文献类型**: 最大50字符
- **期刊简称**: 最大100字符
- **ISSN**: 格式验证（XXXX-XXXX）
- **地址信息**: 支持长文本

### 3. 重复检查
- DOI重复检查
- PMID重复检查
- **新增**: WOS号重复检查

### 4. 导入模板
- 协和医院专用Excel模板
- 包含示例数据和详细说明
- 支持多种文件格式（Excel、CSV）

## 部署说明

### 1. 数据库迁移
```bash
cd backend
npx sequelize-cli db:migrate
```

### 2. 安装依赖
```bash
cd backend
npm install csv-parser
```

### 3. 服务启动
```bash
# 后端服务（端口3002）
cd backend
npm start

# 前端服务（端口3000）
cd frontend
npm start
```

### 4. 访问地址
- 前端界面: http://localhost:3000
- 后端API: http://localhost:3002
- 健康检查: http://localhost:3002/health

## 使用指南

### 1. 下载模板
- 在文献管理页面点击"下载模板"按钮
- 获取协和医院专用的Excel导入模板

### 2. 填写数据
- 按照模板格式填写文献数据
- 必填字段：文章标题、作者、期刊名称、年、科室
- 建议填写：WOS号、文献类型、ISSN、DOI等

### 3. 导入数据
- 选择"导入文献"功能
- 上传填写好的Excel或CSV文件
- 系统自动验证和匹配数据
- 查看导入结果报告

### 4. 数据管理
- 在文献列表中查看导入的数据
- 支持按新字段进行搜索和筛选
- 在详情页面查看完整的文献信息

## 注意事项

1. **数据格式**: 严格按照模板格式填写，不要修改表头名称
2. **期刊匹配**: 确保期刊名称、简称或ISSN正确，系统会自动匹配期刊信息
3. **科室名称**: 必须与系统中的科室名称完全一致
4. **重复数据**: 系统会自动检查DOI、PMID、WOS号重复
5. **文件大小**: 建议单次导入不超过1000条记录

## 技术支持

如遇到问题，请联系技术支持团队：
- 系统管理员
- 开发团队

---

**更新完成时间**: 2025年7月31日  
**版本**: v2.0 - 协和医院专版