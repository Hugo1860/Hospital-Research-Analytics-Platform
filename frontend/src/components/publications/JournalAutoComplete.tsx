import React, { useState } from 'react';
import { Select, Tag, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Option } = Select;

interface Journal {
  id: number;
  name: string;
  impactFactor: number;
  quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  category: string;
  issn?: string;
  publisher?: string;
}

interface JournalAutoCompleteProps {
  value?: number;
  onChange?: (value: number, journal?: Journal) => void;
  placeholder?: string;
  onJournalSelect?: (journal: Journal) => void;
}

/**
 * 期刊自动补全组件
 */
const JournalAutoComplete: React.FC<JournalAutoCompleteProps> = ({
  value,
  onChange,
  placeholder = '搜索并选择期刊',
  onJournalSelect,
}) => {
  const [options, setOptions] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // 模拟期刊数据
  const mockJournals: Journal[] = [
    {
      id: 1,
      name: 'Nature',
      impactFactor: 49.962,
      quartile: 'Q1',
      category: 'Multidisciplinary Sciences',
      issn: '0028-0836',
      publisher: 'Nature Publishing Group',
    },
    {
      id: 2,
      name: 'Science',
      impactFactor: 47.728,
      quartile: 'Q1',
      category: 'Multidisciplinary Sciences',
      issn: '0036-8075',
      publisher: 'American Association for the Advancement of Science',
    },
    {
      id: 3,
      name: 'Cell',
      impactFactor: 41.582,
      quartile: 'Q1',
      category: 'Cell Biology',
      issn: '0092-8674',
      publisher: 'Elsevier',
    },
    {
      id: 4,
      name: 'The Lancet',
      impactFactor: 168.9,
      quartile: 'Q1',
      category: 'Medicine, General & Internal',
      issn: '0140-6736',
      publisher: 'Elsevier',
    },
    {
      id: 5,
      name: 'New England Journal of Medicine',
      impactFactor: 176.079,
      quartile: 'Q1',
      category: 'Medicine, General & Internal',
      issn: '0028-4793',
      publisher: 'Massachusetts Medical Society',
    },
    {
      id: 6,
      name: 'Nature Medicine',
      impactFactor: 87.241,
      quartile: 'Q1',
      category: 'Medicine, Research & Experimental',
      issn: '1078-8956',
      publisher: 'Nature Publishing Group',
    },
    {
      id: 7,
      name: 'Nature Biotechnology',
      impactFactor: 68.164,
      quartile: 'Q1',
      category: 'Biotechnology & Applied Microbiology',
      issn: '1087-0156',
      publisher: 'Nature Publishing Group',
    },
  ];

  // 搜索期刊
  const handleSearch = async (searchText: string) => {
    setSearchValue(searchText);
    
    if (!searchText || searchText.length < 2) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      // 这里应该调用实际的API
      // const response = await journalAPI.searchJournals(searchText, 10);
      
      // 模拟搜索延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 模拟搜索结果
      const filtered = mockJournals.filter(journal =>
        journal.name.toLowerCase().includes(searchText.toLowerCase()) ||
        journal.category.toLowerCase().includes(searchText.toLowerCase()) ||
        journal.publisher?.toLowerCase().includes(searchText.toLowerCase())
      );
      
      setOptions(filtered);
    } catch (error) {
      console.error('期刊搜索失败:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // 选择期刊
  const handleSelect = (selectedValue: number) => {
    const selectedJournal = options.find(journal => journal.id === selectedValue);
    if (selectedJournal) {
      onChange?.(selectedValue, selectedJournal);
      onJournalSelect?.(selectedJournal);
      setSearchValue(selectedJournal.name);
    }
  };

  // 获取分区颜色
  const getQuartileColor = (quartile: string) => {
    const colors = {
      Q1: '#52c41a',
      Q2: '#1890ff',
      Q3: '#faad14',
      Q4: '#ff4d4f',
    };
    return colors[quartile as keyof typeof colors] || '#d9d9d9';
  };

  // 渲染期刊选项
  const renderOption = (journal: Journal) => (
    <Option key={journal.id} value={journal.id}>
      <div style={{ padding: '8px 0' }}>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: 14, 
          marginBottom: 4,
          color: '#262626'
        }}>
          {journal.name}
        </div>
        <Space wrap size={4}>
          <Tag 
            color={getQuartileColor(journal.quartile)}
            style={{ margin: 0 }}
          >
            {journal.quartile}
          </Tag>
          <Tag color="blue" style={{ margin: 0 }}>
            IF: {journal.impactFactor}
          </Tag>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {journal.category}
          </span>
        </Space>
        {journal.issn && (
          <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 2 }}>
            ISSN: {journal.issn}
          </div>
        )}
      </div>
    </Option>
  );

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      filterOption={false}
      onSearch={handleSearch}
      onSelect={handleSelect}
      loading={loading}
      notFoundContent={loading ? '搜索中...' : searchValue.length < 2 ? '请输入至少2个字符' : '未找到匹配的期刊'}
      style={{ width: '100%' }}
      dropdownMatchSelectWidth={false}
      suffixIcon={<SearchOutlined />}
    >
      {options.map(renderOption)}
    </Select>
  );
};

export default JournalAutoComplete;