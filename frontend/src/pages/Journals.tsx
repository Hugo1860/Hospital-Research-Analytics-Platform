import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Tooltip,
  message
} from 'antd';
import { 
  ReloadOutlined, 
  DownloadOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { fetchJournals } from '../store/slices/journalSlice';
import { usePermissions } from '../hooks/usePermissions';
import PermissionButton from '../components/common/PermissionButton';
import { PERMISSIONS } from '../constants/permissions';
import JournalSearch from '../components/journals/JournalSearch';
import JournalStatistics from '../components/journals/JournalStatistics';
import JournalImportComponent from '../components/journals/JournalImport';



interface Journal {
  id: number;
  name: string;
  issn?: string;
  impactFactor: number;
  quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  category: string;
  publisher?: string;
  year: number;
}

const JournalList: React.FC = () => {
  const dispatch = useDispatch();
  const permissions = usePermissions();
  const { journals, loading, pagination } = useSelector((state: RootState) => state.journals);
  
  const [filteredJournals, setFilteredJournals] = useState<Journal[]>([]);

  // 模拟期刊数据
  const mockJournals: Journal[] = [
    {
      id: 1,
      name: 'Nature',
      issn: '0028-0836',
      impactFactor: 49.962,
      quartile: 'Q1',
      category: 'Multidisciplinary Sciences',
      publisher: 'Nature Publishing Group',
      year: 2023,
    },
    {
      id: 2,
      name: 'Science',
      issn: '0036-8075',
      impactFactor: 47.728,
      quartile: 'Q1',
      category: 'Multidisciplinary Sciences',
      publisher: 'American Association for the Advancement of Science',
      year: 2023,
    },
    {
      id: 3,
      name: 'Cell',
      issn: '0092-8674',
      impactFactor: 41.582,
      quartile: 'Q1',
      category: 'Cell Biology',
      publisher: 'Elsevier',
      year: 2023,
    },
    {
      id: 4,
      name: 'The Lancet',
      issn: '0140-6736',
      impactFactor: 168.9,
      quartile: 'Q1',
      category: 'Medicine, General & Internal',
      publisher: 'Elsevier',
      year: 2023,
    },
    {
      id: 5,
      name: 'New England Journal of Medicine',
      issn: '0028-4793',
      impactFactor: 176.079,
      quartile: 'Q1',
      category: 'Medicine, General & Internal',
      publisher: 'Massachusetts Medical Society',
      year: 2023,
    },
  ];

  // 获取期刊分类列表
  const categories = Array.from(new Set(mockJournals.map(j => j.category)));

  // 表格列定义
  const columns = [
    {
      title: '期刊名称',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      render: (text: string, record: Journal) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{text}</div>
          {record.issn && (
            <div style={{ fontSize: 12, color: '#666' }}>ISSN: {record.issn}</div>
          )}
        </div>
      ),
    },
    {
      title: '影响因子',
      dataIndex: 'impactFactor',
      key: 'impactFactor',
      width: 120,
      sorter: (a: Journal, b: Journal) => a.impactFactor - b.impactFactor,
      render: (value: number) => (
        <span style={{ fontWeight: 'bold', color: value > 10 ? '#52c41a' : value > 5 ? '#1890ff' : '#666' }}>
          {value.toFixed(3)}
        </span>
      ),
    },
    {
      title: '分区',
      dataIndex: 'quartile',
      key: 'quartile',
      width: 80,
      render: (quartile: string) => {
        const colors = {
          Q1: '#52c41a',
          Q2: '#1890ff',
          Q3: '#faad14',
          Q4: '#ff4d4f',
        };
        return <Tag color={colors[quartile as keyof typeof colors]}>{quartile}</Tag>;
      },
    },
    {
      title: '学科分类',
      dataIndex: 'category',
      key: 'category',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (category: string) => (
        <Tooltip title={category}>
          <span>{category}</span>
        </Tooltip>
      ),
    },
    {
      title: '出版社',
      dataIndex: 'publisher',
      key: 'publisher',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (publisher: string) => (
        <Tooltip title={publisher}>
          <span>{publisher}</span>
        </Tooltip>
      ),
    },
    {
      title: '年份',
      dataIndex: 'year',
      key: 'year',
      width: 80,
      sorter: (a: Journal, b: Journal) => a.year - b.year,
    },
  ];

  // 搜索处理
  const handleSearch = (params: any) => {
    let filtered = [...mockJournals];
    
    // 关键词搜索
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filtered = filtered.filter(journal =>
        journal.name.toLowerCase().includes(keyword) ||
        journal.issn?.toLowerCase().includes(keyword) ||
        journal.publisher?.toLowerCase().includes(keyword) ||
        journal.category.toLowerCase().includes(keyword)
      );
    }
    
    // 分区筛选
    if (params.quartile) {
      filtered = filtered.filter(journal => journal.quartile === params.quartile);
    }
    
    // 学科分类筛选
    if (params.category) {
      filtered = filtered.filter(journal => journal.category === params.category);
    }
    
    // 影响因子范围筛选
    if (params.impactFactorMin !== undefined) {
      filtered = filtered.filter(journal => journal.impactFactor >= params.impactFactorMin);
    }
    if (params.impactFactorMax !== undefined) {
      filtered = filtered.filter(journal => journal.impactFactor <= params.impactFactorMax);
    }
    
    // 年份筛选
    if (params.year) {
      filtered = filtered.filter(journal => journal.year === params.year);
    }
    
    setFilteredJournals(filtered);
    message.success(`找到 ${filtered.length} 本期刊`);
  };

  // 清除筛选
  const handleClearSearch = () => {
    setFilteredJournals(mockJournals);
  };

  // 导出数据
  const handleExport = () => {
    message.success('导出功能开发中');
  };

  // 刷新数据
  const handleRefresh = () => {
    // dispatch(fetchJournals(searchParams));
    message.success('数据已刷新');
  };

  // 组件挂载时加载数据
  useEffect(() => {
    setFilteredJournals(mockJournals);
    // dispatch(fetchJournals());
  }, []);

  return (
    <div>
      {/* 统计概览 */}
      <JournalStatistics journals={filteredJournals} loading={loading} />

      {/* 搜索组件 */}
      <JournalSearch
        onSearch={handleSearch}
        onClear={handleClearSearch}
        loading={loading}
        categories={categories}
      />

      {/* 操作按钮 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新数据
          </Button>
          <PermissionButton
            permissions={[PERMISSIONS.JOURNAL_EXPORT]}
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出期刊
          </PermissionButton>
        </Space>
      </Card>

      {/* 期刊列表表格 */}
      <Card title={`期刊列表 (${filteredJournals.length} 本)`}>
        <Table
          columns={columns}
          dataSource={filteredJournals}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: filteredJournals.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

const JournalImport: React.FC = () => {
  return <JournalImportComponent />;
};

const Journals: React.FC = () => {
  return (
    <Routes>
      <Route index element={<JournalList />} />
      <Route path="import" element={<JournalImport />} />
    </Routes>
  );
};

export default Journals;