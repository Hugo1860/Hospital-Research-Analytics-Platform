import React from 'react';
import { Card, Row, Col, Statistic, Progress, Tag } from 'antd';
import { TrophyOutlined, BookOutlined, RiseOutlined, GlobalOutlined } from '@ant-design/icons';

interface Journal {
  id: number;
  name: string;
  impactFactor: number;
  quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  category: string;
  year: number;
}

interface JournalStatisticsProps {
  journals: Journal[];
  loading?: boolean;
}

/**
 * 期刊统计组件
 */
const JournalStatistics: React.FC<JournalStatisticsProps> = ({
  journals,
  loading = false,
}) => {
  // 计算统计数据
  const totalJournals = journals.length;
  const q1Journals = journals.filter(j => j.quartile === 'Q1').length;
  const q2Journals = journals.filter(j => j.quartile === 'Q2').length;
  const q3Journals = journals.filter(j => j.quartile === 'Q3').length;
  const q4Journals = journals.filter(j => j.quartile === 'Q4').length;
  
  const averageImpactFactor = totalJournals > 0 
    ? journals.reduce((sum, j) => sum + j.impactFactor, 0) / totalJournals 
    : 0;
  
  const highImpactJournals = journals.filter(j => j.impactFactor > 10).length;
  const categories = Array.from(new Set(journals.map(j => j.category))).length;
  
  // 最高影响因子期刊
  const topJournal = journals.reduce((max, journal) => 
    journal.impactFactor > max.impactFactor ? journal : max, 
    journals[0] || { name: '', impactFactor: 0 }
  );

  // 分区分布数据
  const quartileData = [
    { quartile: 'Q1', count: q1Journals, color: '#52c41a', percentage: (q1Journals / totalJournals) * 100 },
    { quartile: 'Q2', count: q2Journals, color: '#1890ff', percentage: (q2Journals / totalJournals) * 100 },
    { quartile: 'Q3', count: q3Journals, color: '#faad14', percentage: (q3Journals / totalJournals) * 100 },
    { quartile: 'Q4', count: q4Journals, color: '#ff4d4f', percentage: (q4Journals / totalJournals) * 100 },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      {/* 主要统计指标 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="期刊总数"
              value={totalJournals}
              suffix="本"
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Q1期刊"
              value={q1Journals}
              suffix="本"
              valueStyle={{ color: '#52c41a' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="平均影响因子"
              value={averageImpactFactor}
              precision={2}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="学科分类"
              value={categories}
              suffix="个"
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 详细统计 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="分区分布" loading={loading}>
            <div style={{ padding: '16px 0' }}>
              {quartileData.map(item => (
                <div key={item.quartile} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>
                      <Tag color={item.color}>{item.quartile}</Tag>
                      <span>{item.count} 本</span>
                    </span>
                    <span>{item.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress
                    percent={item.percentage}
                    strokeColor={item.color}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="质量指标" loading={loading}>
            <div style={{ padding: '16px 0' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="高影响因子期刊"
                    value={highImpactJournals}
                    suffix="本"
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    影响因子 &gt; 10
                  </div>
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Q1+Q2期刊占比"
                    value={((q1Journals + q2Journals) / totalJournals) * 100}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    高质量期刊比例
                  </div>
                </Col>
              </Row>
              
              {topJournal.name && (
                <div style={{ marginTop: 24, padding: 16, background: '#f6f8fa', borderRadius: 6 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>最高影响因子期刊</div>
                  <div style={{ fontSize: 16, color: '#1890ff', marginBottom: 4 }}>
                    {topJournal.name}
                  </div>
                  <div style={{ fontSize: 14, color: '#666' }}>
                    影响因子: <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                      {topJournal.impactFactor.toFixed(3)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default JournalStatistics;