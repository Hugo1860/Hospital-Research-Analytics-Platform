import React, { useState } from 'react';
import {
  Modal,
  Button,
  Space,
  Select,
  Input,
  Form,
  Radio,
  Slider,
  Switch,
  Divider,
  Typography,
  message,
  Card,
  Row,
  Col,
} from 'antd';
import {
  DownloadOutlined,
  SettingOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';

const { Option } = Select;
const { Title, Text } = Typography;

interface ExportConfig {
  format: 'png' | 'jpg' | 'svg' | 'pdf';
  width: number;
  height: number;
  quality: number;
  backgroundColor: string;
  pixelRatio: number;
  includeTitle: boolean;
  includeLegend: boolean;
  includeDataLabels: boolean;
}

interface DataExportConfig {
  format: 'excel' | 'csv' | 'json';
  includeHeaders: boolean;
  includeMetadata: boolean;
  dateFormat: string;
  numberFormat: string;
}

interface ChartExportToolProps {
  visible: boolean;
  onCancel: () => void;
  onExportImage: (config: ExportConfig) => void;
  onExportData: (config: DataExportConfig) => void;
  chartTitle?: string;
  chartData?: any[];
  chartInstance?: any;
}

/**
 * 图表导出工具组件
 * 提供图片导出和数据导出功能，支持多种格式和自定义配置
 */
const ChartExportTool: React.FC<ChartExportToolProps> = ({
  visible,
  onCancel,
  onExportImage,
  onExportData,
  chartTitle = '图表',
  chartData = [],
  chartInstance,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'data'>('image');
  const [imageForm] = Form.useForm();
  const [dataForm] = Form.useForm();

  // 默认导出配置
  const defaultImageConfig: ExportConfig = {
    format: 'png',
    width: 800,
    height: 600,
    quality: 1,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    includeTitle: true,
    includeLegend: true,
    includeDataLabels: false,
  };

  const defaultDataConfig: DataExportConfig = {
    format: 'excel',
    includeHeaders: true,
    includeMetadata: true,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '0.00',
  };

  // 处理图片导出
  const handleImageExport = async () => {
    try {
      const values = await imageForm.validateFields();
      const config: ExportConfig = { ...defaultImageConfig, ...values };
      
      if (chartInstance) {
        // 使用ECharts内置导出功能
        const dataURL = chartInstance.getDataURL({
          type: config.format === 'jpg' ? 'jpeg' : config.format,
          pixelRatio: config.pixelRatio,
          backgroundColor: config.backgroundColor,
        });

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `${chartTitle}_${new Date().getTime()}.${config.format}`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        message.success('图表导出成功');
        onCancel();
      } else {
        onExportImage(config);
      }
    } catch (error) {
      message.error('导出配置验证失败');
    }
  };

  // 处理数据导出
  const handleDataExport = async () => {
    try {
      const values = await dataForm.validateFields();
      const config: DataExportConfig = { ...defaultDataConfig, ...values };
      
      if (config.format === 'excel') {
        exportToExcel(config);
      } else if (config.format === 'csv') {
        exportToCSV(config);
      } else if (config.format === 'json') {
        exportToJSON(config);
      }
      
      onExportData(config);
      message.success('数据导出成功');
      onCancel();
    } catch (error) {
      message.error('导出配置验证失败');
    }
  };

  // 导出为Excel格式
  const exportToExcel = (config: DataExportConfig) => {
    // 这里应该集成实际的Excel导出库，如SheetJS
    console.log('导出Excel:', config, chartData);
    
    // 模拟Excel导出
    const csvContent = convertToCSV(config);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${chartTitle}_data_${new Date().getTime()}.csv`;
    link.click();
  };

  // 导出为CSV格式
  const exportToCSV = (config: DataExportConfig) => {
    const csvContent = convertToCSV(config);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${chartTitle}_data_${new Date().getTime()}.csv`;
    link.click();
  };

  // 导出为JSON格式
  const exportToJSON = (config: DataExportConfig) => {
    const jsonData = {
      title: chartTitle,
      exportTime: new Date().toISOString(),
      data: chartData,
      ...(config.includeMetadata && {
        metadata: {
          totalRecords: chartData.length,
          exportConfig: config,
        },
      }),
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${chartTitle}_data_${new Date().getTime()}.json`;
    link.click();
  };

  // 转换为CSV格式
  const convertToCSV = (config: DataExportConfig): string => {
    if (!chartData || chartData.length === 0) {
      return '';
    }

    const headers = Object.keys(chartData[0]);
    let csv = '';

    // 添加标题行
    if (config.includeHeaders) {
      csv += headers.join(',') + '\n';
    }

    // 添加数据行
    chartData.forEach(row => {
      const values = headers.map(header => {
        let value = row[header];
        
        // 格式化数值
        if (typeof value === 'number') {
          value = value.toFixed(2);
        }
        
        // 处理包含逗号的字符串
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`;
        }
        
        return value || '';
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  };

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined />
          图表导出工具
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
    >
      <div style={{ marginBottom: 16 }}>
        <Radio.Group
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="image">
            <FileImageOutlined /> 图片导出
          </Radio.Button>
          <Radio.Button value="data">
            <FileExcelOutlined /> 数据导出
          </Radio.Button>
        </Radio.Group>
      </div>

      {activeTab === 'image' && (
        <Card title="图片导出配置">
          <Form
            form={imageForm}
            layout="vertical"
            initialValues={defaultImageConfig}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="format"
                  label="导出格式"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="png">PNG (推荐)</Option>
                    <Option value="jpg">JPG</Option>
                    <Option value="svg">SVG</Option>
                    <Option value="pdf">PDF</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="backgroundColor"
                  label="背景颜色"
                >
                  <Select>
                    <Option value="#ffffff">白色</Option>
                    <Option value="#f5f5f5">浅灰色</Option>
                    <Option value="transparent">透明</Option>
                    <Option value="#000000">黑色</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="width"
                  label="宽度 (px)"
                  rules={[{ required: true, type: 'number', min: 100, max: 4000 }]}
                >
                  <Slider
                    min={400}
                    max={2000}
                    step={50}
                    marks={{
                      400: '400',
                      800: '800',
                      1200: '1200',
                      1600: '1600',
                      2000: '2000',
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="height"
                  label="高度 (px)"
                  rules={[{ required: true, type: 'number', min: 100, max: 4000 }]}
                >
                  <Slider
                    min={300}
                    max={1500}
                    step={50}
                    marks={{
                      300: '300',
                      600: '600',
                      900: '900',
                      1200: '1200',
                      1500: '1500',
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="pixelRatio"
                  label="像素比例"
                >
                  <Select>
                    <Option value={1}>1x (标准)</Option>
                    <Option value={2}>2x (高清)</Option>
                    <Option value={3}>3x (超高清)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="quality"
                  label="图片质量"
                >
                  <Slider
                    min={0.1}
                    max={1}
                    step={0.1}
                    marks={{
                      0.1: '低',
                      0.5: '中',
                      1: '高',
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="includeTitle"
                  label="包含标题"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="includeLegend"
                  label="包含图例"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="includeDataLabels"
                  label="包含数据标签"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Space>
                <Button onClick={onCancel}>取消</Button>
                <Button type="primary" onClick={handleImageExport}>
                  <FileImageOutlined /> 导出图片
                </Button>
              </Space>
            </div>
          </Form>
        </Card>
      )}

      {activeTab === 'data' && (
        <Card title="数据导出配置">
          <Form
            form={dataForm}
            layout="vertical"
            initialValues={defaultDataConfig}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="format"
                  label="导出格式"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="excel">
                      <FileExcelOutlined /> Excel (.xlsx)
                    </Option>
                    <Option value="csv">CSV (.csv)</Option>
                    <Option value="json">JSON (.json)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="dateFormat"
                  label="日期格式"
                >
                  <Select>
                    <Option value="YYYY-MM-DD">2023-12-31</Option>
                    <Option value="MM/DD/YYYY">12/31/2023</Option>
                    <Option value="DD-MM-YYYY">31-12-2023</Option>
                    <Option value="YYYY年MM月DD日">2023年12月31日</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="numberFormat"
                  label="数字格式"
                >
                  <Select>
                    <Option value="0">整数</Option>
                    <Option value="0.0">一位小数</Option>
                    <Option value="0.00">两位小数</Option>
                    <Option value="0.000">三位小数</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="includeHeaders"
                  label="包含表头"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="includeMetadata"
                  label="包含元数据"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Space>
                <Button onClick={onCancel}>取消</Button>
                <Button type="primary" onClick={handleDataExport}>
                  <FileExcelOutlined /> 导出数据
                </Button>
              </Space>
            </div>
          </Form>
        </Card>
      )}
    </Modal>
  );
};

export default ChartExportTool;