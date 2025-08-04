import { message } from 'antd';

/**
 * 图表导出服务
 * 提供各种格式的图表导出功能
 */

// 导出配置接口
export interface ExportConfig {
  format: 'png' | 'jpg' | 'svg' | 'pdf';
  width: number;
  height: number;
  quality: number;
  backgroundColor: string;
  pixelRatio: number;
  filename?: string;
}

export interface DataExportConfig {
  format: 'excel' | 'csv' | 'json';
  filename?: string;
  includeHeaders: boolean;
  includeMetadata: boolean;
  dateFormat: string;
  numberFormat: string;
}

// 图表导出服务类
class ChartExportService {
  /**
   * 导出图表为图片
   */
  async exportChartAsImage(
    chartInstance: any,
    config: ExportConfig
  ): Promise<void> {
    try {
      if (!chartInstance) {
        throw new Error('图表实例不存在');
      }

      const dataURL = chartInstance.getDataURL({
        type: config.format === 'jpg' ? 'jpeg' : config.format,
        pixelRatio: config.pixelRatio,
        backgroundColor: config.backgroundColor,
      });

      this.downloadFile(
        dataURL,
        config.filename || `chart_${Date.now()}.${config.format}`
      );

      message.success('图表导出成功');
    } catch (error) {
      console.error('图表导出失败:', error);
      message.error('图表导出失败');
      throw error;
    }
  }

  /**
   * 导出图表数据为Excel
   */
  async exportDataAsExcel(
    data: any[],
    config: DataExportConfig
  ): Promise<void> {
    try {
      // 这里应该集成实际的Excel导出库，如SheetJS
      // 暂时使用CSV格式模拟
      const csvContent = this.convertToCSV(data, config);
      const blob = new Blob([csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      this.downloadBlob(
        blob,
        config.filename || `chart_data_${Date.now()}.csv`
      );

      message.success('数据导出成功');
    } catch (error) {
      console.error('数据导出失败:', error);
      message.error('数据导出失败');
      throw error;
    }
  }

  /**
   * 导出图表数据为CSV
   */
  async exportDataAsCSV(
    data: any[],
    config: DataExportConfig
  ): Promise<void> {
    try {
      const csvContent = this.convertToCSV(data, config);
      const blob = new Blob([csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      this.downloadBlob(
        blob,
        config.filename || `chart_data_${Date.now()}.csv`
      );

      message.success('CSV导出成功');
    } catch (error) {
      console.error('CSV导出失败:', error);
      message.error('CSV导出失败');
      throw error;
    }
  }

  /**
   * 导出图表数据为JSON
   */
  async exportDataAsJSON(
    data: any[],
    config: DataExportConfig,
    metadata?: any
  ): Promise<void> {
    try {
      const jsonData = {
        exportTime: new Date().toISOString(),
        data: data,
        ...(config.includeMetadata && metadata && {
          metadata: {
            totalRecords: data.length,
            exportConfig: config,
            ...metadata,
          },
        }),
      };

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });

      this.downloadBlob(
        blob,
        config.filename || `chart_data_${Date.now()}.json`
      );

      message.success('JSON导出成功');
    } catch (error) {
      console.error('JSON导出失败:', error);
      message.error('JSON导出失败');
      throw error;
    }
  }

  /**
   * 批量导出图表
   */
  async batchExportCharts(
    charts: Array<{
      instance: any;
      title: string;
      data: any[];
    }>,
    imageConfig: ExportConfig,
    dataConfig: DataExportConfig
  ): Promise<void> {
    try {
      for (let i = 0; i < charts.length; i++) {
        const chart = charts[i];
        
        // 导出图片
        if (chart.instance) {
          await this.exportChartAsImage(chart.instance, {
            ...imageConfig,
            filename: `${chart.title}_image_${Date.now()}.${imageConfig.format}`,
          });
        }

        // 导出数据
        if (chart.data && chart.data.length > 0) {
          if (dataConfig.format === 'excel') {
            await this.exportDataAsExcel(chart.data, {
              ...dataConfig,
              filename: `${chart.title}_data_${Date.now()}.csv`,
            });
          } else if (dataConfig.format === 'csv') {
            await this.exportDataAsCSV(chart.data, {
              ...dataConfig,
              filename: `${chart.title}_data_${Date.now()}.csv`,
            });
          } else if (dataConfig.format === 'json') {
            await this.exportDataAsJSON(chart.data, {
              ...dataConfig,
              filename: `${chart.title}_data_${Date.now()}.json`,
            });
          }
        }

        // 添加延迟避免浏览器阻止多个下载
        if (i < charts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      message.success(`成功导出 ${charts.length} 个图表`);
    } catch (error) {
      console.error('批量导出失败:', error);
      message.error('批量导出失败');
      throw error;
    }
  }

  /**
   * 转换数据为CSV格式
   */
  private convertToCSV(data: any[], config: DataExportConfig): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    let csv = '';

    // 添加BOM以支持中文
    csv += '\uFEFF';

    // 添加标题行
    if (config.includeHeaders) {
      csv += headers.join(',') + '\n';
    }

    // 添加数据行
    data.forEach(row => {
      const values = headers.map(header => {
        let value = row[header];
        
        // 格式化数值
        if (typeof value === 'number') {
          const decimals = config.numberFormat.split('.')[1]?.length || 0;
          value = value.toFixed(decimals);
        }
        
        // 格式化日期
        if (value instanceof Date) {
          value = this.formatDate(value, config.dateFormat);
        }
        
        // 处理包含逗号或换行的字符串
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value || '';
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      case 'YYYY年MM月DD日':
        return `${year}年${month}月${day}日`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * 下载文件（通过URL）
   */
  private downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 下载文件（通过Blob）
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, filename);
    URL.revokeObjectURL(url);
  }

  /**
   * 获取支持的导出格式
   */
  getSupportedImageFormats(): Array<{ value: string; label: string }> {
    return [
      { value: 'png', label: 'PNG (推荐)' },
      { value: 'jpg', label: 'JPG' },
      { value: 'svg', label: 'SVG' },
      { value: 'pdf', label: 'PDF' },
    ];
  }

  /**
   * 获取支持的数据导出格式
   */
  getSupportedDataFormats(): Array<{ value: string; label: string }> {
    return [
      { value: 'excel', label: 'Excel (.xlsx)' },
      { value: 'csv', label: 'CSV (.csv)' },
      { value: 'json', label: 'JSON (.json)' },
    ];
  }

  /**
   * 验证导出配置
   */
  validateExportConfig(config: ExportConfig): boolean {
    if (!config.format || !['png', 'jpg', 'svg', 'pdf'].includes(config.format)) {
      message.error('不支持的图片格式');
      return false;
    }

    if (config.width < 100 || config.width > 4000) {
      message.error('图片宽度必须在100-4000像素之间');
      return false;
    }

    if (config.height < 100 || config.height > 4000) {
      message.error('图片高度必须在100-4000像素之间');
      return false;
    }

    if (config.quality < 0.1 || config.quality > 1) {
      message.error('图片质量必须在0.1-1之间');
      return false;
    }

    return true;
  }

  /**
   * 验证数据导出配置
   */
  validateDataExportConfig(config: DataExportConfig): boolean {
    if (!config.format || !['excel', 'csv', 'json'].includes(config.format)) {
      message.error('不支持的数据格式');
      return false;
    }

    return true;
  }
}

// 导出单例实例
export const chartExportService = new ChartExportService();
export default chartExportService;