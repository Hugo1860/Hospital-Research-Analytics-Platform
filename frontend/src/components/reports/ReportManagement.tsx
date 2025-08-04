import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Typography,
  Empty,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Progress,
  Modal,
  Descriptions,
  Divider,
  Alert,
} from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  SearchOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { reportService, ReportListItem } from '../../services/reportService';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

// 使用从 reportService 导入的 ReportListItem 类型

/**
 * 报告管理组件
 */
const ReportManagement: React.FC = () => {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportListItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    keyword: '',
    type: '',
    status: '',
    dateRange: null as any,
  });

  // 初始化数据
  useEffect(() => {
    loadReports();
  }, [pagination.current, pagination.pageSize, filters]);

  // 加载报告列表
  const loadReports = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        type: filters.type || undefined,
        status: filters.status || undefined,
        keyword: filters.keyword || undefined,
        startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      const result = await reportService.getReportList(params);
      setReports(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.total,
      }));
    } catch (error) {
      message.error('加载报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取文件图标
  const getFileIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'excel':
        return <FileExcelOutlined style={{ color: '#52c41a' }} />;
      case 'word':
        return <FileWordOutlined style={{ color: '#1890ff' }} />;
      default:
        return <FileTextOutlined />;
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string, progress?: number) => {
    switch (status) {
      case 'completed':
        return <Tag color="success">已完成</Tag>;
      case 'generating':
        return (
          <Space>
            <Tag color="processing">生成中</Tag>
            {progress && <Progress percent={progress} size="small" style={{ width: 60 }} />}
          </Space>
        );
      case 'failed':
        return <Tag color="error">生成失败</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  // 获取报告类型标签
  const getTypeTag = (type: string) => {
    switch (type) {
      case 'department':
        return <Tag color="blue">科室报告</Tag>;
      case 'hospital':
        return <Tag color="green">全院报告</Tag>;
      case 'custom':
        return <Tag color="orange">自定义报告</Tag>;
      default:
        return <Tag>未知类型</Tag>;
    }
  };

  // 下载报告
  const handleDownload = async (report: ReportListItem) => {
    if (report.status !== 'completed') {
      message.warning('报告尚未生成完成');
      return;
    }

    try {
      await reportService.downloadReport(report.id, `${report.title}.${report.format}`);
      message.success('报告下载成功');
    } catch (error) {
      message.error('下载失败，请重试');
    }
  };

  // 删除报告
  const handleDelete = async (reportId: string) => {
    try {
      await reportService.deleteReport(reportId);
      message.success('报告删除成功');
      loadReports(); // 重新加载列表
    } catch (error) {
      message.error('删除失败，请重试');
    }
  };

  // 预览报告
  const handlePreview = (report: ReportListItem) => {
    if (report.status !== 'completed') {
      message.warning('报告尚未生成完成');
      return;
    }
    
    // 在新窗口打开预览
    window.open(report.downloadUrl, '_blank');
  };

  // 查看报告详情
  const handleViewDetails = (report: ReportListItem) => {
    setSelectedReport(report);
    setDetailModalVisible(true);
  };

  // 重新生成报告
  const handleRegenerate = async (report: ReportListItem) => {
    try {
      await reportService.regenerateReport(report.id);
      message.success('开始重新生成报告');
      loadReports(); // 重新加载列表
    } catch (error) {
      message.error('重新生成失败');
    }
  };

  // 处理筛选条件变化
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 })); // 重置到第一页
  };

  // 处理分页变化
  const handleTableChange = (paginationConfig: any) => {
    setPagination(prev => ({
      ...prev,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    }));
  };

  const columns = [
    {
      title: '报告名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ReportListItem) => (
        <Space>
          {getFileIcon(record.format)}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => getTypeTag(type),
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      render: (format: string) => format.toUpperCase(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: ReportListItem) => getStatusTag(status, record.progress),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: string) => size || '-',
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      key: 'createdBy',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a: ReportListItem, b: ReportListItem) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: ReportListItem) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {record.status === 'completed' && (
            <>
              <Tooltip title="预览">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(record)}
                />
              </Tooltip>
              <Tooltip title="下载">
                <Button
                  type="text"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(record)}
                />
              </Tooltip>
            </>
          )}
          {record.status === 'failed' && (
            <Tooltip title="重新生成">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => handleRegenerate(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这个报告吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            报告管理
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadReports}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        {/* 筛选条件 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Search
              placeholder="搜索报告名称或创建人"
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
              onSearch={() => {}} // 实时搜索，不需要额外处理
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="报告类型"
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="department">科室报告</Option>
              <Option value="hospital">全院报告</Option>
              <Option value="custom">自定义报告</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="状态"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="completed">已完成</Option>
              <Option value="generating">生成中</Option>
              <Option value="failed">生成失败</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {reports.length}
                </div>
                <div>总报告数</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {reports.filter(r => r.status === 'completed').length}
                </div>
                <div>已完成</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                  {reports.filter(r => r.status === 'generating').length}
                </div>
                <div>生成中</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                  {reports.filter(r => r.status === 'failed').length}
                </div>
                <div>生成失败</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 报告列表 */}
        {reports.length > 0 ? (
          <Table
            columns={columns}
            dataSource={reports}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            onChange={handleTableChange}
          />
        ) : (
          <Empty
            description="暂无报告记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* 报告详情模态框 */}
      <Modal
        title="报告详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          selectedReport?.status === 'completed' && (
            <Button
              key="download"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => {
                if (selectedReport) {
                  handleDownload(selectedReport);
                  setDetailModalVisible(false);
                }
              }}
            >
              下载报告
            </Button>
          ),
        ]}
        width={600}
      >
        {selectedReport && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="报告名称" span={2}>
                {selectedReport.title}
              </Descriptions.Item>
              <Descriptions.Item label="报告类型">
                {getTypeTag(selectedReport.type)}
              </Descriptions.Item>
              <Descriptions.Item label="输出格式">
                <Space>
                  {getFileIcon(selectedReport.format)}
                  {selectedReport.format.toUpperCase()}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedReport.status, selectedReport.progress)}
              </Descriptions.Item>
              <Descriptions.Item label="文件大小">
                {selectedReport.size || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建人">
                {selectedReport.createdBy}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {selectedReport.createdAt}
              </Descriptions.Item>
              {selectedReport.completedAt && (
                <Descriptions.Item label="完成时间">
                  {selectedReport.completedAt}
                </Descriptions.Item>
              )}
              {selectedReport.departments && selectedReport.departments.length > 0 && (
                <Descriptions.Item label="涉及科室" span={2}>
                  {selectedReport.departments.map(dept => (
                    <Tag key={dept} color="blue">{dept}</Tag>
                  ))}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedReport.error && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  message="生成失败"
                  description={selectedReport.error}
                  type="error"
                  showIcon
                />
              </div>
            )}

            {selectedReport.parameters && (
              <div style={{ marginTop: 16 }}>
                <Divider>报告参数</Divider>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 12, 
                  borderRadius: 4,
                  fontSize: 12,
                  maxHeight: 200,
                  overflow: 'auto'
                }}>
                  {JSON.stringify(selectedReport.parameters, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportManagement;