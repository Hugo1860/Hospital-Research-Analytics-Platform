import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Select, Space, Typography, Button, Switch } from 'antd';
import { DownloadOutlined, FullscreenOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title } = Typography;

interface PieData {
  name: string;
  value: number;
  color?: string;
  category?: string;
  details?: any;
}

interface InteractivePieChartProps {
  data: PieData[];
  title?: string;
  height?: number;
  showToolbar?: boolean;
  onSliceClick?: (data: PieData) => void;
  onDataDrill?: (category: string) => void;
  categories?: string[];
  selectedCategory?: string;
  loading?: boolean;
}

/**
 * 交互式饼图组件
 * 支持数据钻取、点击事件、多种显示模式
 */
const InteractivePieChart: React.FC<InteractivePieChartProps> = ({
  data,
  title = '分布图表',
  height = 400,
  showToolbar = true,
  onSliceClick,
  onDataDrill,
  categories = [],
  selectedCategory,
  loading = false,
}) => {
  const [chartType, setChartType] = useState<'pie' | 'doughnut' | 'rose'>('pie');
  const [showLabels, setShowLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // 处理饼图点击事件
  const handleChartClick = (params: any) => {
    const clickedData = data.find(item => item.name === params.name);
    if (clickedData && onSliceClick) {
      onSliceClick(clickedData);
    }
  };

  // 导出图表
  const handleExport = () => {
    console.log('导出饼图');
  };

  // 全屏显示
  const handleFullscreen = () => {
    console.log('全屏显示饼图');
  };

  // 计算总数
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const option = {
    title: {
      text: title,
      left: 'center',
      top: '5%',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const percent = ((params.value / total) * 100).toFixed(1);
        return `${params.name}<br/>${params.seriesName}: ${params.value} (${percent}%)<br/>点击查看详情`;
      },
    },
    legend: {
      show: showLegend,
      orient: 'horizontal',
      bottom: '5%',
      data: data.map(item => item.name),
      type: 'scroll',
    },
    series: [
      {
        name: '数量',
        type: 'pie',
        radius: chartType === 'doughnut' ? ['40%', '70%'] : 
                chartType === 'rose' ? ['20%', '80%'] : '70%',
        center: ['50%', '50%'],
        roseType: chartType === 'rose' ? 'area' : false,
        data: data.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color || `hsl(${(index * 360) / data.length}, 70%, 60%)`,
            borderColor: '#fff',
            borderWidth: 2,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
        })),
        label: {
          show: showLabels,
          position: chartType === 'doughnut' ? 'outside' : 'inside',
          formatter: (params: any) => {
            const percent = ((params.value / total) * 100).toFixed(1);
            return chartType === 'doughnut' ? 
              `${params.name}\n${percent}%` : 
              `${percent}%`;
          },
          fontSize: 12,
        },
        labelLine: {
          show: showLabels && chartType === 'doughnut',
          length: 15,
          length2: 10,
        },
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: (idx: number) => Math.random() * 200,
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
                <Option value="pie">饼图</Option>
                <Option value="doughnut">环形图</Option>
                <Option value="rose">玫瑰图</Option>
              </Select>
              <Space>
                <span style={{ fontSize: 12 }}>标签</span>
                <Switch
                  size="small"
                  checked={showLabels}
                  onChange={setShowLabels}
                />
              </Space>
              <Space>
                <span style={{ fontSize: 12 }}>图例</span>
                <Switch
                  size="small"
                  checked={showLegend}
                  onChange={setShowLegend}
                />
              </Space>
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

export default InteractivePieChart;