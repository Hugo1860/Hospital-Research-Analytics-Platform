import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Space,
  Table,
  Tag,
  Popconfirm,
  message,
  Typography,
  Empty,
  Tooltip,
  Select,
  Switch,
  InputNumber,
  Row,
  Col,
  Modal,
  Descriptions,
  Timeline,
  Progress,
  Alert,
  Statistic,
  List,
  Badge,
} from 'antd';
import {
  SettingOutlined,
  TeamOutlined,
  MonitorOutlined,
  FileTextOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { systemService, SystemConfig, Department, SystemLog, SystemStatus } from '../services/systemService';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

// 使用从 systemService 导入的类型

/**
 * 系统配置页面
 */
const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('config');
  const [loading, setLoading] = useState(false);
  
  // 系统配置相关状态
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
  const [configForm] = Form.useForm();
  
  // 科室管理相关状态
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);
  const [departmentForm] = Form.useForm();
  
  // 系统监控相关状态
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [logLevel, setLogLevel] = useState<string>('');

  // 初始化数据
  useEffect(() => {
    loadSystemConfigs();
    loadDepartments();
    loadSystemStatus();
    loadSystemLogs();
  }, []);

  // 加载系统配置
  const loadSystemConfigs = async () => {
    setLoading(true);
    try {
      const configs = await systemService.getSystemConfigs();
      setSystemConfigs(configs);
      
      // 设置表单初始值
      const initialValues: any = {};
      configs.forEach(config => {
        if (config.type === 'boolean') {
          initialValues[config.key] = config.value === 'true';
        } else if (config.type === 'number') {
          initialValues[config.key] = parseInt(config.value);
        } else {
          initialValues[config.key] = config.value;
        }
      });
      configForm.setFieldsValue(initialValues);
    } catch (error) {
      message.error('加载系统配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存系统配置
  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      setLoading(true);
      
      await systemService.updateSystemConfigs(values);
      
      // 更新配置数据
      const updatedConfigs = systemConfigs.map(config => ({
        ...config,
        value: values[config.key]?.toString() || config.value,
      }));
      setSystemConfigs(updatedConfigs);
      
      message.success('系统配置保存成功');
    } catch (error) {
      message.error('保存配置失败，请检查输入');
    } finally {
      setLoading(false);
    }
  };

  // 加载科室列表
  const loadDepartments = async () => {
    setLoading(true);
    try {
      const departmentList = await systemService.getDepartmentList();
      setDepartments(departmentList);
    } catch (error) {
      message.error('加载科室列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 新增科室
  const handleAddDepartment = () => {
    setSelectedDepartment(null);
    setIsEditingDepartment(false);
    departmentForm.resetFields();
    setDepartmentModalVisible(true);
  };

  // 编辑科室
  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setIsEditingDepartment(true);
    departmentForm.setFieldsValue({
      name: department.name,
      code: department.code,
      description: department.description,
      status: department.status,
    });
    setDepartmentModalVisible(true);
  };

  // 保存科室
  const handleSaveDepartment = async () => {
    try {
      const values = await departmentForm.validateFields();
      setLoading(true);
      
      if (isEditingDepartment && selectedDepartment) {
        // 更新科室
        await systemService.updateDepartment(selectedDepartment.id, values);
        message.success('科室信息更新成功');
      } else {
        // 新增科室
        await systemService.createDepartment(values);
        message.success('科室创建成功');
      }
      
      setDepartmentModalVisible(false);
      departmentForm.resetFields();
      loadDepartments(); // 重新加载科室列表
    } catch (error) {
      message.error('保存失败，请检查输入信息');
    } finally {
      setLoading(false);
    }
  };

  // 删除科室
  const handleDeleteDepartment = async (departmentId: number) => {
    try {
      setLoading(true);
      await systemService.deleteDepartment(departmentId);
      message.success('科室删除成功');
      loadDepartments(); // 重新加载科室列表
    } catch (error) {
      message.error('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载系统状态
  const loadSystemStatus = async () => {
    try {
      const status = await systemService.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      message.error('加载系统状态失败');
    }
  };

  // 加载系统日志
  const loadSystemLogs = async () => {
    try {
      const result = await systemService.getSystemLogs({
        level: logLevel || undefined,
      });
      setSystemLogs(result.data);
    } catch (error) {
      message.error('加载系统日志失败');
    }
  };

  // 获取日志级别图标和颜色
  const getLogLevelConfig = (level: string) => {
    switch (level) {
      case 'info':
        return { icon: <InfoCircleOutlined />, color: 'blue' };
      case 'warn':
        return { icon: <WarningOutlined />, color: 'orange' };
      case 'error':
        return { icon: <CloseCircleOutlined />, color: 'red' };
      default:
        return { icon: <InfoCircleOutlined />, color: 'default' };
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    return status === 'active' ? 
      <Tag color="success">启用</Tag> : 
      <Tag color="default">禁用</Tag>;
  };

  // 获取连接状态标签
  const getConnectionStatus = (status: string) => {
    return status === 'connected' ? 
      <Tag color="success" icon={<CheckCircleOutlined />}>已连接</Tag> : 
      <Tag color="error" icon={<CloseCircleOutlined />}>未连接</Tag>;
  };

  // 渲染配置表单项
  const renderConfigItem = (config: SystemConfig) => {
    switch (config.type) {
      case 'boolean':
        return (
          <Form.Item
            key={config.key}
            name={config.key}
            label={config.name}
            valuePropName="checked"
            tooltip={config.description}
          >
            <Switch />
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item
            key={config.key}
            name={config.key}
            label={config.name}
            tooltip={config.description}
            rules={[{ required: true, message: `请输入${config.name}` }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        );
      case 'select':
        return (
          <Form.Item
            key={config.key}
            name={config.key}
            label={config.name}
            tooltip={config.description}
            rules={[{ required: true, message: `请选择${config.name}` }]}
          >
            <Select>
              {config.options?.map(option => (
                <Option key={option} value={option}>{option}</Option>
              ))}
            </Select>
          </Form.Item>
        );
      default:
        return (
          <Form.Item
            key={config.key}
            name={config.key}
            label={config.name}
            tooltip={config.description}
            rules={[{ required: true, message: `请输入${config.name}` }]}
          >
            <Input />
          </Form.Item>
        );
    }
  };

  // 科室表格列定义
  const departmentColumns = [
    {
      title: '科室名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '科室代码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      key: 'userCount',
      render: (count: number) => <Badge count={count} style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: '文献数',
      dataIndex: 'publicationCount',
      key: 'publicationCount',
      render: (count: number) => <Badge count={count} style={{ backgroundColor: '#1890ff' }} />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Department) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditDepartment(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这个科室吗？"
              onConfirm={() => handleDeleteDepartment(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 按类别分组配置项
  const configsByCategory = systemConfigs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, SystemConfig[]>);

  // 过滤后的日志
  const filteredLogs = logLevel ? 
    systemLogs.filter(log => log.level === logLevel) : 
    systemLogs;

  return (
    <div>
      <Card
        title={
          <Space>
            <SettingOutlined />
            系统设置
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 系统配置 */}
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                系统配置
              </span>
            }
            key="config"
          >
            <Form
              form={configForm}
              layout="vertical"
              onFinish={handleSaveConfig}
            >
              {Object.entries(configsByCategory).map(([category, configs]) => (
                <Card
                  key={category}
                  title={category}
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <Row gutter={24}>
                    {configs.map(config => (
                      <Col span={12} key={config.key}>
                        {renderConfigItem(config)}
                      </Col>
                    ))}
                  </Row>
                </Card>
              ))}
              
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                >
                  保存配置
                </Button>
              </div>
            </Form>
          </TabPane>

          {/* 科室管理 */}
          <TabPane
            tab={
              <span>
                <TeamOutlined />
                科室管理
              </span>
            }
            key="departments"
          >
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddDepartment}
              >
                新增科室
              </Button>
            </div>

            <Table
              columns={departmentColumns}
              dataSource={departments}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>

          {/* 系统监控 */}
          <TabPane
            tab={
              <span>
                <MonitorOutlined />
                系统监控
              </span>
            }
            key="monitor"
          >
            {systemStatus && (
              <div>
                {/* 系统状态概览 */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="CPU 使用率"
                        value={systemStatus.cpu}
                        suffix="%"
                        valueStyle={{ color: systemStatus.cpu > 80 ? '#cf1322' : '#3f8600' }}
                      />
                      <Progress
                        percent={systemStatus.cpu}
                        strokeColor={systemStatus.cpu > 80 ? '#ff4d4f' : '#52c41a'}
                        showInfo={false}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="内存使用率"
                        value={systemStatus.memory}
                        suffix="%"
                        valueStyle={{ color: systemStatus.memory > 80 ? '#cf1322' : '#3f8600' }}
                      />
                      <Progress
                        percent={systemStatus.memory}
                        strokeColor={systemStatus.memory > 80 ? '#ff4d4f' : '#52c41a'}
                        showInfo={false}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="磁盘使用率"
                        value={systemStatus.disk}
                        suffix="%"
                        valueStyle={{ color: systemStatus.disk > 80 ? '#cf1322' : '#3f8600' }}
                      />
                      <Progress
                        percent={systemStatus.disk}
                        strokeColor={systemStatus.disk > 80 ? '#ff4d4f' : '#52c41a'}
                        showInfo={false}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="运行时间"
                        value={systemStatus.uptime}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 服务状态 */}
                <Card title="服务状态" style={{ marginBottom: 24 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, marginBottom: 8 }}>数据库</div>
                        {getConnectionStatus(systemStatus.database)}
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, marginBottom: 8 }}>Redis</div>
                        {getConnectionStatus(systemStatus.redis)}
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, marginBottom: 8 }}>系统版本</div>
                        <Tag color="blue">{systemStatus.version}</Tag>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </div>
            )}
          </TabPane>

          {/* 系统日志 */}
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                系统日志
              </span>
            }
            key="logs"
          >
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Select
                  placeholder="选择日志级别"
                  value={logLevel}
                  onChange={setLogLevel}
                  style={{ width: 150 }}
                  allowClear
                >
                  <Option value="info">信息</Option>
                  <Option value="warn">警告</Option>
                  <Option value="error">错误</Option>
                </Select>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadSystemLogs}
                >
                  刷新
                </Button>
              </Space>
            </div>

            <List
              dataSource={filteredLogs}
              renderItem={(log) => {
                const { icon, color } = getLogLevelConfig(log.level);
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <div style={{ color, fontSize: 16 }}>
                          {icon}
                        </div>
                      }
                      title={
                        <Space>
                          <Tag color={color}>{log.level.toUpperCase()}</Tag>
                          <span>{log.message}</span>
                          <Text type="secondary">[{log.module}]</Text>
                        </Space>
                      }
                      description={
                        <div>
                          <div>{log.details}</div>
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              {log.createdAt}
                              {log.username && ` | 用户: ${log.username}`}
                            </Text>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条日志`,
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 科室编辑模态框 */}
      <Modal
        title={isEditingDepartment ? '编辑科室' : '新增科室'}
        open={departmentModalVisible}
        onOk={handleSaveDepartment}
        onCancel={() => setDepartmentModalVisible(false)}
        confirmLoading={loading}
      >
        <Form
          form={departmentForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="科室名称"
            rules={[
              { required: true, message: '请输入科室名称' },
              { max: 50, message: '科室名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入科室名称" />
          </Form.Item>
          
          <Form.Item
            name="code"
            label="科室代码"
            rules={[
              { required: true, message: '请输入科室代码' },
              { pattern: /^[A-Z_]+$/, message: '科室代码只能包含大写字母和下划线' },
              { max: 20, message: '科室代码不能超过20个字符' },
            ]}
          >
            <Input placeholder="请输入科室代码（如：CARDIOLOGY）" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="科室描述"
          >
            <TextArea
              placeholder="请输入科室描述"
              rows={3}
              maxLength={200}
            />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemSettings;