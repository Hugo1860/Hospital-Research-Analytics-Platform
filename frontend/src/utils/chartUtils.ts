import { message } from 'antd';

/**
 * 图表工具类
 * 提供图表相关的通用功能
 */

// 颜色方案
export const COLOR_SCHEMES = {
  default: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa541c'],
  blue: ['#e6f7ff', '#bae7ff', '#91d5ff', '#69c0ff', '#40a9ff', '#1890ff', '#096dd9', '#0050b3'],
  green: ['#f6ffed', '#d9f7be', '#b7eb8f', '#95de64', '#73d13d', '#52c41a', '#389e0d', '#237804'],
  red: ['#fff2e8', '#ffd8bf', '#ffbb96', '#ff9c6e', '#ff7a45', '#fa541c', '#d4380d', '#ad2102'],
  purple: ['#f9f0ff', '#efdbff', '#d3adf7', '#b37feb', '#9254de', '#722ed1', '#531dab', '#391085'],
};

// 获取颜色方案
export const getColorScheme = (scheme: keyof typeof COLOR_SCHEMES = 'default'): string[] => {
  return COLOR_SCHEMES[scheme] || COLOR_SCHEMES.default;
};

// 生成渐变色
export const generateGradientColor = (color: string, direction: 'vertical' | 'horizontal' = 'vertical') => {
  return {
    type: 'linear',
    x: 0,
    y: direction === 'vertical' ? 0 : 1,
    x2: direction === 'vertical' ? 0 : 1,
    y2: direction === 'vertical' ? 1 : 0,
    colorStops: [
      {
        offset: 0,
        color: color,
      },
      {
        offset: 1,
        color: adjustColorBrightness(color, 0.3),
      },
    ],
  };
};

// 调整颜色亮度
export const adjustColorBrightness = (color: string, amount: number): string => {
  // 简单的颜色亮度调整，实际项目中可以使用更复杂的颜色处理库
  const usePound = color[0] === '#';
  const col = usePound ? color.slice(1) : color;
  
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount * 255;
  let g = (num >> 8 & 0x00FF) + amount * 255;
  let b = (num & 0x0000FF) + amount * 255;
  
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  
  return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
};

// 格式化数值
export const formatValue = (value: number, type: 'number' | 'percentage' | 'currency' = 'number'): string => {
  switch (type) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'currency':
      return `¥${value.toLocaleString()}`;
    default:
      return value.toLocaleString();
  }
};

// 导出图表为图片
export const exportChartAsImage = (chartInstance: any, filename?: string) => {
  if (!chartInstance) {
    message.error('图表实例不存在');
    return;
  }

  try {
    const url = chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });

    const link = document.createElement('a');
    link.download = filename || `chart_${new Date().getTime()}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success('图表导出成功');
  } catch (error) {
    message.error('图表导出失败');
    console.error('Export error:', error);
  }
};

// 通用图表配置
export const getCommonChartOptions = () => {
  return {
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    textStyle: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'transparent',
      textStyle: {
        color: '#fff',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
  };
};

// 响应式图表配置
export const getResponsiveChartOptions = (containerWidth: number) => {
  const isMobile = containerWidth < 768;
  const isTablet = containerWidth >= 768 && containerWidth < 1024;

  return {
    ...getCommonChartOptions(),
    grid: {
      left: isMobile ? '5%' : '3%',
      right: isMobile ? '5%' : '4%',
      bottom: isMobile ? '15%' : '3%',
      top: isMobile ? '15%' : '10%',
      containLabel: true,
    },
    legend: {
      orient: isMobile ? 'horizontal' : 'horizontal',
      bottom: isMobile ? '5%' : '10%',
      type: isMobile ? 'scroll' : 'plain',
    },
    xAxis: {
      axisLabel: {
        interval: isMobile ? 'auto' : 0,
        rotate: isMobile ? 45 : 0,
      },
    },
  };
};

// 数据处理工具
export const processChartData = {
  // 排序数据
  sortData: (data: any[], key: string, order: 'asc' | 'desc' = 'desc') => {
    return [...data].sort((a, b) => {
      const aVal = typeof a[key] === 'string' ? a[key].toLowerCase() : a[key];
      const bVal = typeof b[key] === 'string' ? b[key].toLowerCase() : b[key];
      
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  },

  // 过滤数据
  filterData: (data: any[], filters: Record<string, any>) => {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          return true;
        }
        return item[key] === value;
      });
    });
  },

  // 聚合数据
  aggregateData: (data: any[], groupBy: string, aggregateField: string, aggregateType: 'sum' | 'avg' | 'count' = 'sum') => {
    const grouped = data.reduce((acc, item) => {
      const key = item[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).map(([key, items]) => {
      const itemsArray = items as any[];
      let value: number;
      switch (aggregateType) {
        case 'sum':
          value = itemsArray.reduce((sum: number, item: any) => sum + (item[aggregateField] || 0), 0);
          break;
        case 'avg':
          value = itemsArray.reduce((sum: number, item: any) => sum + (item[aggregateField] || 0), 0) / itemsArray.length;
          break;
        case 'count':
          value = itemsArray.length;
          break;
        default:
          value = 0;
      }
      return { name: key, value, items: itemsArray };
    });
  },
};

// 图表主题
export const CHART_THEMES = {
  light: {
    backgroundColor: '#ffffff',
    textColor: '#333333',
    axisLineColor: '#d9d9d9',
    splitLineColor: '#f0f0f0',
  },
  dark: {
    backgroundColor: '#1f1f1f',
    textColor: '#ffffff',
    axisLineColor: '#484848',
    splitLineColor: '#2f2f2f',
  },
};

export default {
  getColorScheme,
  generateGradientColor,
  adjustColorBrightness,
  formatValue,
  exportChartAsImage,
  getCommonChartOptions,
  getResponsiveChartOptions,
  processChartData,
  COLOR_SCHEMES,
  CHART_THEMES,
};