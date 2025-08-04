import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Progress,
  DatePicker,
  Spin,
  Alert,
  Typography,
  Tabs,
  List,
  Avatar,
  Tooltip,
  Empty,
} from 'antd';
import {
  TeamOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TrophyOutlined,
  ExportOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  SwapOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { fetchDepartmentStatistics, fetchDepartmentComparison } from '../../store/slices/statisticsSlice';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import TrendChart from '../charts/TrendChart';
import QuartileChart from '../charts/QuartileChart';
import DepartmentBarChart from '../charts/DepartmentBarChart';
import DepartmentSelect from '../common/DepartmentSelect';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface DepartmentStats {
  departmentId: number;
  departmentName: string;
  totalPublications: number;
  averageImpactFactor: number;
  q1Publications: number;
  q2Publications: number;
  q3Publications: number;
  q4Publications: number;
  yearlyTrend: Array<{
    year: number;
    count: number;
    averageIF: number;
  }>;
  topAuthors: Array<{
    name: string;
    publicationCount: number;
    averageIF: number;
  }>;
  topJournals: Array<{
    journalName: string;
    publicationCount: number;
    impactFactor: number;
    quartile: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    count: number;
  }>;
}

interface ComparisonData {
  departmentName: string;
  totalPublications: number;
  averageIF: number;
  q1Count: number;
  growth: number;
  rank: number;
}

/**
 * 科室统计详情组件
 */
const DepartmentStatistics: React.FC = () => {
  const dispatch = useDispatch();
  const { departmentStats, departmentComparison, loading, error } = useSelector(
    (state: RootState) => state.statistics
  );

  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [timeRange, setTimeRange] = useState<any>(null);
  const [comparisonDepartments, setComparisonDepartments] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 模拟科室统计数据
  const mockDepartmentStats: DepartmentStats = {
    departmentId: 1,
    departmentName: '心内科',
    totalPublications: 28,
    averageImpactFactor: 6.45,
    q1Publications: 12,
    q2Publications: 8,
    q3Publications: 6,
    q4Publications: 2,
    yearlyTrend: [
      { year: 2020, count: 15, averageIF: 5.2 },
      { year: 2021, count: 18, averageIF: 5.8 },
      { year: 2022, count: 22, averageIF: 6.1 },
      { year: 2023, count: 28, averageIF: 6.45 },
    ],
    topAuthors: [
      { name: '张医生', publicationCount: 8, averageIF: 7.2 },
      { name: '李医生', publicationCount: 6, averageIF: 6.8 },
      { name: '王医生', publicationCount: 5, averageIF: 5.9 },
      { name: '刘医生', publicationCount: 4, averageIF: 6.2 },
      { name: '陈医生', publicationCount: 3, averageIF: 5.5 },
    ],
    topJournals: [
      { journalName: 'Nature Medicine', publicationCount: 3, impactFactor: 87.24, quartile: 'Q1' },
      { journalName: 'The Lancet', publicationCount: 2, impactFactor: 202.73, quartile: 'Q1' },
      { journalName: 'NEJM', publicationCount: 2, impactFactor: 176.08, quartile: 'Q1' },
      { journalName: 'Circulation', publicationCount: 4, impactFactor: 29.69, quartile: 'Q1' },
      { journalName: 'JACC', publicationCount: 3, impactFactor: 24.09, quartile: 'Q1' },
    ],
    monthlyTrend: [
      { month: '1月', count: 2 },
      { month: '2月', count: 3 },
      { month: '3月', count: 4 },
      { month: '4月', count: 5 },
      { month: '5月', count: 3 },
      { month: '6月', count: 6 },
      { month: '7月', count: 2 },
      { month: '8月', count: 1 },
      { month: '9月', count: 1 },
      { month: '10月', count: 1 },
    ],
  };

  // 模拟对比数据
  const mockComparisonData: ComparisonData[] = [
    { departmentName: '心内科', totalPublications: 28, averageIF: 6.45, q1Count: 12, growth: 27.3, rank: 1 },
    { departmentName: '神经科', totalPublications: 24, averageIF: 5.89, q1Count: 9, growth: 15.2, rank: 2 },
    { departmentName: '肿瘤科', totalPublications: 22, averageIF: 7.12, q1Count: 15, growth: 31.8, rank: 3 },
    { departmentName: '内科', totalPublications: 19, averageIF: 4.56, q1Count: 6, growth: 8.7, rank: 4 },
    { departmentName: '外科', totalPublications: 17, averageIF: 3.98, q1Count: 4, growth: -5.2, rank: 5 },
  ];

  // 加载科室统计数据
  const loadDepartmentStats = async () => {
    if (!selectedDepartment) return;
    
    setRefreshing(true);
    try {
      // 实际项目中应该调用API
      // await dispatch(fetchDepartmentStatistics({ 
      //   departmentId: selectedDepartment, 
      //   params: { year: selectedYear } 
      // }));
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('加载科室统计失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 加载对比数据
  const loadComparisonData = async () => {
    if (comparisonDepartments.length === 0) return;
    
    try {
      // await dispatch(fetchDepartmentComparison({ 
      //   departments: comparisonDepartments,
      //   year: selectedYear 
      // }));
    } catch (error) {
      console.error('加载对比数据失败:', error);
    }
  };

  // 导出统计数据
  const handleExport = () => {
    // 实现导出功能
    console.log('导出科室统计数据');
  };

  // 组件挂载时的初始化
  useEffect(() => {
    loadDepartmentStats();
  }, [selectedDepartment, selectedYear]);

  useEffect(() => {
    loadComparisonData();
  }, [comparisonDepartments, selectedYear]);

  // 作者排名表格列配置
  const authorColumns: ColumnsType<any> = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (_, __, index) => (
        <div style={{ textAlign: 'center' }}>
          {index < 3 ? (
            <TrophyOutlined style={{ 
              color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
              fontSize: 16 
            }} />
          ) : (
            <span style={{ fontWeight: 'bold' }}>{index + 1}</span>
          )}
        </div>
      ),
    },
    {
      title: '作者姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '发表数量',
      dataIndex: 'publicationCount',
      key: 'publicationCount',
      render: (count: number) => <Text strong>{count}篇</Text>,
    },
    {
      title: '平均影响因子',
      dataIndex: 'averageIF',
      key: 'averageIF',
      render: (impactFactor: number) => <Text>{impactFactor.toFixed(2)}</Text>,
    },
  ];

  // 期刊排名表格列配置
  const journalColumns: ColumnsType<any> = [
    {
      title: '期刊名称',
      dataIndex: 'journalName',
      key: 'journalName',
      ellipsis: true,
    },
    {
      title: '发表数量',
      dataIndex: 'publicationCount',
      key: 'publicationCount',
      render: (count: number) => <Text strong>{count}篇</Text>,
    },
    {
      title: '影响因子',
      dataIndex: 'impactFactor',
      key: 'impactFactor',
      render: (impactFactor: number) => <Text>{impactFactor.toFixed(2)}</Text>,
    },
    {
      title: '分区',
      dataIndex: 'quartile',
      key: 'quartile',
      render: (quartile: string) => (
        <Tag color={
          quartile === 'Q1' ? 'green' :
          quartile === 'Q2' ? 'blue' :
          quartile === 'Q3' ? 'orange' : 'red'
        }>
          {quartile}
        </Tag>
      ),
    },
  ];

  // 对比表格列配置
  const comparisonColumns: ColumnsType<ComparisonData> = [
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
      title: '发表数量',
      dataIndex: 'totalPublications',
      key: 'totalPublications',
      render: (count: number) => <Text strong>{count}篇</Text>,
    },
    {
      title: '平均影响因子',
      dataIndex: 'averageIF',
      key: 'averageIF',
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
              科室统计详情
            </Title>
            <Text type="secondary">
              查看科室详细统计数据和对比分析
            </Text>
          </Col>
          <Col>
            <Space>
              <DepartmentSelect
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                placeholder="选择科室"
                style={{ width: 150 }}
              />
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
                onChange={(dates) => setTimeRange(dates)}
                placeholder={['开始日期', '结束日期']}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={loadDepartmentStats}
                loading={refreshing}
              >
                刷新
              </Button>
              <Button
                icon={<ExportOutlined />}
                type="primary"
                onClick={handleExport}
              >
                导出数据
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

      {!selectedDepartment ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请选择要查看的科室"
          />
        </Card>
      ) : (
        <Spin spinning={loading || refreshing}>
          <Tabs defaultActiveKey="overview" type="card">
            {/* 科室概览 */}
            <TabPane tab="科室概览" key="overview">
              {/* 关键指标 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="总发表数量"
                      value={mockDepartmentStats.totalPublications}
                      prefix={<FileTextOutlined />}
                      suffix="篇"
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="平均影响因子"
                      value={mockDepartmentStats.averageImpactFactor}
                      precision={2}
                      prefix={<BarChartOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Q1期刊数量"
                      value={mockDepartmentStats.q1Publications}
                      prefix={<TrophyOutlined />}
                      suffix="篇"
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="年度增长率"
                      value={27.3}
                      precision={1}
                      prefix={<RiseOutlined />}
                      suffix="%"
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 图表展示 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Card title="期刊分区分布" extra={<CalendarOutlined />}>
                    <QuartileChart
                      data={[
                        { name: 'Q1', value: mockDepartmentStats.q1Publications, color: '#52c41a' },
                        { name: 'Q2', value: mockDepartmentStats.q2Publications, color: '#1890ff' },
                        { name: 'Q3', value: mockDepartmentStats.q3Publications, color: '#fa8c16' },
                        { name: 'Q4', value: mockDepartmentStats.q4Publications, color: '#ff4d4f' },
                      ]}
                      height={280}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="月度发表趋势" extra={<RiseOutlined />}>
                    <TrendChart
                      data={mockDepartmentStats.monthlyTrend}
                      height={280}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 年度趋势 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={24}>
                  <Card title="年度发表趋势" extra={<BarChartOutlined />}>
                    <TrendChart
                      data={mockDepartmentStats.yearlyTrend.map(item => ({
                        month: item.year.toString(),
                        count: item.count,
                      }))}
                      title="年度发表数量趋势"
                      height={300}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>

            {/* 作者和期刊分析 */}
            <TabPane tab="作者期刊分析" key="analysis">
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="高产作者排名" extra={<TrophyOutlined />}>
                    <Table
                      columns={authorColumns}
                      dataSource={mockDepartmentStats.topAuthors}
                      rowKey="name"
                      pagination={false}
                      size="middle"
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="主要发表期刊" extra={<BookOutlined />}>
                    <Table
                      columns={journalColumns}
                      dataSource={mockDepartmentStats.topJournals}
                      rowKey="journalName"
                      pagination={false}
                      size="middle"
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>

            {/* 科室对比 */}
            <TabPane tab="科室对比" key="comparison">
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Text>选择对比科室：</Text>
                  <Select
                    mode="multiple"
                    placeholder="选择要对比的科室"
                    value={comparisonDepartments}
                    onChange={setComparisonDepartments}
                    style={{ minWidth: 300 }}
                  >
                    <Option value={1}>心内科</Option>
                    <Option value={2}>神经科</Option>
                    <Option value={3}>肿瘤科</Option>
                    <Option value={4}>内科</Option>
                    <Option value={5}>外科</Option>
                  </Select>
                  <Button
                    icon={<SwapOutlined />}
                    onClick={loadComparisonData}
                    disabled={comparisonDepartments.length === 0}
                  >
                    开始对比
                  </Button>
                </Space>
              </div>

              {comparisonDepartments.length > 0 ? (
                <div>
                  <Card title="科室对比分析" style={{ marginBottom: 16 }}>
                    <Table
                      columns={comparisonColumns}
                      dataSource={mockComparisonData}
                      rowKey="departmentName"
                      pagination={false}
                      size="middle"
                    />
                  </Card>

                  <Card title="对比图表">
                    <DepartmentBarChart
                      data={mockComparisonData.map(item => ({
                        departmentName: item.departmentName,
                        publicationCount: item.totalPublications,
                        averageIF: item.averageIF,
                      }))}
                      title="科室发表数量对比"
                      height={350}
                    />
                  </Card>
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="请选择要对比的科室"
                />
              )}
            </TabPane>
          </Tabs>
        </Spin>
      )}
    </div>
  );
};

export default DepartmentStatistics;