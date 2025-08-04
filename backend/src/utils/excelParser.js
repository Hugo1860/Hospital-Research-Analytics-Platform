const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Excel/CSV解析结果接口
class ParseResult {
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

// 期刊数据字段映射
const JOURNAL_FIELD_MAPPING = {
  // 中文字段名到英文字段名的映射
  '期刊名称': 'name',
  '期刊名': 'name',
  'Journal Name': 'name',
  'Name': 'name',
  
  'ISSN': 'issn',
  'issn': 'issn',
  
  '影响因子': 'impactFactor',
  '影响因數': 'impactFactor',
  'Impact Factor': 'impactFactor',
  'IF': 'impactFactor',
  
  '分区': 'quartile',
  '分區': 'quartile',
  'Quartile': 'quartile',
  'JCR分区': 'quartile',
  'JCR': 'quartile',
  
  '类别': 'category',
  '類別': 'category',
  'Category': 'category',
  '学科': 'category',
  '學科': 'category',
  'Subject': 'category',
  
  '出版商': 'publisher',
  'Publisher': 'publisher',
  
  '年份': 'year',
  'Year': 'year',
  '数据年份': 'year',
  '數據年份': 'year'
};

// 标准化字段名
const normalizeFieldName = (fieldName) => {
  if (!fieldName) return null;
  
  const trimmed = fieldName.toString().trim();
  return JOURNAL_FIELD_MAPPING[trimmed] || trimmed.toLowerCase();
};

// 验证期刊数据
const validateJournalData = (data, row) => {
  const errors = [];
  
  // 必填字段检查
  if (!data.name || data.name.toString().trim() === '') {
    errors.push('期刊名称不能为空');
  }
  
  if (!data.impactFactor && data.impactFactor !== 0) {
    errors.push('影响因子不能为空');
  } else {
    const if_ = parseFloat(data.impactFactor);
    if (isNaN(if_) || if_ < 0 || if_ > 50) {
      errors.push('影响因子必须是0-50之间的数字');
    }
  }
  
  if (!data.quartile) {
    errors.push('分区不能为空');
  } else if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(data.quartile.toString().toUpperCase())) {
    errors.push('分区必须是Q1、Q2、Q3或Q4');
  }
  
  if (!data.category || data.category.toString().trim() === '') {
    errors.push('期刊类别不能为空');
  }
  
  if (!data.year) {
    errors.push('年份不能为空');
  } else {
    const year = parseInt(data.year);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1900 || year > currentYear + 1) {
      errors.push(`年份必须是1900-${currentYear + 1}之间的整数`);
    }
  }
  
  // ISSN格式检查（如果提供）
  if (data.issn && data.issn.toString().trim() !== '') {
    const issnPattern = /^\d{4}-\d{3}[\dX]$/i;
    if (!issnPattern.test(data.issn.toString().trim())) {
      errors.push('ISSN格式不正确，应为XXXX-XXXX格式');
    }
  }
  
  return errors;
};

// 清理和标准化数据
const cleanJournalData = (rawData) => {
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
  if (cleaned.impactFactor) {
    cleaned.impactFactor = parseFloat(cleaned.impactFactor);
  }
  
  if (cleaned.quartile) {
    cleaned.quartile = cleaned.quartile.toString().toUpperCase();
  }
  
  if (cleaned.year) {
    cleaned.year = parseInt(cleaned.year);
  }
  
  // 清理ISSN格式
  if (cleaned.issn) {
    cleaned.issn = cleaned.issn.replace(/[^\d\-X]/gi, '');
  }
  
  return cleaned;
};

// 解析Excel文件
const parseExcelFile = async (filePath) => {
  const result = new ParseResult();
  
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
    worksheet.eachRow((row, rowIndex) => {
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
        const cleanedData = cleanJournalData(rowData);
        
        // 验证数据
        const validationErrors = validateJournalData(cleanedData, rowNumber);
        if (validationErrors.length > 0) {
          result.addError(rowNumber, validationErrors.join('; '), cleanedData);
          return;
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
const parseCSVFile = async (filePath) => {
  const result = new ParseResult();
  
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
      .on('end', () => {
        try {
          if (headers.length === 0) {
            throw new Error('CSV文件中没有找到表头');
          }
          
          rows.forEach(({ rowNumber, data }) => {
            try {
              // 清理和标准化数据
              const cleanedData = cleanJournalData(data);
              
              // 验证数据
              const validationErrors = validateJournalData(cleanedData, rowNumber);
              if (validationErrors.length > 0) {
                result.addError(rowNumber, validationErrors.join('; '), cleanedData);
                return;
              }
              
              result.addSuccess(cleanedData);
            } catch (error) {
              result.addError(rowNumber, error.message, data);
            }
          });
          
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
const parseJournalFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.xlsx':
    case '.xls':
      return await parseExcelFile(filePath);
    case '.csv':
      return await parseCSVFile(filePath);
    default:
      throw new Error('不支持的文件格式，请使用Excel (.xlsx, .xls) 或 CSV 文件');
  }
};

module.exports = {
  parseJournalFile,
  ParseResult,
  validateJournalData,
  cleanJournalData,
  JOURNAL_FIELD_MAPPING
};