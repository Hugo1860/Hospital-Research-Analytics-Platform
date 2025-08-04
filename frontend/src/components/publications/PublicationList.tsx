import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
  Tooltip,
  Modal,
  Popconfirm,
  Row,
  Col,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  EyeOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { usePublicationList } from '../../hooks/usePublicationList';
import DepartmentSelect from '../common/DepartmentSelect';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

interface Publication {
  id: number;
  title: string;
  authors: string;
  journal: {
    id: number;
    name: string;
    impactFactor: number;
    quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    category: string;
  };
  department: {
    id: number;
    name: string;
  };
  publishYear: number;
  publishDate?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pmid?: string;
  wosNumber?: string;
  documentType?: string;
  journalAbbreviation?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

interface SearchFilters {
  keyword?: string;
  departmentId?: number;
  journalId?: number;
  year?: number;
  quartile?: string;
  dateRange?: [string, string];
}

/**
 * 文献列表组件
 */
const PublicationList: React.FC = () => {
  const navigate = useNavigate();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  
  const {
    publications,
    loading,
    selectedRowKeys,
    pagination,
    filters,
    deletePublication,
    batchDeletePublications,
    searchPublications,
    updateFilters,
    resetFilters,
    refresh,
    exportPublications,
    handlePaginationChange,
    handleSelectionChange,
  } = usePublicationList();

  // 删除文献处理
  const handleDelete = async (id: number) => {
    await deletePublication(id);
  };

  // 批量删除处理
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 篇文献吗？`,
      onOk: async () => {
        await batchDeletePublications(selectedRowKeys.map(key => Number(key)));
      },
    });
  };

  // 查看详情
  const handleViewDetail = (publication: Publication) => {
    setSelectedPublication(publication);
    setDetailModalVisible(true);
  };

  // 筛选处理
  const handleFilterChange = (key: string, value: any) => {
    updateFilters({ [key]: value });
  };

  // 表格列定义
  const columns: ColumnsType<Publication> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      ellipsis: {
        showTitle: false,
      },
      render: (title: string, record: Publication) => (
        <Tooltip title={title}>
          <Button 
            type="link" 
            onClick={() => handleViewDetail(record)}
            style={{ padding: 0, height: 'auto', textAlign: 'left' }}
          >
            <Text ellipsis style={{ maxWidth: 280 }}>
              {title}
            </Text>
          </Button>
        </Tooltip>
      ),
    },
    {
      title: '作者',
      dataIndex: 'authors',
      key: 'authors',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (authors: string) => (
        <Tooltip title={authors}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {authors}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '期刊',
      dataIndex: 'journal',
      key: 'journal',
      width: 200,
      render: (journal: Publication['journal']) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            <Text ellipsis style={{ maxWidth: 180 }}>
              {journal.name}
            </Text>
          </div>
          <Space size={4}>
            <Tag 
              color={
                journal.quartile === 'Q1' ? 'green' :
                journal.quartile === 'Q2' ? 'blue' :
                journal.quartile === 'Q3' ? 'orange' : 'red'
              }
              style={{ margin: 0 }}
            >
              {journal.quartile}
            </Tag>
            <Tag color="blue" style={{ margin: 0 }}>
              IF: {journal.impactFactor}
            </Tag>
          </Space>
        </div>
      ),
    },
    {
      title: '科室',
      dataIndex: 'department',
      key: 'department',
      width: 120,
      render: (department: Publication['department']) => department.name,
    },
    {
      title: '发表年份',
      dataIndex: 'publishYear',
      key: 'publishYear',
      width: 100,
      sorter: true,
    },
    {
      title: '卷期页',
      key: 'volumeIssuePages',
      width: 120,
      render: (_, record: Publication) => {
        const parts = [];
        if (record.volume) parts.push(`Vol.${record.volume}`);
        if (record.issue) parts.push(`No.${record.issue}`);
        if (record.pages) parts.push(record.pages);
        return parts.join(', ') || '-';
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record: Publication) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/publications/edit/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这篇文献吗？"
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

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: handleSelectionChange,
  };

  return (
    <Card
      title="文献列表"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/publications/add')}
          >
            录入文献
          </Button>
          <Button
            icon={<ImportOutlined />}
            onClick={() => navigate('/publications/import')}
          >
            批量导入
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={exportPublications}
          >
            导出
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={refresh}
          >
            刷新
          </Button>
        </Space>
      }
    >
      {/* 搜索和筛选区域 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Search
            placeholder="搜索标题或作者"
            allowClear
            onSearch={searchPublications}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={4}>
          <DepartmentSelect
            placeholder="选择科室"
            allowClear
            onChange={(value) => handleFilterChange('departmentId', value)}
            value={filters.departmentId}
          />
        </Col>
        <Col span={3}>
          <Select
            placeholder="发表年份"
            allowClear
            onChange={(value) => handleFilterChange('year', value)}
            value={filters.year}
            style={{ width: '100%' }}
          >
            {Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <Option key={year} value={year}>
                  {year}
                </Option>
              );
            })}
          </Select>
        </Col>
        <Col span={3}>
          <Select
            placeholder="期刊分区"
            allowClear
            onChange={(value) => handleFilterChange('quartile', value)}
            value={filters.quartile}
            style={{ width: '100%' }}
          >
            <Option value="Q1">Q1</Option>
            <Option value="Q2">Q2</Option>
            <Option value="Q3">Q3</Option>
            <Option value="Q4">Q4</Option>
          </Select>
        </Col>
        <Col span={6}>
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            onChange={(dates) => {
              if (dates) {
                handleFilterChange('dateRange', [
                  dates[0]?.format('YYYY-MM-DD'),
                  dates[1]?.format('YYYY-MM-DD'),
                ]);
              } else {
                handleFilterChange('dateRange', undefined);
              }
            }}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={2}>
          <Button onClick={resetFilters}>
            重置
          </Button>
        </Col>
      </Row>

      {/* 批量操作区域 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, padding: 8, background: '#f0f2f5', borderRadius: 4 }}>
          <Space>
            <span>已选择 {selectedRowKeys.length} 项</span>
            <Button size="small" onClick={handleBatchDelete} danger>
              批量删除
            </Button>
            <Button size="small" onClick={() => handleSelectionChange([])}>
              取消选择
            </Button>
          </Space>
        </div>
      )}

      {/* 文献列表表格 */}
      <Table
        columns={columns}
        dataSource={publications}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onChange: handlePaginationChange,
        }}
        scroll={{ x: 1200 }}
      />

      {/* 文献详情模态框 */}
      <Modal
        title="文献详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              setDetailModalVisible(false);
              navigate(`/publications/edit/${selectedPublication?.id}`);
            }}
          >
            编辑
          </Button>,
        ]}
        width={800}
      >
        {selectedPublication && (
          <div>
            <Row gutter={16}>
              <Col span={24}>
                <h4>标题</h4>
                <p>{selectedPublication.title}</p>
              </Col>
              <Col span={12}>
                <h4>作者</h4>
                <p>{selectedPublication.authors}</p>
              </Col>
              <Col span={12}>
                <h4>科室</h4>
                <p>{selectedPublication.department.name}</p>
              </Col>
              <Col span={24}>
                <h4>期刊信息</h4>
                <p>
                  <strong>{selectedPublication.journal.name}</strong>
                  <br />
                  影响因子: {selectedPublication.journal.impactFactor} | 
                  分区: {selectedPublication.journal.quartile} | 
                  类别: {selectedPublication.journal.category}
                </p>
              </Col>
              <Col span={8}>
                <h4>发表年份</h4>
                <p>{selectedPublication.publishYear}</p>
              </Col>
              <Col span={8}>
                <h4>发表日期</h4>
                <p>{selectedPublication.publishDate || '-'}</p>
              </Col>
              <Col span={8}>
                <h4>卷期页</h4>
                <p>
                  {[
                    selectedPublication.volume && `Vol.${selectedPublication.volume}`,
                    selectedPublication.issue && `No.${selectedPublication.issue}`,
                    selectedPublication.pages,
                  ].filter(Boolean).join(', ') || '-'}
                </p>
              </Col>
              {selectedPublication.doi && (
                <Col span={12}>
                  <h4>DOI</h4>
                  <p>{selectedPublication.doi}</p>
                </Col>
              )}
              {selectedPublication.pmid && (
                <Col span={12}>
                  <h4>PMID</h4>
                  <p>{selectedPublication.pmid}</p>
                </Col>
              )}
              {selectedPublication.wosNumber && (
                <Col span={12}>
                  <h4>WOS号</h4>
                  <p>{selectedPublication.wosNumber}</p>
                </Col>
              )}
              {selectedPublication.documentType && (
                <Col span={12}>
                  <h4>文献类型</h4>
                  <p>{selectedPublication.documentType}</p>
                </Col>
              )}
              {selectedPublication.journalAbbreviation && (
                <Col span={12}>
                  <h4>期刊简称</h4>
                  <p>{selectedPublication.journalAbbreviation}</p>
                </Col>
              )}
              {selectedPublication.address && (
                <Col span={24}>
                  <h4>地址信息</h4>
                  <p>{selectedPublication.address}</p>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default PublicationList;