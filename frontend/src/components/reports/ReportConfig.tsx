import React, { useState } from 'react';
import {
  Card,
  Form,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  Checkbox,
  Input,
  Radio,
  Slider,
  Alert,
  Steps,
  Spin,
  message,
  Tag,
} from 'antd';
import {
  FileTextOutlined,
  SettingOutlined,
  EyeOutlined,
  DownloadOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import DepartmentSelect from '../common/DepartmentSelect';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Step } = Steps;

interface ReportConfig {
  templateId: string;
  title: string;
  description?: string;
  reportType: 'department' | 'hospital' | 'custom';
  timeRange: {
    start: string;
    end: string;
  };
  departments: number[];
  includeCharts: boolean;
  includeData: boolean;
  includeAnalysis: boolean;
  format: 'pdf' | 'excel' | 'word';
  chartTypes: string[];
  dataFields: string[];
  analysisLevel: 'basic' | 'detailed' | 'comprehensive';
  customSettings: {
    showTrends: boolean;
    showComparison: boolean;
    showRankings: boolean;
    includeRecommendations: boolean;
  };
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'department' | 'hospital' | 'custom';
  preview: string;
  defaultConfig: Partial<ReportConfig>;
}

/**
 * 报告配置页面组件
 */
const ReportConfig: React.FC = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // 报告模板数据
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'dept_annual',
      name: '科室年度报告',
      description: '生成指定科室的年度科研发表统计报告，包含详细的数据分析和趋势图表',
      type: 'department',
      preview: '/templates/dept_annual_preview.png',
      defaultConfig: {
        reportType: 'department',
        includeCharts: true,
        includeData: true,
        includeAnalysis: true,
        format: 'pdf',
        chartTypes: ['bar', 'line', 'pie'],
        analysisLevel: 'detailed',
      },
    },
    {
      id: 'hospital_summary',
      name: '全院统计报告',
      description: '生成全院科研发表情况的综合统计报告，包含各科室对比分析',
      type: 'hospital',
      preview: '/templates/hospital_summary_preview.png',
      defaultConfig: {
        reportType: 'hospital',
        includeCharts: true,
        includeData: true,
        includeAnalysis: true,
        format: 'pdf',
        chartTypes: ['bar', 'pie', 'heatmap'],
        analysisLevel: 'comprehensive',
      },
    },
    {
      id: 'quarterly_review',
      name: '季度回顾报告',
      description: '生成季度科研发表情况回顾，重点关注趋势变化和关键指标',
      type: 'hospital',
      preview: '/templates/quarterly_review_preview.png',
      defaultConfig: {
        reportType: 'hospital',
        includeCharts: true,
        includeData: false,
        includeAnalysis: true,
        format: 'pdf',
        chartTypes: ['line', 'bar'],
        analysisLevel: 'basic',
      },
    },
    {
      id: 'custom_report',
      name: '自定义报告',
      description: '根据您的具体需求自定义报告内容和格式',
      type: 'custom',
      preview: '/templates/custom_report_preview.png',
      defaultConfig: {
        reportType: 'custom',
        includeCharts: false,
        includeData: false,
        includeAnalysis: false,
        format: 'pdf',
        chartTypes: [],
        analysisLevel: 'basic',
      },
    },
  ];

  // 处理模板选择
  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    
    // 应用模板默认配置
    const defaultValues = {
      templateId: template.id,
      title: `${template.name} - ${dayjs().format('YYYY年MM月DD日')}`,
      reportType: template.type,
      timeRange: [dayjs().subtract(1, 'year'), dayjs()],
      departments: template.type === 'department' ? [] : undefined,
      ...template.defaultConfig,
    };
    
    form.setFieldsValue(defaultValues);
    setCurrentStep(1);
  };

  // 处理预览
  const handlePreview = async () => {
    try {
      const values = await form.validateFields();
      setPreviewVisible(true);
      
      // 模拟生成预览数据
      const mockPreviewData = {
        title: values.title,
        reportType: values.reportType,
        timeRange: values.timeRange,
        departments: values.departments,
        chartCount: values.chartTypes?.length || 0,
        dataFieldCount: values.dataFields?.length || 0,
        estimatedPages: Math.ceil((values.chartTypes?.length || 0) * 2 + (values.dataFields?.length || 0) * 0.5 + 5),
        generationTime: '约 2-3 分钟',
      };
      
      setPreviewData(mockPreviewData);
      message.success('预览生成成功');
    } catch (error) {
      message.error('请完善报告配置信息');
    }
  };

  // 处理报告生成
  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setGenerating(true);
      
      // 准备报告参数
      const reportParams = {
        title: values.title,
        description: values.description,
        reportType: values.reportType,
        timeRange: {
          start: values.timeRange[0].format('YYYY-MM-DD'),
          end: values.timeRange[1].format('YYYY-MM-DD'),
        },
        departments: values.departments,
        includeCharts: values.includeCharts,
        includeData: values.includeData,
        includeAnalysis: values.includeAnalysis,
        format: values.format,
        chartTypes: values.chartTypes,
        dataFields: values.dataFields,
        analysisLevel: values.analysisLevel,
        customSettings: values.customSettings,
      };

      let response;
      
      // 根据报告类型调用不同的API
      if (values.reportType === 'department') {
        const { reportAPI } = await import('../../services/api');
        response = await reportAPI.generateDepartmentReport(reportParams);
      } else if (values.reportType === 'hospital') {
        const { reportAPI } = await import('../../services/api');
        response = await reportAPI.generateHospitalReport(reportParams);
      } else {
        const { reportAPI } = await import('../../services/api');
        response = await reportAPI.generateCustomReport(reportParams);
      }
      
      message.success('报告生成成功！');
      
      // 处理文件下载
      if (values.format === 'pdf' || values.format === 'excel') {
        const blob = new Blob([response.data], { 
          type: values.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${values.title}.${values.format}`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Word格式或其他格式的处理
        const blob = new Blob([response.data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${values.title}.${values.format}`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
    } catch (error: any) {
      console.error('报告生成失败:', error);
      message.error(error.response?.data?.message || '报告生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  // 步骤配置
  const steps = [
    {
      title: '选择模板',
      description: '选择报告模板',
      icon: <FileTextOutlined />,
    },
    {
      title: '配置参数',
      description: '设置报告参数',
      icon: <SettingOutlined />,
    },
    {
      title: '预览生成',
      description: '预览并生成报告',
      icon: <EyeOutlined />,
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            报告配置
          </Space>
        }
        extra={
          <Steps current={currentStep} size="small">
            {steps.map((step, index) => (
              <Step key={index} title={step.title} icon={step.icon} />
            ))}
          </Steps>
        }
      >
        {/* 步骤1: 模板选择 */}
        {currentStep === 0 && (
          <div>
            <Title level={4}>选择报告模板</Title>
            <Text type="secondary">
              请选择适合您需求的报告模板，每个模板都有预设的配置和样式
            </Text>
            
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              {reportTemplates.map((template) => (
                <Col key={template.id} span={12}>
                  <Card
                    hoverable
                    onClick={() => handleTemplateSelect(template)}
                    style={{
                      border: selectedTemplate?.id === template.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    }}
                    cover={
                      <div
                        style={{
                          height: 120,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 24,
                        }}
                      >
                        <FileTextOutlined />
                      </div>
                    }
                  >
                    <Card.Meta
                      title={template.name}
                      description={template.description}
                    />
                    <div style={{ marginTop: 12 }}>
                      <Tag color={
                        template.type === 'department' ? 'blue' :
                        template.type === 'hospital' ? 'green' : 'orange'
                      }>
                        {template.type === 'department' ? '科室报告' :
                         template.type === 'hospital' ? '全院报告' : '自定义报告'}
                      </Tag>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* 步骤2: 参数配置 */}
        {currentStep === 1 && selectedTemplate && (
          <div>
            <Title level={4}>配置报告参数</Title>
            <Text type="secondary">
              根据您的需求调整报告配置，所有参数都可以自定义
            </Text>

            <Form
              form={form}
              layout="vertical"
              style={{ marginTop: 24 }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="title"
                    label="报告标题"
                    rules={[{ required: true, message: '请输入报告标题' }]}
                  >
                    <Input placeholder="请输入报告标题" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="format"
                    label="输出格式"
                    rules={[{ required: true, message: '请选择输出格式' }]}
                  >
                    <Select placeholder="请选择输出格式">
                      <Option value="pdf">PDF</Option>
                      <Option value="excel">Excel</Option>
                      <Option value="word">Word</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="timeRange"
                    label="时间范围"
                    rules={[{ required: true, message: '请选择时间范围' }]}
                  >
                    <RangePicker
                      style={{ width: '100%' }}
                      placeholder={['开始日期', '结束日期']}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  {selectedTemplate.type === 'department' && (
                    <Form.Item
                      name="departments"
                      label="选择科室"
                      rules={[{ required: true, message: '请选择科室' }]}
                    >
                      <DepartmentSelect
                        mode="multiple"
                        placeholder="请选择要包含的科室"
                      />
                    </Form.Item>
                  )}
                </Col>
              </Row>

              <Form.Item name="description" label="报告描述">
                <TextArea
                  placeholder="请输入报告描述（可选）"
                  rows={3}
                />
              </Form.Item>

              <Divider />

              <Title level={5}>内容配置</Title>
              
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item name="includeCharts" valuePropName="checked">
                    <Checkbox>包含图表</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="includeData" valuePropName="checked">
                    <Checkbox>包含数据表格</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="includeAnalysis" valuePropName="checked">
                    <Checkbox>包含分析报告</Checkbox>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="chartTypes"
                label="图表类型"
                tooltip="选择要包含在报告中的图表类型"
              >
                <Checkbox.Group>
                  <Row>
                    <Col span={6}>
                      <Checkbox value="bar">柱状图</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="line">折线图</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="pie">饼图</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="heatmap">热力图</Checkbox>
                    </Col>
                  </Row>
                </Checkbox.Group>
              </Form.Item>

              <Form.Item
                name="dataFields"
                label="数据字段"
                tooltip="选择要包含在报告中的数据字段"
              >
                <Checkbox.Group>
                  <Row>
                    <Col span={6}>
                      <Checkbox value="title">文献标题</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="authors">作者信息</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="journal">期刊信息</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="impact_factor">影响因子</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="quartile">期刊分区</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="publish_date">发表日期</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="department">所属科室</Checkbox>
                    </Col>
                    <Col span={6}>
                      <Checkbox value="doi">DOI</Checkbox>
                    </Col>
                  </Row>
                </Checkbox.Group>
              </Form.Item>

              <Form.Item
                name="analysisLevel"
                label="分析深度"
              >
                <Radio.Group>
                  <Radio value="basic">基础分析</Radio>
                  <Radio value="detailed">详细分析</Radio>
                  <Radio value="comprehensive">全面分析</Radio>
                </Radio.Group>
              </Form.Item>

              <Divider />

              <Title level={5}>高级设置</Title>
              
              <Form.Item name={['customSettings', 'showTrends']} valuePropName="checked">
                <Checkbox>显示趋势分析</Checkbox>
              </Form.Item>
              
              <Form.Item name={['customSettings', 'showComparison']} valuePropName="checked">
                <Checkbox>显示对比分析</Checkbox>
              </Form.Item>
              
              <Form.Item name={['customSettings', 'showRankings']} valuePropName="checked">
                <Checkbox>显示排名信息</Checkbox>
              </Form.Item>
              
              <Form.Item name={['customSettings', 'includeRecommendations']} valuePropName="checked">
                <Checkbox>包含改进建议</Checkbox>
              </Form.Item>

              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Space size="large">
                  <Button onClick={() => setCurrentStep(0)}>
                    返回模板选择
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => setCurrentStep(2)}
                    icon={<EyeOutlined />}
                  >
                    预览配置
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        )}

        {/* 步骤3: 预览生成 */}
        {currentStep === 2 && (
          <div>
            <Title level={4}>预览和生成</Title>
            <Text type="secondary">
              确认报告配置信息，然后生成您的报告
            </Text>

            <Row gutter={24} style={{ marginTop: 24 }}>
              <Col span={12}>
                <Card title="配置预览" size="small">
                  {previewData ? (
                    <div>
                      <p><strong>报告标题：</strong>{previewData.title}</p>
                      <p><strong>报告类型：</strong>{
                        previewData.reportType === 'department' ? '科室报告' :
                        previewData.reportType === 'hospital' ? '全院报告' : '自定义报告'
                      }</p>
                      <p><strong>时间范围：</strong>{previewData.timeRange?.[0]?.format('YYYY-MM-DD')} 至 {previewData.timeRange?.[1]?.format('YYYY-MM-DD')}</p>
                      <p><strong>包含图表：</strong>{previewData.chartCount} 个</p>
                      <p><strong>数据字段：</strong>{previewData.dataFieldCount} 个</p>
                      <p><strong>预计页数：</strong>{previewData.estimatedPages} 页</p>
                      <p><strong>生成时间：</strong>{previewData.generationTime}</p>
                    </div>
                  ) : (
                    <Alert
                      message="点击预览按钮查看配置信息"
                      type="info"
                      showIcon
                    />
                  )}
                </Card>
              </Col>
              
              <Col span={12}>
                <Card title="报告样例" size="small">
                  <div
                    style={{
                      height: 200,
                      background: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed #d9d9d9',
                    }}
                  >
                    <div style={{ textAlign: 'center', color: '#666' }}>
                      <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                      <div>报告预览图</div>
                      <div style={{ fontSize: 12, marginTop: 8 }}>
                        实际报告将包含详细的图表和数据分析
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Space size="large">
                <Button onClick={() => setCurrentStep(1)}>
                  返回配置
                </Button>
                <Button
                  icon={<EyeOutlined />}
                  onClick={handlePreview}
                >
                  生成预览
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleGenerate}
                  loading={generating}
                  disabled={!previewData}
                >
                  {generating ? '正在生成...' : '生成报告'}
                </Button>
              </Space>
            </div>

            {generating && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text>正在生成报告，请稍候...</Text>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReportConfig;