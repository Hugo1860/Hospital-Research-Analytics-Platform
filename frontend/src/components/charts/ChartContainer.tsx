import React, { useState, useRef } from 'react';
import { Card, Modal, Button, Space, message } from 'antd';
import { FullscreenOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons';
import ChartExportTool from './ChartExportTool';
import ChartConfigPanel from './ChartConfigPanel';

interface ChartContainerProps {
  title?: string;
  children: React.ReactNode;
  exportable?: boolean;
  fullscreenable?: boolean;
  configurable?: boolean;
  onExport?: () => void;
  onFullscreen?: () => void;
  onConfig?: () => void;
  loading?: boolean;
  chartData?: any[];
  chartInstance?: any;
  chartType?: 'bar' | 'line' | 'pie' | 'mixed';
  chartConfig?: any;
  onConfigChange?: (config: any) => void;
}

/**
 * 增强版图表容器组件
 * 提供统一的图表操作功能：导出、全屏、配置等
 */
const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  children,
  exportable = true,
  fullscreenable = true,
  configurable = false,
  onExport,
  onFullscreen,
  onConfig,
  loading = false,
  chartData = [],
  chartInstance,
  chartType = 'bar',
  chartConfig = {},
  onConfigChange,
}) => {
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [exportToolVisible, setExportToolVisible] = useState(false);
  const [configPanelVisible, setConfigPanelVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // 处理导出功能
  const handleExport = async () => {
    if (onExport) {
      onExport();
      return;
    }

    setExportToolVisible(true);
  };

  // 处理全屏功能
  const handleFullscreen = () => {
    if (onFullscreen) {
      onFullscreen();
    } else {
      setFullscreenVisible(true);
    }
  };

  // 处理配置功能
  const handleConfig = () => {
    if (onConfig) {
      onConfig();
    } else {
      setConfigPanelVisible(true);
    }
  };

  // 处理图片导出
  const handleImageExport = (config: any) => {
    console.log('导出图片配置:', config);
    message.success('图片导出成功');
  };

  // 处理数据导出
  const handleDataExport = (config: any) => {
    console.log('导出数据配置:', config);
    message.success('数据导出成功');
  };

  // 处理配置变更
  const handleConfigChange = (config: any) => {
    if (onConfigChange) {
      onConfigChange(config);
    }
  };

  return (
    <>
      <Card
        title={title}
        loading={loading}
        extra={
          <Space>
            {configurable && (
              <Button
                icon={<SettingOutlined />}
                size="small"
                onClick={handleConfig}
                title="图表配置"
              />
            )}
            {exportable && (
              <Button
                icon={<DownloadOutlined />}
                size="small"
                onClick={handleExport}
                title="导出图表"
              />
            )}
            {fullscreenable && (
              <Button
                icon={<FullscreenOutlined />}
                size="small"
                onClick={handleFullscreen}
                title="全屏显示"
              />
            )}
          </Space>
        }
      >
        <div ref={chartRef}>
          {children}
        </div>
      </Card>

      {/* 全屏模态框 */}
      <Modal
        title={title}
        open={fullscreenVisible}
        onCancel={() => setFullscreenVisible(false)}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        bodyStyle={{ height: '80vh', padding: 0 }}
      >
        <div style={{ height: '100%', padding: 16 }}>
          {children}
        </div>
      </Modal>

      {/* 导出工具 */}
      <ChartExportTool
        visible={exportToolVisible}
        onCancel={() => setExportToolVisible(false)}
        onExportImage={handleImageExport}
        onExportData={handleDataExport}
        chartTitle={title}
        chartData={chartData}
        chartInstance={chartInstance}
      />

      {/* 配置面板 */}
      <ChartConfigPanel
        visible={configPanelVisible}
        onClose={() => setConfigPanelVisible(false)}
        config={chartConfig}
        onConfigChange={handleConfigChange}
        chartType={chartType}
      />
    </>
  );
};

export default ChartContainer;