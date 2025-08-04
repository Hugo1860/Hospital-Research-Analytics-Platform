import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Select,
  Button,
  Space,
  Alert,
  Spin,
  Typography,
  Progress,
  Tag,
  Table,
} from 'antd';
import {
  FileTextOutlined,
  BookOutlined,
  TeamOutlined,
  BarChartOutlined,
  ReloadOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  fetchDashboardStats,
  fetchOverviewStatistics,
  fetchYearlyTrends,
  fetchDepartmentComparison,
} from '../store/slices/statisticsSlice';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import TrendChart from '../components/charts/TrendChart';
import QuartileChart from '../components/charts/QuartileChart';
import DepartmentBarChart from '../components/charts/DepartmentBarChart';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

interface DashboardStats {
  totalPublications: number;
  totalJournals: number;
  totalDepartments: number;
  averageImpactFactor: number;
  thisYearPublications: number;
  lastYearPublications: number;
  q1Publications: number;
  q2Publications: number;
  q3Publications: number;
  q4Publications: number;
  topDepartments: Array<{
    departmentName: string;
    publicationCount: number;
    averageIF: number;
  }>;
  recentTrends: Array<{
    month: string;
    count: number;
  }>;
}

interface DepartmentRanking {
  rank: number;
  departmentName: string;
  publicationCount: number;
  averageIF: number;
  q1Count: number;
  growth: number;
}

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { dashboardStats, overviewStats, loading, error } = useSelector(
    (state: RootState) => state.statistics
  );

  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [refreshing, setRefreshing] = useState(false);

  // 模拟数据
  const mockDashboardStats: DashboardStats = {
    totalPublications: 1248,
    totalJournals: 856,
    totalDepartments: 15,
    averageImpactFactor: 4.23,
    thisYearPublications: 186,
    lastYearPublications: 142,
    q1Publications: 45,
    q2Publications: 68,
    q3Publications: 52,
    q4Publications: 21,
    topDepartments: [
      { departmentName: '心内科', publicationCount: 28, averageIF: 6.45 },
      { departmentName: '神经科', publicationCount: 24, averageIF: 5.89 },
      { departmentName: '肿瘤科', publicationCount: 22, averageIF: 7.12 },
      { departmentName: '内科', publicationCount: 19, averageIF: 4.56 },
      { departmentName: '外科', publicationCount: 17, averageIF: 3.98 },
    ],
    recentTrends: [
      { month: '1月', count: 12 },
      { month: '2月', count: 15 },
      { month: '3月', count: 18 },
      { month: '4月', count: 22 },
      { month: '5月', count: 19 },
      { month: '6月', count: 25 },
    ],
  };

  const mockDepartmentRankings: DepartmentRanking[] = [
    { rank: 1, departmentName: '心内科', publicationCount: 28, averageIF: 6.45, q1Count: 12, growth: 23.5 },
    { rank: 2, departmentName: '神经科', publicationCount: 24, averageIF: 5.89, q1Count: 9, growth: 15.2 },
    { rank: 3, departmentName: '肿瘤科', publicationCount: 22, averageIF: 7.12, q1Count: 15, growth: 31.8 },
    { rank: 4, departmentName: '内科', publicationCount: 19, averageIF: 4.56, q1Count: 6, growth: 8.7 },
    { rank: 5, departmentName: '外科', publicationCount: 17, averageIF: 3.98, q1Count: 4, growth: -5.2 },
  ];

  // 加载数据
  const loadData = async () => {
    setRefreshing(true);
    try {
      // 实际项目中应该调用这些API
      // await dispatch(fetchDashboardStats());
      // await dispatch(fetchOverviewStatistics({ year: selectedYear }));
      // await dispatch(fetchYearlyTrends({ year: selectedYear }));
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadData();
  }, [selectedYear]);

  // 处理时间范围变化
  const handleTimeRangeChange = (dates: any) => {
    setTimeRange(dates);
    // 根据时间范围重新加载数据
    if (dates) {
      // dispatch相关action
    }
  };

  // 计算增长率
  const growthRate = mockDashboardStats.lastYearPublications > 0 
    ? ((mockDashboardStats.thisYearPublications - mockDashboardStats.lastYearPublications) / mockDashboardStats.lastYearPublications * 100)
    : 0;

  // 科室排名表格列配置
  const departmentColumns: ColumnsType<DepartmentRanking> = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (rank: number) => (
        <div style={{ textAlign: 'center' }}>
          {rank <= 3 ? (
            <TrophyOutlined style={{ 
              color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32',
              fontSize: 16 
            }} />
          ) : (
            <span style={{ fontWeight: 'bold' }}>{rank}</span>
          )}
        </div>
      ),
    },
    {
      title: '科室名称',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: '文献数量',
      dataIndex: 'publicationCount',
      key: 'publicationCount',
      sorter: (a, b) => a.publicationCount - b.publicationCount,
      render: (count: number) => <Text strong>{count}</Text>,
    },
    {
      title: '平均影响因子',
      dataIndex: 'averageIF',
      key: 'averageIF',
      sorter: (a, b) => a.averageIF - b.averageIF,
      render: (impactFactor: number) => <Text>{impactFactor.toFixed(2)}</Text>,
    },
    {
      title: 'Q1期刊数',
      dataIndex: 'q1Count',
      key: 'q1Count',
      render: (count: number) => <Tag color="green">{count}</Tag>,
    },
    {
      title: '同比增长',
      dataIndex: 'growth',
      key: 'growth',
      render: (growth: number) => (
        <span style={{ color: growth >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {growth >= 0 ? <RiseOutlined /> : <FallOutlined />}
          {Math.abs(growth).toFixed(1)}%
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题和控制区域 */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              统计概览仪表板
            </Title>
            <Text type="secondary">
              实时展示医院科研文献发表统计数据
            </Text>
          </Col>
          <Col>
            <Space>
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                style={{ width: 120 }}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <Option key={year} value={year}>
                      {year}年
                    </Option>
                  );
                })}
              </Select>
              <RangePicker
                value={timeRange}
                onChange={handleTimeRangeChange}
                placeholder={['开始日期', '结束日期']}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={loadData}
                loading={refreshing}
              >
                刷新数据
              </Button>
              <Button
                icon={<ExportOutlined />}
                type="primary"
              >
                导出报告
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert
          message="数据加载失败"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      <Spin spinning={loading || refreshing}>
        {/* 关键指标卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总文献数"
                value={mockDashboardStats.totalPublications}
                prefix={<FileTextOutlined />}
                suffix="篇"
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  今年新增: {mockDashboardStats.thisYearPublications}篇
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="期刊数量"
                value={mockDashboardStats.totalJournals}
                prefix={<BookOutlined />}
                suffix="种"
                valueStyle={{ color: '#52c41a' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  覆盖多个学科领域
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="参与科室"
                value={mockDashboardStats.totalDepartments}
                prefix={<TeamOutlined />}
                suffix="个"
                valueStyle={{ color: '#722ed1' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  全院科室参与度高
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均影响因子"
                value={mockDashboardStats.averageImpactFactor}
                precision={2}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
              <div style={{ marginTop: 8 }}>
                <span style={{ color: growthRate >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {growthRate >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  同比{growthRate >= 0 ? '增长' : '下降'} {Math.abs(growthRate).toFixed(1)}%
                </span>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 期刊分区分布和趋势 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card title="期刊分区分布" extra={<CalendarOutlined />}>
              <QuartileChart
                data={[
                  { name: 'Q1', value: mockDashboardStats.q1Publications, color: '#52c41a' },
                  { name: 'Q2', value: mockDashboardStats.q2Publications, color: '#1890ff' },
                  { name: 'Q3', value: mockDashboardStats.q3Publications, color: '#fa8c16' },
                  { name: 'Q4', value: mockDashboardStats.q4Publications, color: '#ff4d4f' },
                ]}
                height={280}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="发表趋势" extra={<RiseOutlined />}>
              <TrendChart
                data={mockDashboardStats.recentTrends}
                height={280}
              />
            </Card>
          </Col>
        </Row>

        {/* 科室发表统计图表 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card title="科室发表统计" extra={<BarChartOutlined />}>
              <DepartmentBarChart
                data={mockDashboardStats.topDepartments}
                height={350}
              />
            </Card>
          </Col>
        </Row>

        {/* 科室排名 */}
        <Card title="科室发表排名" extra={<TrophyOutlined />}>
          <Table
            columns={departmentColumns}
            dataSource={mockDepartmentRankings}
            rowKey="rank"
            pagination={false}
            size="middle"
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Dashboard;