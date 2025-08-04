import React, { useState } from 'react';
import {
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  Slider,
  ColorPicker,
  Button,
  Space,
  Divider,
  Typography,
  Card,
  Row,
  Col,
  Tabs,
  InputNumber,
} from 'antd';
import {
  SettingOutlined,
  BgColorsOutlined,
  LineChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';

const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface ChartConfig {
  // 基础配置
  title: {
    show: boolean;
    text: string;
    fontSize: number;
    color: string;
    position: 'left' | 'center' | 'right';
  };
  
  // 图例配置
  legend: {
    show: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
    orient: 'horizontal' | 'vertical';
  };
  
  // 网格配置
  grid: {
    show: boolean;
    left: string;
    right: string;
    top: string;
    bottom: string;
  };
  
  // 坐标轴配置
  xAxis: {
    show: boolean;
    name: string;
    nameColor: string;
    axisLineColor: string;
    splitLineShow: boolean;
    splitLineColor: string;
  };
  
  yAxis: {
    show: boolean;
    name: string;
    nameColor: string;
    axisLineColor: string;
    splitLineShow: boolean;
    splitLineColor: string;
  };
  
  // 数据系列配置
  series: {
    showDataLabels: boolean;
    labelPosition: 'top' | 'inside' | 'outside';
    labelFontSize: number;
    labelColor: string;
    itemBorderWidth: number;
    itemBorderColor: string;
  };
  
  // 动画配置
  animation: {
    enabled: boolean;
    duration: number;
    easing: string;
    delay: number;
  };
  
  // 工具提示配置
  tooltip: {
    show: boolean;
    trigger: 'item' | 'axis';
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
  
  // 颜色配置
  colors: string[];
}

interface ChartConfigPanelProps {
  visible: boolean;
  onClose: () => void;
  config: Partial<ChartConfig>;
  onConfigChange: (config: Partial<ChartConfig>) => void;
  chartType: 'bar' | 'line' | 'pie' | 'mixed';
}

/**
 * 图表配置面板组件
 * 提供图表的详细配置选项
 */
const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
  visible,
  onClose,
  config,
  onConfigChange,
  chartType,
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');

  // 默认配置
  const defaultConfig: ChartConfig = {
    title: {
      show: true,
      text: '图表标题',
      fontSize: 16,
      color: '#333333',
      position: 'center',
    },
    legend: {
      show: true,
      position: 'top',
      orient: 'horizontal',
    },
    grid: {
      show: true,
      left: '3%',
      right: '4%',
      top: '10%',
      bottom: '3%',
    },
    xAxis: {
      show: true,
      name: '',
      nameColor: '#666666',
      axisLineColor: '#d9d9d9',
      splitLineShow: false,
      splitLineColor: '#f0f0f0',
    },
    yAxis: {
      show: true,
      name: '',
      nameColor: '#666666',
      axisLineColor: '#d9d9d9',
      splitLineShow: true,
      splitLineColor: '#f0f0f0',
    },
    series: {
      showDataLabels: false,
      labelPosition: 'top',
      labelFontSize: 12,
      labelColor: '#333333',
      itemBorderWidth: 0,
      itemBorderColor: '#ffffff',
    },
    animation: {
      enabled: true,
      duration: 1000,
      easing: 'cubicOut',
      delay: 0,
    },
    tooltip: {
      show: true,
      trigger: chartType === 'pie' ? 'item' : 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'transparent',
      textColor: '#ffffff',
    },
    colors: [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', 
      '#722ed1', '#13c2c2', '#eb2f96', '#fa541c'
    ],
  };

  // 合并配置
  const currentConfig = { ...defaultConfig, ...config };

  // 处理配置变更
  const handleConfigChange = (changedValues: any, allValues: any) => {
    onConfigChange(allValues);
  };

  // 重置配置
  const handleReset = () => {
    form.setFieldsValue(defaultConfig);
    onConfigChange(defaultConfig);
  };

  // 应用配置
  const handleApply = () => {
    form.validateFields().then(values => {
      onConfigChange(values);
      onClose();
    });
  };

  return (
    <Drawer
      title={
        <Space>
          <SettingOutlined />
          图表配置
        </Space>
      }
      placement="right"
      width={400}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={handleApply}>
            应用
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={currentConfig}
        onValuesChange={handleConfigChange}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 基础配置 */}
          <TabPane tab="基础" key="basic">
            <Card title="标题设置" size="small" style={{ marginBottom: 16 }}>
              <Form.Item name={['title', 'show']} valuePropName="checked">
                <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
              </Form.Item>
              
              <Form.Item name={['title', 'text']} label="标题文本">
                <Input placeholder="请输入图表标题" />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['title', 'fontSize']} label="字体大小">
                    <InputNumber min={10} max={32} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['title', 'position']} label="位置">
                    <Select>
                      <Option value="left">左对齐</Option>
                      <Option value="center">居中</Option>
                      <Option value="right">右对齐</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="图例设置" size="small" style={{ marginBottom: 16 }}>
              <Form.Item name={['legend', 'show']} valuePropName="checked">
                <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['legend', 'position']} label="位置">
                    <Select>
                      <Option value="top">顶部</Option>
                      <Option value="bottom">底部</Option>
                      <Option value="left">左侧</Option>
                      <Option value="right">右侧</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['legend', 'orient']} label="方向">
                    <Select>
                      <Option value="horizontal">水平</Option>
                      <Option value="vertical">垂直</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="网格设置" size="small">
              <Form.Item name={['grid', 'show']} valuePropName="checked">
                <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['grid', 'left']} label="左边距">
                    <Input placeholder="3%" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['grid', 'right']} label="右边距">
                    <Input placeholder="4%" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['grid', 'top']} label="上边距">
                    <Input placeholder="10%" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['grid', 'bottom']} label="下边距">
                    <Input placeholder="3%" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </TabPane>

          {/* 坐标轴配置 */}
          {(chartType === 'bar' || chartType === 'line' || chartType === 'mixed') && (
            <TabPane tab="坐标轴" key="axis">
              <Card title="X轴设置" size="small" style={{ marginBottom: 16 }}>
                <Form.Item name={['xAxis', 'show']} valuePropName="checked">
                  <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
                </Form.Item>
                
                <Form.Item name={['xAxis', 'name']} label="轴名称">
                  <Input placeholder="请输入X轴名称" />
                </Form.Item>
                
                <Form.Item name={['xAxis', 'splitLineShow']} valuePropName="checked">
                  <Switch checkedChildren="显示网格线" unCheckedChildren="隐藏网格线" />
                </Form.Item>
              </Card>

              <Card title="Y轴设置" size="small">
                <Form.Item name={['yAxis', 'show']} valuePropName="checked">
                  <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
                </Form.Item>
                
                <Form.Item name={['yAxis', 'name']} label="轴名称">
                  <Input placeholder="请输入Y轴名称" />
                </Form.Item>
                
                <Form.Item name={['yAxis', 'splitLineShow']} valuePropName="checked">
                  <Switch checkedChildren="显示网格线" unCheckedChildren="隐藏网格线" />
                </Form.Item>
              </Card>
            </TabPane>
          )}

          {/* 数据系列配置 */}
          <TabPane tab="数据" key="series">
            <Card title="数据标签" size="small" style={{ marginBottom: 16 }}>
              <Form.Item name={['series', 'showDataLabels']} valuePropName="checked">
                <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['series', 'labelPosition']} label="标签位置">
                    <Select>
                      <Option value="top">顶部</Option>
                      <Option value="inside">内部</Option>
                      <Option value="outside">外部</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['series', 'labelFontSize']} label="字体大小">
                    <InputNumber min={8} max={24} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="边框设置" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['series', 'itemBorderWidth']} label="边框宽度">
                    <InputNumber min={0} max={5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </TabPane>

          {/* 颜色配置 */}
          <TabPane tab="颜色" key="colors">
            <Card title="配色方案" size="small">
              <Text type="secondary">
                点击颜色块可以自定义颜色
              </Text>
              <Divider />
              
              <Form.List name="colors">
                {(fields, { add, remove }) => (
                  <div>
                    {fields.map((field, index) => (
                      <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
                        <Col span={4}>
                          <Text>颜色 {index + 1}</Text>
                        </Col>
                        <Col span={16}>
                          <Form.Item {...field} noStyle>
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Button 
                            size="small" 
                            danger 
                            onClick={() => remove(field.name)}
                            disabled={fields.length <= 1}
                          >
                            删除
                          </Button>
                        </Col>
                      </Row>
                    ))}
                    
                    {fields.length < 12 && (
                      <Button 
                        type="dashed" 
                        onClick={() => add('#1890ff')} 
                        block
                      >
                        添加颜色
                      </Button>
                    )}
                  </div>
                )}
              </Form.List>
            </Card>
          </TabPane>

          {/* 动画配置 */}
          <TabPane tab="动画" key="animation">
            <Card title="动画设置" size="small">
              <Form.Item name={['animation', 'enabled']} valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
              
              <Form.Item name={['animation', 'duration']} label="动画时长 (ms)">
                <Slider
                  min={0}
                  max={3000}
                  step={100}
                  marks={{
                    0: '0',
                    1000: '1s',
                    2000: '2s',
                    3000: '3s',
                  }}
                />
              </Form.Item>
              
              <Form.Item name={['animation', 'easing']} label="缓动函数">
                <Select>
                  <Option value="linear">线性</Option>
                  <Option value="quadraticIn">二次缓入</Option>
                  <Option value="quadraticOut">二次缓出</Option>
                  <Option value="cubicIn">三次缓入</Option>
                  <Option value="cubicOut">三次缓出</Option>
                  <Option value="elasticOut">弹性缓出</Option>
                </Select>
              </Form.Item>
              
              <Form.Item name={['animation', 'delay']} label="延迟时间 (ms)">
                <InputNumber min={0} max={2000} step={100} style={{ width: '100%' }} />
              </Form.Item>
            </Card>
          </TabPane>
        </Tabs>
      </Form>
    </Drawer>
  );
};

export default ChartConfigPanel;