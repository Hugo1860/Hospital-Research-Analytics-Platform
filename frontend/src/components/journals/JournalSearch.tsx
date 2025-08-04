import React, { useState } from 'react';
import { Card, Input, Select, Row, Col, Button, Space, InputNumber } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Option } = Select;

interface JournalSearchProps {
  onSearch: (params: any) => void;
  onClear: () => void;
  loading?: boolean;
  categories?: string[];
}

interface SearchParams {
  keyword: string;
  quartile: string;
  category: string;
  impactFactorMin?: number;
  impactFactorMax?: number;
  year?: number;
}

/**
 * 期刊搜索组件
 */
const JournalSearch: React.FC<JournalSearchProps> = ({
  onSearch,
  onClear,
  loading = false,
  categories = [],
}) => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    keyword: '',
    quartile: '',
    category: '',
    impactFactorMin: undefined,
    impactFactorMax: undefined,
    year: undefined,
  });

  // 更新搜索参数
  const updateSearchParams = (key: keyof SearchParams, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // 执行搜索
  const handleSearch = () => {
    const params = Object.fromEntries(
      Object.entries(searchParams).filter(([_, value]) => value !== '' && value !== undefined)
    );
    onSearch(params);
  };

  // 清除搜索条件
  const handleClear = () => {
    setSearchParams({
      keyword: '',
      quartile: '',
      category: '',
      impactFactorMin: undefined,
      impactFactorMax: undefined,
      year: undefined,
    });
    onClear();
  };

  // 快速搜索
  const handleQuickSearch = (value: string) => {
    updateSearchParams('keyword', value);
    onSearch({ keyword: value });
  };

  return (
    <Card title="期刊搜索" style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 关键词搜索 */}
        <Row gutter={16}>
          <Col span={24}>
            <Search
              placeholder="搜索期刊名称、ISSN、出版社或关键词"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={searchParams.keyword}
              onChange={(e) => updateSearchParams('keyword', e.target.value)}
              onSearch={handleQuickSearch}
              loading={loading}
            />
          </Col>
        </Row>

        {/* 高级筛选 */}
        <Row gutter={16} align="middle">
          <Col span={4}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>分区：</div>
            <Select
              placeholder="选择分区"
              allowClear
              style={{ width: '100%' }}
              value={searchParams.quartile}
              onChange={(value) => updateSearchParams('quartile', value)}
            >
              <Option value="Q1">Q1 (顶级期刊)</Option>
              <Option value="Q2">Q2 (优秀期刊)</Option>
              <Option value="Q3">Q3 (良好期刊)</Option>
              <Option value="Q4">Q4 (一般期刊)</Option>
            </Select>
          </Col>

          <Col span={6}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>学科分类：</div>
            <Select
              placeholder="选择学科分类"
              allowClear
              style={{ width: '100%' }}
              value={searchParams.category}
              onChange={(value) => updateSearchParams('category', value)}
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Col>

          <Col span={6}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>影响因子范围：</div>
            <Input.Group compact>
              <InputNumber
                style={{ width: '45%' }}
                placeholder="最小值"
                min={0}
                max={200}
                step={0.1}
                value={searchParams.impactFactorMin}
                onChange={(value) => updateSearchParams('impactFactorMin', value)}
              />
              <Input
                style={{ width: '10%', textAlign: 'center', pointerEvents: 'none' }}
                placeholder="~"
                disabled
              />
              <InputNumber
                style={{ width: '45%' }}
                placeholder="最大值"
                min={0}
                max={200}
                step={0.1}
                value={searchParams.impactFactorMax}
                onChange={(value) => updateSearchParams('impactFactorMax', value)}
              />
            </Input.Group>
          </Col>

          <Col span={4}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>年份：</div>
            <InputNumber
              style={{ width: '100%' }}
              placeholder="选择年份"
              min={2000}
              max={new Date().getFullYear()}
              value={searchParams.year}
              onChange={(value) => updateSearchParams('year', value)}
            />
          </Col>

          <Col span={4}>
            <div style={{ marginBottom: 8 }}>&nbsp;</div>
            <Space>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={handleSearch}
                loading={loading}
              >
                筛选
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={handleClear}
              >
                清除
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 快速筛选标签 */}
        <Row>
          <Col span={24}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>快速筛选：</div>
            <Space wrap>
              <Button
                size="small"
                onClick={() => onSearch({ quartile: 'Q1' })}
              >
                Q1期刊
              </Button>
              <Button
                size="small"
                onClick={() => onSearch({ impactFactorMin: 10 })}
              >
                影响因子&gt;10
              </Button>
              <Button
                size="small"
                onClick={() => onSearch({ impactFactorMin: 5, impactFactorMax: 10 })}
              >
                影响因子5-10
              </Button>
              <Button
                size="small"
                onClick={() => onSearch({ year: new Date().getFullYear() })}
              >
                最新年份
              </Button>
              <Button
                size="small"
                onClick={() => onSearch({ category: 'Medicine, General & Internal' })}
              >
                医学期刊
              </Button>
            </Space>
          </Col>
        </Row>
      </Space>
    </Card>
  );
};

export default JournalSearch;