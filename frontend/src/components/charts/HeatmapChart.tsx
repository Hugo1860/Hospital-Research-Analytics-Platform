import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Select, Space, Typography, Button, Slider } from 'antd';
import { DownloadOutlined, FullscreenOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title } = Typography;

interface HeatmapData {
  x: string;
  y: string;
  value: number;
  details?: any;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  xCategories: string[];
  yCategories: string[];
  title?: string;
  height?: number;
  showToolbar?: boolean;
  onCellClick?: (data: HeatmapData) => void;
  loading?: boolean;
  colorScheme?: 'blue' | 'green' | 'red' | 'purple';
  valueName?: string;
}

/**
 * 热力图组件
 * 支持数据密度可视化、颜色方案切换
 */
const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  xCategories,
  yCategories,
  title = '热力图',
  height = 400,
  showToolbar = true,
  onCellClick,
  loading = false,
  colorScheme = 'blue',
  valueName = '数值',
}) => {
  const [selectedColorScheme, setSelectedColorScheme] = useState(colorScheme);
  const [opacity, setOpacity] = useState(0.8);

  // 处理单元格点击事件
  const handleChartClick = (params: any) => {
    if (onCellClick) {
      const clickedData = data.find(
        item => item.x === xCategories[params.value[0]] && 
                item.y === yCategories[params.value[1]]
      );
      if (clickedData) {
        onCellClick(clickedData);
      }
    }
  };

  // 导出图表
  const handleExport = () => {
    console.log('导出热力图');
  };

  // 全屏显示
  const handleFullscreen = () => {
    console.log('全屏显示热力图');
  };

  // 获取颜色方案
  const getColorScheme = (scheme: string) => {
    const schemes = {
      blue: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
      green: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
      red: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
      purple: ['#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#54278f', '#3f007d'],
    };
    return schemes[scheme as keyof typeof schemes] || schemes.blue;
  };

  // 计算最大值和最小值
  const values = data.map(item => item.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  // 转换数据格式
  const chartData = data.map(item => [
    xCategories.indexOf(item.x),
    yCategories.indexOf(item.y),
    item.value,
  ]);

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
      position: 'top',
      formatter: (params: any) => {
        const xLabel = xCategories[params.value[0]];
        const yLabel = yCategories[params.value[1]];
        const value = params.value[2];
        return `${xLabel} - ${yLabel}<br/>${valueName}: ${value}<br/>点击查看详情`;
      },
    },
    grid: {
      height: '60%',
      top: '15%',
      left: '15%',
      right: '10%',
    },
    xAxis: {
      type: 'category',
      data: xCategories,
      splitArea: {
        show: true,
      },
      axisLabel: {
        color: '#666',
        interval: 0,
        rotate: xCategories.length > 10 ? 45 : 0,
      },
    },
    yAxis: {
      type: 'category',
      data: yCategories,
      splitArea: {
        show: true,
      },
      axisLabel: {
        color: '#666',
      },
    },
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: getColorScheme(selectedColorScheme),
      },
      text: ['高', '低'],
      textStyle: {
        color: '#666',
      },
    },
    series: [
      {
        name: valueName,
        type: 'heatmap',
        data: chartData,
        label: {
          show: true,
          formatter: (params: any) => params.value[2],
          fontSize: 10,
          color: '#333',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            borderColor: '#333',
            borderWidth: 2,
          },
        },
        itemStyle: {
          opacity: opacity,
        },
      },
    ],
    animation: true,
    animationDuration: 1000,
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {showToolbar && (
            <Space wrap>
              <Select
                value={selectedColorScheme}
                onChange={setSelectedColorScheme}
                style={{ width: 100 }}
              >
                <Option value="blue">蓝色</Option>
                <Option value="green">绿色</Option>
                <Option value="red">红色</Option>
                <Option value="purple">紫色</Option>
              </Select>
              <Space>
                <span style={{ fontSize: 12 }}>透明度</span>
                <Slider
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={opacity}
                  onChange={setOpacity}
                  style={{ width: 80 }}
                />
              </Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                size="small"
                title="导出图表"
              />
              <Button
                icon={<FullscreenOutlined />}
                onClick={handleFullscreen}
                size="small"
                title="全屏显示"
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

export default HeatmapChart;