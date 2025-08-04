import { message } from 'antd';

// 文件类型映射
export const FILE_TYPES = {
  EXCEL: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  CSV: ['text/csv'],
  PDF: ['application/pdf'],
  IMAGE: ['image/jpeg', 'image/png', 'image/gif'],
} as const;

// 文件大小限制 (MB)
export const FILE_SIZE_LIMITS = {
  SMALL: 2,
  MEDIUM: 10,
  LARGE: 50,
} as const;

/**
 * 验证文件类型
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * 验证文件大小
 */
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const fileSizeMB = file.size / 1024 / 1024;
  return fileSizeMB <= maxSizeMB;
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 获取文件扩展名
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

/**
 * 验证Excel/CSV文件
 */
export const validateImportFile = (file: File): { valid: boolean; error?: string } => {
  // 检查文件类型
  const allowedTypes = [...FILE_TYPES.EXCEL, ...FILE_TYPES.CSV];
  if (!validateFileType(file, allowedTypes)) {
    return {
      valid: false,
      error: '只支持 Excel (.xlsx, .xls) 和 CSV (.csv) 文件',
    };
  }

  // 检查文件大小
  if (!validateFileSize(file, FILE_SIZE_LIMITS.MEDIUM)) {
    return {
      valid: false,
      error: `文件大小不能超过 ${FILE_SIZE_LIMITS.MEDIUM}MB`,
    };
  }

  return { valid: true };
};

/**
 * 读取文件内容为文本
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsText(file);
  });
};

/**
 * 读取文件内容为ArrayBuffer
 */
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as ArrayBuffer);
    };
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 下载文件
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * 创建并下载CSV文件
 */
export const downloadCSV = (data: any[], filename: string): void => {
  if (data.length === 0) {
    message.warning('没有数据可导出');
    return;
  }

  // 获取表头
  const headers = Object.keys(data[0]);
  
  // 创建CSV内容
  const csvContent = [
    headers.join(','), // 表头
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // 处理包含逗号或引号的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // 添加BOM以支持中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  
  downloadFile(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
};

/**
 * 创建并下载Excel模板
 */
export const downloadExcelTemplate = (headers: string[], filename: string): void => {
  // 这里应该使用实际的Excel库来创建文件
  // 暂时使用CSV格式作为模板
  const csvContent = headers.join(',');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  
  downloadFile(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  message.info('已下载CSV格式模板，您也可以将其另存为Excel格式');
};