import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Typography,
  Empty,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Modal,
  Form,
  Switch,
  Tabs,
  Badge,
  Avatar,
  Descriptions,
  Timeline,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  HistoryOutlined,
  TeamOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import DepartmentSelect from '../components/common/DepartmentSelect';
import { userService, User, OperationLog } from '../services/userService';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// 使用从 userService 导入的类型

/**
 * 用户管理页面
 */
const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    keyword: '',
    role: '',
    status: '',
    departmentId: '',
    dateRange: null as any,
  });

  // 初始化数据
  useEffect(() => {
    loadUsers();
  }, [pagination.current, pagination.pageSize, filters]);

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        keyword: filters.keyword || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        departmentId: filters.departmentId || undefined,
        startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      const result = await userService.getUserList(params);
      setUsers(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.total,
      }));
    } catch (error) {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取角色标签
  const getRoleTag = (role: string) => {
    switch (role) {
      case 'admin':
        return <Tag color="red">系统管理员</Tag>;
      case 'department_admin':
        return <Tag color="blue">科室管理员</Tag>;
      case 'user':
        return <Tag color="green">普通用户</Tag>;
      default:
        return <Tag>未知角色</Tag>;
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
        return <Tag color="success">正常</Tag>;
      case 'inactive':
        return <Tag color="warning">未激活</Tag>;
      case 'locked':
        return <Tag color="error">已锁定</Tag>;
      default:
        return <Tag>未知状态</Tag>;
    }
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge status="success" />;
      case 'inactive':
        return <Badge status="warning" />;
      case 'locked':
        return <Badge status="error" />;
      default:
        return <Badge status="default" />;
    }
  };

  // 新增用户
  const handleAddUser = () => {
    setSelectedUser(null);
    setIsEditing(false);
    form.resetFields();
    setUserModalVisible(true);
  };

  // 编辑用户
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditing(true);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      status: user.status,
    });
    setUserModalVisible(true);
  };

  // 保存用户
  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      
      if (isEditing && selectedUser) {
        // 更新用户
        await userService.updateUser(selectedUser.id, values);
        message.success('用户信息更新成功');
      } else {
        // 新增用户
        await userService.createUser({
          ...values,
          password: 'temp123456', // 临时密码
        });
        message.success('用户创建成功');
      }
      
      setUserModalVisible(false);
      form.resetFields();
      loadUsers(); // 重新加载用户列表
    } catch (error) {
      message.error('保存失败，请检查输入信息');
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      message.success('用户删除成功');
      loadUsers(); // 重新加载用户列表
    } catch (error) {
      message.error('删除失败，请重试');
    }
  };

  // 锁定/解锁用户
  const handleToggleUserStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'locked' ? 'active' : 'locked';
      await userService.toggleUserStatus(user.id, newStatus);
      message.success(`用户${newStatus === 'locked' ? '锁定' : '解锁'}成功`);
      loadUsers(); // 重新加载用户列表
    } catch (error) {
      message.error('操作失败，请重试');
    }
  };

  // 查看用户操作日志
  const handleViewUserLogs = async (user: User) => {
    setSelectedUser(user);
    try {
      const result = await userService.getUserOperationLogs(user.id);
      setOperationLogs(result.data);
      setLogModalVisible(true);
    } catch (error) {
      message.error('加载操作日志失败');
    }
  };

  // 导出用户列表
  const handleExportUsers = async () => {
    setExportLoading(true);
    try {
      const params = {
        keyword: filters.keyword || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        departmentId: filters.departmentId || undefined,
        startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      await userService.exportUserList(params);
    } catch (error) {
      message.error('导出失败，请重试');
    } finally {
      setExportLoading(false);
    }
  };

  // 处理筛选条件变化
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 })); // 重置到第一页
  };

  // 处理分页变化
  const handleTableChange = (paginationConfig: any) => {
    setPagination(prev => ({
      ...prev,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    }));
  };

  const columns = [
    {
      title: '用户信息',
      key: 'userInfo',
      render: (_: any, record: User) => (
        <Space>
          <Avatar 
            size="large" 
            icon={<UserOutlined />} 
            src={record.avatar}
            style={{ backgroundColor: record.status === 'active' ? '#87d068' : '#f56a00' }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {getStatusBadge(record.status)}
              {record.username}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {record.email}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => getRoleTag(role),
    },
    {
      title: '所属科室',
      dataIndex: 'departmentName',
      key: 'departmentName',
      render: (departmentName: string) => departmentName || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (lastLoginAt: string) => lastLoginAt || '从未登录',
    },
    {
      title: '登录次数',
      dataIndex: 'loginCount',
      key: 'loginCount',
      render: (count: number) => (
        <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a: User, b: User) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          <Tooltip title="查看日志">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleViewUserLogs(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 'locked' ? '解锁' : '锁定'}>
            <Button
              type="text"
              icon={record.status === 'locked' ? <UnlockOutlined /> : <LockOutlined />}
              onClick={() => handleToggleUserStatus(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这个用户吗？"
              onConfirm={() => handleDeleteUser(record.id)}
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

  return (
    <div>
      <Card
        title={
          <Space>
            <TeamOutlined />
            用户管理
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExportUsers}
              loading={exportLoading}
            >
              导出
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddUser}
            >
              新增用户
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadUsers}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        {/* 筛选条件 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={5}>
            <Search
              placeholder="搜索用户名或邮箱"
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
            />
          </Col>
          <Col span={3}>
            <Select
              placeholder="角色"
              value={filters.role}
              onChange={(value) => handleFilterChange('role', value)}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="admin">系统管理员</Option>
              <Option value="department_admin">科室管理员</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="状态"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="active">正常</Option>
              <Option value="inactive">未激活</Option>
              <Option value="locked">已锁定</Option>
            </Select>
          </Col>
          <Col span={4}>
            <DepartmentSelect
              placeholder="所属科室"
              value={filters.departmentId}
              onChange={(value) => handleFilterChange('departmentId', value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col span={5}>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {users.length}
                </div>
                <div>总用户数</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {users.filter(u => u.status === 'active').length}
                </div>
                <div>正常用户</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                  {users.filter(u => u.role === 'department_admin').length}
                </div>
                <div>科室管理员</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                  {users.filter(u => u.status === 'locked').length}
                </div>
                <div>已锁定</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 用户列表 */}
        {users.length > 0 ? (
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            onChange={handleTableChange}
          />
        ) : (
          <Empty
            description="暂无用户记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* 用户编辑模态框 */}
      <Modal
        title={isEditing ? '编辑用户' : '新增用户'}
        open={userModalVisible}
        onOk={handleSaveUser}
        onCancel={() => setUserModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 2, max: 20, message: '用户名长度为2-20个字符' },
                ]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  <Option value="admin">系统管理员</Option>
                  <Option value="department_admin">科室管理员</Option>
                  <Option value="user">普通用户</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="departmentId"
                label="所属科室"
                rules={[
                  {
                    validator: (_, value) => {
                      const role = form.getFieldValue('role');
                      if ((role === 'department_admin' || role === 'user') && !value) {
                        return Promise.reject(new Error('科室管理员和普通用户必须选择所属科室'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <DepartmentSelect placeholder="请选择所属科室" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">正常</Option>
              <Option value="inactive">未激活</Option>
              <Option value="locked">已锁定</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 操作日志模态框 */}
      <Modal
        title={`${selectedUser?.username} 的操作日志`}
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setLogModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {operationLogs.length > 0 ? (
          <Timeline>
            {operationLogs.map((log) => (
              <Timeline.Item
                key={log.id}
                color={log.status === 'success' ? 'green' : 'red'}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {log.action}
                    <Tag 
                      color={log.status === 'success' ? 'success' : 'error'}
                      style={{ marginLeft: 8 }}
                    >
                      {log.status === 'success' ? '成功' : '失败'}
                    </Tag>
                  </div>
                  <div style={{ color: '#666', fontSize: '12px', marginTop: 4 }}>
                    {log.details}
                  </div>
                  <div style={{ color: '#999', fontSize: '11px', marginTop: 4 }}>
                    时间: {log.createdAt} | IP: {log.ip}
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Empty description="暂无操作日志" />
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;