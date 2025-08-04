import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Select, Space, Typography, Button } from 'antd';
import { DownloadOutlined, FullscreenOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title } = Typography;

interface ChartData {
  name: string;
  value: number;
  category?: string;
  details?: any;
}

interface InteractiveBarChartProps {
  data: ChartData[];
  title?: string;
  height?: number;
  showToolbar?: boolean;
  onBarClick?: (data: ChartData) => void;
  onDataDrill?: (category: string) => void;
  categories?: string[];
  selectedCategory?: string;
  loading?: boolean;
}

/**
 * 交互式柱状图组件
 * 支持数据钻取、点击事件、工具栏等高级功能
 */
const InteractiveBarChart: React.FC<InteractiveBarChartProps> = ({
  data,
  title = '统计图表',
  height = 400,
  showToolbar = true,
  onBarClick,
  onDataDrill,
  categories = [],
  selectedCategory,
  loading = false,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

  // 处理数据排序
  const getSortedData = () => {
    if (sortOrder === 'none') return data;
    
    return [...data].sort((a, b) => {
      if (sortOrder === 'asc') return a.value - b.value;
      return b.value - a.value;
    });
  };

  // 处理柱状图点击事件
  const handleChartClick = (params: any) => {
    const clickedData = data.find(item => item.name === params.name);
    if (clickedData && onBarClick) {
      onBarClick(clickedData);
    }
  };

  // 导出图表
  const handleExport = () => {
    // 实现图表导出功能
    console.log('导出图表');
  };

  // 全屏显示
  const handleFullscreen = () => {
    // 实现全屏功能
    console.log('全屏显示');
  };

  const sortedData = getSortedData();

  const option = {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>${data.seriesName}: ${data.value}<br/>点击查看详情`;
      },
    },
    legend: {
      show: false,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: sortedData.map(item => item.name),
      axisLabel: {
        interval: 0,
        rotate: sortedData.length > 8 ? 45 : 0,
        color: '#666',
      },
      axisLine: {
        lineStyle: {
          color: '#d9d9d9',
        },
      },
    },
    yAxis: {
      type: 'value',
      name: '数量',
      nameTextStyle: {
        color: '#666',
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#666',
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
        },
      },
    },
    series: [
      {
        name: '数量',
        type: chartType,
        data: sortedData.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: chartType === 'bar' ? {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: `hsl(${200 + index * 20}, 70%, 60%)`,
                },
                {
                  offset: 1,
                  color: `hsl(${200 + index * 20}, 70%, 80%)`,
                },
              ],
            } : `hsl(${200 + index * 20}, 70%, 60%)`,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        })),
        barWidth: '60%',
        smooth: chartType === 'line',
        symbol: chartType === 'line' ? 'circle' : 'none',
        symbolSize: 6,
        lineStyle: chartType === 'line' ? {
          width: 3,
        } : undefined,
      },
    ],
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {showToolbar && (
            <Space>
              {categories.length > 0 && (
                <Select
                  value={selectedCategory}
                  onChange={onDataDrill}
                  placeholder="选择分类"
                  style={{ width: 120 }}
                >
                  <Option value="">全部</Option>
                  {categories.map(category => (
                    <Option key={category} value={category}>
                      {category}
                    </Option>
                  ))}
                </Select>
              )}
              <Select
                value={chartType}
                onChange={setChartType}
                style={{ width: 100 }}
              >
                <Option value="bar">柱状图</Option>
                <Option value="line">折线图</Option>
              </Select>
              <Select
                value={sortOrder}
                onChange={setSortOrder}
                style={{ width: 100 }}
              >
                <Option value="none">默认</Option>
                <Option value="asc">升序</Option>
                <Option value="desc">降序</Option>
              </Select>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                size="small"
              />
              <Button
                icon={<FullscreenOutlined />}
                onClick={handleFullscreen}
                size="small"
              />
            </Space>
          )}
        </div>
      }
      loading={loading}
    >
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
        onEvents={{
          click: handleChartClick,
        }}
      />
    </Card>
  );
};

export default InteractiveBarChart;