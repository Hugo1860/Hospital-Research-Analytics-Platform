import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Select, Space, Typography, Button, Switch, DatePicker } from 'antd';
import { DownloadOutlined, FullscreenOutlined, ZoomInOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title } = Typography;
const { RangePicker } = DatePicker;

interface LineData {
  name: string;
  data: Array<{
    date: string;
    value: number;
    category?: string;
  }>;
  color?: string;
}

interface InteractiveLineChartProps {
  data: LineData[];
  title?: string;
  height?: number;
  showToolbar?: boolean;
  onPointClick?: (data: any) => void;
  onZoomChange?: (startDate: string, endDate: string) => void;
  loading?: boolean;
  xAxisType?: 'time' | 'category';
  yAxisName?: string;
}

/**
 * 交互式折线图组件
 * 支持多条线、时间轴缩放、数据点击等功能
 */
const InteractiveLineChart: React.FC<InteractiveLineChartProps> = ({
  data,
  title = '趋势图表',
  height = 400,
  showToolbar = true,
  onPointClick,
  onZoomChange,
  loading = false,
  xAxisType = 'time',
  yAxisName = '数量',
}) => {
  const [showArea, setShowArea] = useState(false);
  const [showSymbols, setShowSymbols] = useState(true);
  const [smoothLines, setSmoothLines] = useState(true);
  const [selectedLines, setSelectedLines] = useState<string[]>(data.map(item => item.name));
  const [dateRange, setDateRange] = useState<any>(null);

  // 处理数据点击事件
  const handleChartClick = (params: any) => {
    if (onPointClick) {
      onPointClick({
        seriesName: params.seriesName,
        date: params.name,
        value: params.value,
        dataIndex: params.dataIndex,
      });
    }
  };

  // 处理缩放事件
  const handleDataZoom = (params: any) => {
    if (onZoomChange && params.batch && params.batch[0]) {
      const { startValue, endValue } = params.batch[0];
      onZoomChange(startValue, endValue);
    }
  };

  // 导出图表
  const handleExport = () => {
    console.log('导出折线图');
  };

  // 全屏显示
  const handleFullscreen = () => {
    console.log('全屏显示折线图');
  };

  // 处理线条选择
  const handleLineSelection = (selectedValues: string[]) => {
    setSelectedLines(selectedValues);
  };

  // 获取所有日期
  const allDates = Array.from(
    new Set(
      data.flatMap(series => series.data.map(point => point.date))
    )
  ).sort();

  // 过滤显示的数据
  const filteredData = data.filter(series => selectedLines.includes(series.name));

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
        label: {
          backgroundColor: '#6a7985',
        },
      },
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`;
        params.forEach((param: any) => {
          result += `${param.marker}${param.seriesName}: ${param.value}<br/>`;
        });
        result += '点击查看详情';
        return result;
      },
    },
    legend: {
      data: filteredData.map(item => item.name),
      top: '8%',
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '20%',
      containLabel: true,
    },
    toolbox: {
      show: true,
      right: '5%',
      top: '8%',
      feature: {
        dataZoom: {
          yAxisIndex: 'none',
          title: {
            zoom: '区域缩放',
            back: '缩放还原',
          },
        },
        restore: {
          title: '还原',
        },
        saveAsImage: {
          title: '保存为图片',
        },
      },
    },
    xAxis: {
      type: xAxisType,
      boundaryGap: false,
      data: xAxisType === 'category' ? allDates : undefined,
      axisLabel: {
        color: '#666',
        formatter: xAxisType === 'time' ? 
          (value: string) => dayjs(value).format('MM-DD') : 
          undefined,
      },
      axisLine: {
        lineStyle: {
          color: '#d9d9d9',
        },
      },
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
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
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        start: 0,
        end: 100,
        height: 30,
        bottom: '5%',
      },
    ],
    series: filteredData.map((series, index) => ({
      name: series.name,
      type: 'line',
      smooth: smoothLines,
      symbol: showSymbols ? 'circle' : 'none',
      symbolSize: 6,
      data: xAxisType === 'time' ? 
        series.data.map(point => [point.date, point.value]) :
        allDates.map(date => {
          const point = series.data.find(p => p.date === date);
          return point ? point.value : null;
        }),
      lineStyle: {
        width: 2,
        color: series.color || `hsl(${(index * 360) / filteredData.length}, 70%, 60%)`,
      },
      itemStyle: {
        color: series.color || `hsl(${(index * 360) / filteredData.length}, 70%, 60%)`,
      },
      areaStyle: showArea ? {
        opacity: 0.3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: series.color || `hsl(${(index * 360) / filteredData.length}, 70%, 60%)`,
            },
            {
              offset: 1,
              color: series.color || `hsl(${(index * 360) / filteredData.length}, 70%, 80%)`,
            },
          ],
        },
      } : undefined,
      emphasis: {
        focus: 'series',
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    })),
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
            <Space wrap>
              <Select
                mode="multiple"
                value={selectedLines}
                onChange={handleLineSelection}
                placeholder="选择数据线"
                style={{ minWidth: 150 }}
              >
                {data.map(series => (
                  <Option key={series.name} value={series.name}>
                    {series.name}
                  </Option>
                ))}
              </Select>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                size="small"
                style={{ width: 200 }}
              />
              <Space>
                <span style={{ fontSize: 12 }}>面积</span>
                <Switch
                  size="small"
                  checked={showArea}
                  onChange={setShowArea}
                />
              </Space>
              <Space>
                <span style={{ fontSize: 12 }}>数据点</span>
                <Switch
                  size="small"
                  checked={showSymbols}
                  onChange={setShowSymbols}
                />
              </Space>
              <Space>
                <span style={{ fontSize: 12 }}>平滑</span>
                <Switch
                  size="small"
                  checked={smoothLines}
                  onChange={setSmoothLines}
                />
              </Space>
              <Button
                icon={<ZoomInOutlined />}
                size="small"
                title="缩放工具"
              />
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
          datazoom: handleDataZoom,
        }}
      />
    </Card>
  );
};

export default InteractiveLineChart;