import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Select, Space, Typography, Button, Switch, Tooltip } from 'antd';
import { DownloadOutlined, FullscreenOutlined, SettingOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title } = Typography;

interface MixedChartData {
  name: string;
  type: 'bar' | 'line';
  data: number[];
  yAxisIndex?: number;
  color?: string;
  unit?: string;
}

interface MixedChartProps {
  data: MixedChartData[];
  categories: string[];
  title?: string;
  height?: number;
  showToolbar?: boolean;
  onDataClick?: (data: any) => void;
  loading?: boolean;
  leftYAxisName?: string;
  rightYAxisName?: string;
}

/**
 * 混合图表组件
 * 支持柱状图和折线图的组合显示，双Y轴
 */
const MixedChart: React.FC<MixedChartProps> = ({
  data,
  categories,
  title = '混合图表',
  height = 400,
  showToolbar = true,
  onDataClick,
  loading = false,
  leftYAxisName = '数量',
  rightYAxisName = '比率',
}) => {
  const [showDataLabels, setShowDataLabels] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [animationEnabled, setAnimationEnabled] = useState(true);

  // 处理图表点击事件
  const handleChartClick = (params: any) => {
    if (onDataClick) {
      onDataClick({
        seriesName: params.seriesName,
        category: params.name,
        value: params.value,
        dataIndex: params.dataIndex,
        seriesType: params.seriesType,
      });
    }
  };

  // 导出图表
  const handleExport = () => {
    console.log('导出混合图表');
  };

  // 全屏显示
  const handleFullscreen = () => {
    console.log('全屏显示混合图表');
  };

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
        type: 'cross',
        crossStyle: {
          color: '#999',
        },
      },
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`;
        params.forEach((param: any) => {
          const series = data.find(s => s.name === param.seriesName);
          const unit = series?.unit || '';
          result += `${param.marker}${param.seriesName}: ${param.value}${unit}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: data.map(item => item.name),
      top: '8%',
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '20%',
      containLabel: true,
      show: showGrid,
      borderColor: '#f0f0f0',
    },
    xAxis: [
      {
        type: 'category',
        data: categories,
        axisPointer: {
          type: 'shadow',
        },
        axisLabel: {
          color: '#666',
          interval: 0,
          rotate: categories.length > 8 ? 45 : 0,
        },
        axisLine: {
          lineStyle: {
            color: '#d9d9d9',
          },
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: leftYAxisName,
        position: 'left',
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
      {
        type: 'value',
        name: rightYAxisName,
        position: 'right',
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
          show: false,
        },
      },
    ],
    series: data.map((series, index) => ({
      name: series.name,
      type: series.type,
      yAxisIndex: series.yAxisIndex || 0,
      data: series.data,
      itemStyle: {
        color: series.color || `hsl(${(index * 360) / data.length}, 70%, 60%)`,
      },
      lineStyle: series.type === 'line' ? {
        width: 3,
        color: series.color || `hsl(${(index * 360) / data.length}, 70%, 60%)`,
      } : undefined,
      symbol: series.type === 'line' ? 'circle' : undefined,
      symbolSize: series.type === 'line' ? 6 : undefined,
      smooth: series.type === 'line',
      barWidth: series.type === 'bar' ? '40%' : undefined,
      label: {
        show: showDataLabels,
        position: series.type === 'bar' ? 'top' : 'top',
        formatter: (params: any) => {
          const unit = series.unit || '';
          return `${params.value}${unit}`;
        },
        fontSize: 10,
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
      animation: animationEnabled,
      animationDelay: (idx: number) => idx * 100,
    })),
    animation: animationEnabled,
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
            <Space wrap>
              <Tooltip title="显示数据标签">
                <Space>
                  <span style={{ fontSize: 12 }}>标签</span>
                  <Switch
                    size="small"
                    checked={showDataLabels}
                    onChange={setShowDataLabels}
                  />
                </Space>
              </Tooltip>
              <Tooltip title="显示网格线">
                <Space>
                  <span style={{ fontSize: 12 }}>网格</span>
                  <Switch
                    size="small"
                    checked={showGrid}
                    onChange={setShowGrid}
                  />
                </Space>
              </Tooltip>
              <Tooltip title="启用动画">
                <Space>
                  <span style={{ fontSize: 12 }}>动画</span>
                  <Switch
                    size="small"
                    checked={animationEnabled}
                    onChange={setAnimationEnabled}
                  />
                </Space>
              </Tooltip>
              <Button
                icon={<SettingOutlined />}
                size="small"
                title="图表设置"
              />
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

export default MixedChart;