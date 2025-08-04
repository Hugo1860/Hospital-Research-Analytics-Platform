import React from 'react';
import ReactECharts from 'echarts-for-react';

interface DepartmentData {
  departmentName: string;
  publicationCount: number;
  averageIF: number;
}

interface DepartmentBarChartProps {
  data: DepartmentData[];
  title?: string;
  height?: number;
}

/**
 * 科室发表数量柱状图组件
 */
const DepartmentBarChart: React.FC<DepartmentBarChartProps> = ({
  data,
  title = '科室发表统计',
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
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        const dept = data.name;
        const count = data.value;
        const avgIF = data.data?.averageIF || 0;
        return `${dept}<br/>发表数量: ${count}篇<br/>平均影响因子: ${avgIF.toFixed(2)}`;
      },
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.departmentName),
      axisLabel: {
        interval: 0,
        rotate: 45,
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
      name: '发表数量(篇)',
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
        name: '发表数量',
        type: 'bar',
        data: data.map(item => ({
          value: item.publicationCount,
          averageIF: item.averageIF,
        })),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: '#1890ff',
              },
              {
                offset: 1,
                color: '#69c0ff',
              },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: '#096dd9',
                },
                {
                  offset: 1,
                  color: '#40a9ff',
                },
              ],
            },
          },
        },
        barWidth: '60%',
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true,
    },
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default DepartmentBarChart;