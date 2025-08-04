import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Button, Modal, Table, Tag } from 'antd';
import { 
  DashboardOutlined, 
  ThunderboltOutlined, 
  DatabaseOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useApiMetrics, cacheManager } from '../../services/enhancedApi';
import tokenManager from '../../utils/tokenManager';

interface PerformanceMetrics {
  requestMetrics: any;
  tokenMetrics: any;
  memoryUsage?: any;
  networkStatus: 'online' | 'offline';
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    requestMetrics: {},
    tokenMetrics: {},
    networkStatus: navigator.onLine ? 'online' : 'offline'
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const { getRequestMetrics, getTokenMetrics } = useApiMetrics();

  // 更新性能指标
  const updateMetrics = () => {
    const requestMetrics = getRequestMetrics();
    const tokenMetrics = getTokenMetrics();
    
    // 获取内存使用情况（如果支持）
    const memoryUsage = (performance as any).memory ? {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
    } : null;

    setMetrics({
      requestMetrics,
      tokenMetrics,
      memoryUsage,
      networkStatus: navigator.onLine ? 'online' : 'offline'
    });
  };

  // 格式化字节数
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化百分比
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // 清除所有缓存
  const handleClearCache = () => {
    cacheManager.clearAll();
    updateMetrics();
  };

  // 清除特定模式的缓存
  const handleClearPatternCache = (pattern: string) => {
    cacheManager.clearPattern(pattern);
    updateMetrics();
  };

  useEffect(() => {
    updateMetrics();

    // 设置定时更新
    const interval = setInterval(updateMetrics, 5000); // 每5秒更新一次
    setRefreshInterval(interval);

    // 监听网络状态变化
    const handleOnline = () => setMetrics(prev => ({ ...prev, networkStatus: 'online' }));
    const handleOffline = () => setMetrics(prev => ({ ...prev, networkStatus: 'offline' }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { requestMetrics, tokenMetrics, memoryUsage, networkStatus } = metrics;

  // 缓存详情表格列
  const cacheColumns = [
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric',
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      render: (value: any) => <Tag color="blue">{value}</Tag>,
    },
  ];

  const cacheData = [
    { key: '1', metric: '缓存大小', value: requestMetrics.cacheSize || 0 },
    { key: '2', metric: '缓存命中率', value: formatPercentage(requestMetrics.cacheHitRate || 0) },
    { key: '3', metric: '缓存命中次数', value: requestMetrics.cacheHits || 0 },
    { key: '4', metric: '缓存未命中次数', value: requestMetrics.cacheMisses || 0 },
    { key: '5', metric: '去重请求数', value: requestMetrics.deduplicatedRequests || 0 },
    { key: '6', metric: '活跃请求数', value: requestMetrics.activeRequests || 0 },
    { key: '7', metric: '队列请求数', value: requestMetrics.queuedRequests || 0 },
  ];

  const tokenData = [
    { key: '1', metric: 'Token缓存命中', value: tokenMetrics.cacheHits || 0 },
    { key: '2', metric: 'Token缓存未命中', value: tokenMetrics.cacheMisses || 0 },
    { key: '3', metric: '去重请求数', value: tokenMetrics.duplicateRequestsPrevented || 0 },
    { key: '4', metric: '内存清理次数', value: tokenMetrics.memoryCleanups || 0 },
    { key: '5', metric: '缓存命中率', value: formatPercentage(tokenMetrics.cacheHitRate || 0) },
  ];

  return (
    <>
      {/* 性能监控按钮 */}
      <Button
        type="text"
        icon={<DashboardOutlined />}
        onClick={() => setIsModalVisible(true)}
        title="性能监控"
      >
        性能
      </Button>

      {/* 性能监控模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DashboardOutlined />
            系统性能监控
            <Tag color={networkStatus === 'online' ? 'green' : 'red'}>
              {networkStatus === 'online' ? '在线' : '离线'}
            </Tag>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={1000}
        footer={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={updateMetrics}>
            刷新
          </Button>,
          <Button key="clear" icon={<ClearOutlined />} onClick={handleClearCache}>
            清除缓存
          </Button>,
          <Button key="close" type="primary" onClick={() => setIsModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <Row gutter={[16, 16]}>
          {/* 请求统计 */}
          <Col span={12}>
            <Card title={<><ThunderboltOutlined /> 请求统计</>} size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="总请求数"
                    value={requestMetrics.totalRequests || 0}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="失败请求数"
                    value={requestMetrics.failedRequests || 0}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Statistic
                    title="重试请求数"
                    value={requestMetrics.retriedRequests || 0}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="去重请求数"
                    value={requestMetrics.deduplicatedRequests || 0}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 缓存统计 */}
          <Col span={12}>
            <Card title={<><DatabaseOutlined /> 缓存统计</>} size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="缓存大小"
                    value={requestMetrics.cacheSize || 0}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="缓存命中率"
                    value={formatPercentage(requestMetrics.cacheHitRate || 0)}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8 }}>缓存效率</div>
                <Progress
                  percent={Math.round((requestMetrics.cacheHitRate || 0) * 100)}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>
            </Card>
          </Col>

          {/* 内存使用情况 */}
          {memoryUsage && (
            <Col span={12}>
              <Card title={<><ClockCircleOutlined /> 内存使用</>} size="small">
                <Row gutter={16}>
                  <Col span={24}>
                    <Statistic
                      title="已使用内存"
                      value={formatBytes(memoryUsage.usedJSHeapSize)}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                </Row>
                <div style={{ marginTop: 16 }}>
                  <div style={{ marginBottom: 8 }}>内存使用率</div>
                  <Progress
                    percent={Math.round((memoryUsage.usedJSHeapSize / memoryUsage.totalJSHeapSize) * 100)}
                    strokeColor={{
                      '0%': '#108ee9',
                      '50%': '#faad14',
                      '100%': '#ff4d4f',
                    }}
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    总内存: {formatBytes(memoryUsage.totalJSHeapSize)} / 
                    限制: {formatBytes(memoryUsage.jsHeapSizeLimit)}
                  </div>
                </div>
              </Card>
            </Col>
          )}

          {/* Token管理统计 */}
          <Col span={12}>
            <Card title="Token管理" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="缓存命中"
                    value={tokenMetrics.cacheHits || 0}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="内存清理"
                    value={tokenMetrics.memoryCleanups || 0}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 详细缓存信息 */}
          <Col span={24}>
            <Card title="详细统计" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <h4>请求缓存</h4>
                  <Table
                    columns={cacheColumns}
                    dataSource={cacheData}
                    pagination={false}
                    size="small"
                  />
                </Col>
                <Col span={12}>
                  <h4>Token管理</h4>
                  <Table
                    columns={cacheColumns}
                    dataSource={tokenData}
                    pagination={false}
                    size="small"
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 缓存管理操作 */}
          <Col span={24}>
            <Card title="缓存管理" size="small">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="small" onClick={() => handleClearPatternCache('auth')}>
                  清除认证缓存
                </Button>
                <Button size="small" onClick={() => handleClearPatternCache('publications')}>
                  清除文献缓存
                </Button>
                <Button size="small" onClick={() => handleClearPatternCache('journals')}>
                  清除期刊缓存
                </Button>
                <Button size="small" onClick={() => handleClearPatternCache('statistics')}>
                  清除统计缓存
                </Button>
                <Button size="small" danger onClick={handleClearCache}>
                  清除所有缓存
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </Modal>
    </>
  );
};

export default PerformanceMonitor;