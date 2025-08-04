const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Journal, Department } = require('../models');
const { Op } = require('sequelize');

// 文献数据解析结果类
class PublicationParseResult {
  constructor() {
    this.success = 0;
    this.failed = 0;
    this.duplicates = 0;
    this.errors = [];
    this.data = [];
    this.summary = {};
  }

  addSuccess(data) {
    this.success++;
    this.data.push(data);
  }

  addError(row, error, data = null) {
    this.failed++;
    this.errors.push({
      row: row,
      error: error,
      data: data
    });
  }

  addDuplicate(row, data) {
    this.duplicates++;
    this.errors.push({
      row: row,
      error: '数据重复',
      data: data
    });
  }

  getSummary() {
    return {
      total: this.success + this.failed + this.duplicates,
      success: this.success,
      failed: this.failed,
      duplicates: this.duplicates,
      hasErrors: this.errors.length > 0
    };
  }
}

// 文献数据字段映射 - 支持协和医院模板
const PUBLICATION_FIELD_MAPPING = {
  // 协和医院模板字段
  'WOS号': 'wosNumber',
  'wos号': 'wosNumber',
  'WOS Number': 'wosNumber',
  'WOS': 'wosNumber',
  
  '文章标题': 'title',
  '标题': 'title',
  '题目': 'title',
  'Title': 'title',
  
  '作者': 'authors',
  '作者列表': 'authors',
  'Authors': 'authors',
  'Author': 'authors',
  
  '文献类型': 'documentType',
  '文档类型': 'documentType',
  'Document Type': 'documentType',
  'Type': 'documentType',
  
  '期刊名称': 'journalName',
  '期刊': 'journalName',
  '期刊名': 'journalName',
  'Journal': 'journalName',
  'Journal Name': 'journalName',
  
  '期刊简称': 'journalAbbreviation',
  '简称': 'journalAbbreviation',
  'Journal Abbreviation': 'journalAbbreviation',
  'Abbreviation': 'journalAbbreviation',
  
  'ISSN': 'issn',
  'issn': 'issn',
  
  '年': 'publishYear',
  '发表年份': 'publishYear',
  '年份': 'publishYear',
  'Year': 'publishYear',
  'Publish Year': 'publishYear',
  
  '卷': 'volume',
  '卷号': 'volume',
  'Volume': 'volume',
  'Vol': 'volume',
  
  '期': 'issue',
  '期号': 'issue',
  'Issue': 'issue',
  'No': 'issue',
  
  '地址': 'address',
  '地址信息': 'address',
  'Address': 'address',
  'Addresses': 'address',
  
  '页码': 'pages',
  '页数': 'pages',
  'Pages': 'pages',
  'Page': 'pages',
  
  'DOI': 'doi',
  'doi': 'doi',
  
  'PMID': 'pmid',
  'pmid': 'pmid',
  'PubMed ID': 'pmid',
  
  '科室': 'departmentName',
  '科室名称': 'departmentName',
  '部门': 'departmentName',
  'Department': 'departmentName'
};

// 标准化字段名
const normalizeFieldName = (fieldName) => {
  if (!fieldName) return null;
  
  const trimmed = fieldName.toString().trim();
  return PUBLICATION_FIELD_MAPPING[trimmed] || trimmed.toLowerCase();
};

// 验证文献数据
const validatePublicationData = (data, row) => {
  const errors = [];
  
  // 必填字段检查
  if (!data.title || data.title.toString().trim() === '') {
    errors.push('文献标题不能为空');
  }
  
  if (!data.authors || data.authors.toString().trim() === '') {
    errors.push('作者信息不能为空');
  }
  
  if (!data.journalName || data.journalName.toString().trim() === '') {
    errors.push('期刊名称不能为空');
  }
  
  if (!data.departmentName || data.departmentName.toString().trim() === '') {
    errors.push('科室名称不能为空');
  }
  
  if (!data.publishYear) {
    errors.push('发表年份不能为空');
  } else {
    const year = parseInt(data.publishYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1900 || year > currentYear) {
      errors.push(`发表年份必须是1900-${currentYear}之间的整数`);
    }
  }
  
  // DOI格式检查（如果提供）
  if (data.doi && data.doi.toString().trim() !== '') {
    const doi = data.doi.toString().trim();
    if (doi.length > 100) {
      errors.push('DOI长度不能超过100字符');
    }
  }
  
  // PMID格式检查（如果提供）
  if (data.pmid && data.pmid.toString().trim() !== '') {
    const pmid = data.pmid.toString().trim();
    if (!/^\d+$/.test(pmid)) {
      errors.push('PMID必须是数字');
    }
    if (pmid.length > 20) {
      errors.push('PMID长度不能超过20字符');
    }
  }
  
  // WOS号格式检查（如果提供）
  if (data.wosNumber && data.wosNumber.toString().trim() !== '') {
    const wos = data.wosNumber.toString().trim();
    if (wos.length > 50) {
      errors.push('WOS号长度不能超过50字符');
    }
  }
  
  // 文献类型检查（如果提供）
  if (data.documentType && data.documentType.toString().trim() !== '') {
    const docType = data.documentType.toString().trim();
    if (docType.length > 50) {
      errors.push('文献类型长度不能超过50字符');
    }
  }
  
  // 期刊简称检查（如果提供）
  if (data.journalAbbreviation && data.journalAbbreviation.toString().trim() !== '') {
    const abbr = data.journalAbbreviation.toString().trim();
    if (abbr.length > 100) {
      errors.push('期刊简称长度不能超过100字符');
    }
  }
  
  // ISSN格式检查（如果提供）
  if (data.issn && data.issn.toString().trim() !== '') {
    const issn = data.issn.toString().trim();
    // ISSN格式：XXXX-XXXX
    if (!/^\d{4}-\d{3}[\dX]$/.test(issn)) {
      errors.push('ISSN格式不正确，应为XXXX-XXXX格式');
    }
  }
  
  return errors;
};

// 清理和标准化数据
const cleanPublicationData = (rawData) => {
  const cleaned = {};
  
  // 标准化字段名并清理数据
  Object.keys(rawData).forEach(key => {
    const normalizedKey = normalizeFieldName(key);
    if (normalizedKey && rawData[key] !== null && rawData[key] !== undefined) {
      const value = rawData[key].toString().trim();
      if (value !== '') {
        cleaned[normalizedKey] = value;
      }
    }
  });
  
  // 特殊处理
  if (cleaned.publishYear) {
    cleaned.publishYear = parseInt(cleaned.publishYear);
  }
  
  // 清理各种字段
  if (cleaned.doi) {
    cleaned.doi = cleaned.doi.trim();
  }
  
  if (cleaned.pmid) {
    cleaned.pmid = cleaned.pmid.trim();
  }
  
  if (cleaned.wosNumber) {
    cleaned.wosNumber = cleaned.wosNumber.trim();
  }
  
  if (cleaned.documentType) {
    cleaned.documentType = cleaned.documentType.trim();
  }
  
  if (cleaned.journalAbbreviation) {
    cleaned.journalAbbreviation = cleaned.journalAbbreviation.trim();
  }
  
  if (cleaned.issn) {
    cleaned.issn = cleaned.issn.trim().toUpperCase();
  }
  
  if (cleaned.address) {
    cleaned.address = cleaned.address.trim();
  }
  
  return cleaned;
};

// 期刊智能匹配 - 支持名称、简称、ISSN匹配
const matchJournalByName = async (journalName, journalAbbreviation = null, issn = null) => {
  if (!journalName && !journalAbbreviation && !issn) return null;
  
  // 优先通过ISSN匹配（最准确）
  if (issn) {
    const journal = await Journal.findOne({
      where: { issn: issn.trim() }
    });
    if (journal) return journal;
  }
  
  // 通过期刊名称匹配
  if (journalName) {
    const name = journalName.trim();
    
    // 精确匹配
    let journal = await Journal.findOne({
      where: { name: name }
    });
    
    if (journal) return journal;
    
    // 模糊匹配
    journal = await Journal.findOne({
      where: {
        name: {
          [Op.like]: `%${name}%`
        }
      },
      order: [['impactFactor', 'DESC']] // 优先选择影响因子高的
    });
    
    if (journal) return journal;
    
    // 反向模糊匹配（期刊名包含输入的名称）
    const journals = await Journal.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `${name}%` } },
          { name: { [Op.like]: `%${name}` } }
        ]
      },
      order: [['impactFactor', 'DESC']],
      limit: 1
    });
    
    if (journals.length > 0) return journals[0];
  }
  
  // 通过期刊简称匹配（如果有的话，需要在Journal模型中添加abbreviation字段）
  if (journalAbbreviation) {
    const abbr = journalAbbreviation.trim();
    
    // 这里假设Journal模型有abbreviation字段，如果没有可以通过名称模糊匹配
    const journal = await Journal.findOne({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${abbr}%` } },
          // 如果有abbreviation字段：{ abbreviation: abbr }
        ]
      },
      order: [['impactFactor', 'DESC']],
      limit: 1
    });
    
    if (journal) return journal;
  }
  
  return null;
};

// 科室名称匹配
const matchDepartmentByName = async (departmentName) => {
  if (!departmentName) return null;
  
  const name = departmentName.trim();
  
  // 精确匹配
  let department = await Department.findOne({
    where: { name: name }
  });
  
  if (department) return department;
  
  // 模糊匹配
  department = await Department.findOne({
    where: {
      name: {
        [Op.like]: `%${name}%`
      }
    }
  });
  
  if (department) return department;
  
  // 通过代码匹配
  department = await Department.findOne({
    where: { code: name.toUpperCase() }
  });
  
  return department;
};

// 解析Excel文件
const parseExcelFile = async (filePath, departmentId = null) => {
  const result = new PublicationParseResult();
  
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    // 获取第一个工作表
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel文件中没有找到工作表');
    }
    
    // 获取表头
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? cell.value.toString().trim() : '';
    });
    
    if (headers.length === 0) {
      throw new Error('Excel文件中没有找到表头');
    }
    
    // 解析数据行
    let rowNumber = 1;
    worksheet.eachRow(async (row, rowIndex) => {
      if (rowIndex === 1) return; // 跳过表头
      
      rowNumber++;
      const rowData = {};
      let hasData = false;
      
      // 读取每个单元格
      row.eachCell((cell, colNumber) => {
        if (headers[colNumber]) {
          const value = cell.value;
          if (value !== null && value !== undefined && value !== '') {
            rowData[headers[colNumber]] = value;
            hasData = true;
          }
        }
      });
      
      // 跳过空行
      if (!hasData) return;
      
      try {
        // 清理和标准化数据
        const cleanedData = cleanPublicationData(rowData);
        
        // 验证数据
        const validationErrors = validatePublicationData(cleanedData, rowNumber);
        if (validationErrors.length > 0) {
          result.addError(rowNumber, validationErrors.join('; '), cleanedData);
          return;
        }
        
        // 如果指定了科室ID，使用指定的科室
        if (departmentId) {
          cleanedData.departmentId = departmentId;
          delete cleanedData.departmentName;
        }
        
        result.addSuccess(cleanedData);
      } catch (error) {
        result.addError(rowNumber, error.message, rowData);
      }
    });
    
  } catch (error) {
    throw new Error(`Excel文件解析失败: ${error.message}`);
  }
  
  return result;
};

// 解析CSV文件
const parseCSVFile = async (filePath, departmentId = null) => {
  const result = new PublicationParseResult();
  
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = [];
    let rowNumber = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers = headerList;
      })
      .on('data', (data) => {
        rowNumber++;
        rows.push({ rowNumber: rowNumber + 1, data }); // +1 因为表头占第1行
      })
      .on('end', async () => {
        try {
          if (headers.length === 0) {
            throw new Error('CSV文件中没有找到表头');
          }
          
          for (const { rowNumber, data } of rows) {
            try {
              // 清理和标准化数据
              const cleanedData = cleanPublicationData(data);
              
              // 验证数据
              const validationErrors = validatePublicationData(cleanedData, rowNumber);
              if (validationErrors.length > 0) {
                result.addError(rowNumber, validationErrors.join('; '), cleanedData);
                continue;
              }
              
              // 如果指定了科室ID，使用指定的科室
              if (departmentId) {
                cleanedData.departmentId = departmentId;
                delete cleanedData.departmentName;
              }
              
              result.addSuccess(cleanedData);
            } catch (error) {
              result.addError(rowNumber, error.message, data);
            }
          }
          
          resolve(result);
        } catch (error) {
          reject(new Error(`CSV文件解析失败: ${error.message}`));
        }
      })
      .on('error', (error) => {
        reject(new Error(`CSV文件读取失败: ${error.message}`));
      });
  });
};

// 主解析函数
const parsePublicationFile = async (filePath, departmentId = null) => {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.xlsx':
    case '.xls':
      return await parseExcelFile(filePath, departmentId);
    case '.csv':
      return await parseCSVFile(filePath, departmentId);
    default:
      throw new Error('不支持的文件格式，请使用Excel (.xlsx, .xls) 或 CSV 文件');
  }
};

module.exports = {
  parsePublicationFile,
  PublicationParseResult,
  validatePublicationData,
  cleanPublicationData,
  matchJournalByName,
  matchDepartmentByName,
  PUBLICATION_FIELD_MAPPING
};