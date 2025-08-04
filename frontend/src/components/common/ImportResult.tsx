import React from 'react';
import { Card, Row, Col, Statistic, List, Alert, Typography, Tag } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  WarningOutlined,
  FileExcelOutlined 
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface ImportResultData {
  success: number;
  failed: number;
  duplicates: number;
  total: number;
  errors: string[];
  warnings: string[];
  successData?: any[];
}

interface ImportResultProps {
  result: ImportResultData;
  title?: string;
  showSuccessData?: boolean;
}

/**
 * 导入结果展示组件
 */
const ImportResult: React.FC<ImportResultProps> = ({
  result,
  title = '导入结果',
  showSuccessData = false,
}) => {
  const successRate = result.total > 0 ? (result.success / result.total) * 100 : 0;

  return (
    <div>
      {/* 统计概览 */}
      <Card title={title} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总记录数"
              value={result.total}
              prefix={<FileExcelOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="成功导入"
              value={result.success}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
              suffix={`(${successRate.toFixed(1)}%)`}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="导入失败"
              value={result.failed}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="重复记录"
              value={result.duplicates}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 错误详情 */}
      {result.errors.length > 0 && (
        <Card title="错误详情" style={{ marginBottom: 16 }}>
          <Alert
            message={`发现 ${result.errors.length} 个错误`}
            description="以下记录导入失败，请检查数据格式后重新导入"
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <List
            size="small"
            dataSource={result.errors}
            renderItem={(error, index) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Tag color="red" style={{ marginRight: 8 }}>
                    错误 {index + 1}
                  </Tag>
                  <Text type="danger">{error}</Text>
                </div>
              </List.Item>
            )}
            style={{ maxHeight: 300, overflow: 'auto' }}
          />
        </Card>
      )}

      {/* 警告信息 */}
      {result.warnings.length > 0 && (
        <Card title="警告信息" style={{ marginBottom: 16 }}>
          <Alert
            message={`发现 ${result.warnings.length} 个警告`}
            description="以下记录已成功导入，但存在一些需要注意的问题"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <List
            size="small"
            dataSource={result.warnings}
            renderItem={(warning, index) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Tag color="orange" style={{ marginRight: 8 }}>
                    警告 {index + 1}
                  </Tag>
                  <Text type="warning">{warning}</Text>
                </div>
              </List.Item>
            )}
            style={{ maxHeight: 300, overflow: 'auto' }}
          />
        </Card>
      )}

      {/* 成功数据预览 */}
      {showSuccessData && result.successData && result.successData.length > 0 && (
        <Card title="成功导入的数据预览">
          <Alert
            message="数据导入成功"
            description={`以下是成功导入的前 ${Math.min(result.successData.length, 5)} 条记录`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <List
            size="small"
            dataSource={result.successData.slice(0, 5)}
            renderItem={(item, index) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Tag color="green" style={{ marginRight: 8 }}>
                    {index + 1}
                  </Tag>
                  <Text>{JSON.stringify(item)}</Text>
                </div>
              </List.Item>
            )}
          />
          {result.successData.length > 5 && (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
              还有 {result.successData.length - 5} 条记录未显示...
            </Text>
          )}
        </Card>
      )}

      {/* 导入总结 */}
      {result.total > 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {result.failed === 0 ? (
              <Alert
                message="导入完成"
                description={`所有 ${result.total} 条记录已成功导入系统`}
                type="success"
                showIcon
              />
            ) : result.success > 0 ? (
              <Alert
                message="部分导入成功"
                description={`${result.success} 条记录成功导入，${result.failed} 条记录导入失败`}
                type="warning"
                showIcon
              />
            ) : (
              <Alert
                message="导入失败"
                description="所有记录都导入失败，请检查数据格式后重新尝试"
                type="error"
                showIcon
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImportResult;