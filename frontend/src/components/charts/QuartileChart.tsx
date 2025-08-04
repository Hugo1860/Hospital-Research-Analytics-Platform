import React from 'react';
import ReactECharts from 'echarts-for-react';

interface QuartileData {
  name: string;
  value: number;
  color: string;
}

interface QuartileChartProps {
  data: QuartileData[];
  title?: string;
  height?: number;
}

/**
 * 期刊分区饼图组件
 */
const QuartileChart: React.FC<QuartileChartProps> = ({
  data,
  title = '期刊分区分布',
  height = 300,
}) => {
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
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}篇 ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      bottom: '10%',
      data: data.map(item => item.name),
    },
    series: [
      {
        name: '期刊分区',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        labelLine: {
          show: false,
        },
        data: data.map(item => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color,
          },
        })),
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default QuartileChart;