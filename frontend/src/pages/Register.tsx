import React, { useState } from 'react';
import { Form, Input, Button, Card, Select, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { formRules } from '../utils/validators';
import DepartmentSelect from '../components/common/DepartmentSelect';
import PasswordStrengthIndicator from '../components/common/PasswordStrengthIndicator';
import { checkUsernameAvailability, checkEmailAvailability } from '../utils/userValidation';

const { Option } = Select;

interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  role: string;
  departmentId?: number;
}

const Register: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // 处理注册提交
  const handleSubmit = async (values: RegisterForm) => {
    setLoading(true);
    try {
      await authAPI.register({
        username: values.username,
        password: values.password,
        email: values.email,
        role: values.role,
        departmentId: values.departmentId,
      });
      
      // 跳转到注册成功页面，传递用户信息
      navigate('/register-success', {
        state: {
          username: values.username,
          email: values.email,
          // 这里可以添加科室名称，需要从departments中查找
        },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '注册失败，请重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 检查用户名是否可用
  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setUsernameChecking(true);
    try {
      const available = await checkUsernameAvailability(username);
      setUsernameAvailable(available);
      
      if (!available) {
        message.warning('用户名已存在，请选择其他用户名');
      }
    } catch (error) {
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  // 检查邮箱是否可用
  const checkEmail = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }
    
    setEmailChecking(true);
    try {
      const available = await checkEmailAvailability(email);
      setEmailAvailable(available);
      
      if (!available) {
        message.warning('邮箱已被注册，请使用其他邮箱');
      }
    } catch (error) {
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: 480,
          maxWidth: '100%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: 8,
        }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#1890ff',
              margin: 0,
            }}
          >
            用户注册
          </h1>
          <p
            style={{
              color: '#666',
              marginTop: 8,
              fontSize: 14,
            }}
          >
            创建您的账户
          </p>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              formRules.required,
              formRules.username,
              {
                validator: async (_, value) => {
                  if (value && usernameAvailable === false) {
                    return Promise.reject(new Error('用户名已存在'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              suffix={
                usernameChecking ? (
                  <div style={{ color: '#1890ff' }}>检查中...</div>
                ) : usernameAvailable === true ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : usernameAvailable === false ? (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                ) : null
              }
              placeholder="请输入用户名"
              autoComplete="username"
              onBlur={(e) => checkUsername(e.target.value)}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              formRules.required,
              formRules.email,
              {
                validator: async (_, value) => {
                  if (value && emailAvailable === false) {
                    return Promise.reject(new Error('邮箱已被注册'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              suffix={
                emailChecking ? (
                  <div style={{ color: '#1890ff' }}>检查中...</div>
                ) : emailAvailable === true ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : emailAvailable === false ? (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                ) : null
              }
              placeholder="请输入邮箱地址"
              autoComplete="email"
              onBlur={(e) => checkEmail(e.target.value)}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              formRules.required,
              formRules.password,
            ]}
          >
            <div>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthIndicator password={password} />
            </div>
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              formRules.required,
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入密码"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="用户角色"
            rules={[formRules.required]}
            initialValue="user"
          >
            <Select placeholder="请选择用户角色">
              <Option value="user">普通用户</Option>
              <Option value="department_admin">科室管理员</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="departmentId"
            label="所属科室"
            rules={[formRules.required]}
          >
            <DepartmentSelect placeholder="请选择所属科室" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                width: '100%',
                height: 40,
                fontSize: 16,
              }}
            >
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#666' }}>已有账户？</span>
            <Link
              to="/login"
              style={{
                color: '#1890ff',
                marginLeft: 8,
                textDecoration: 'none',
              }}
            >
              立即登录
            </Link>
          </div>
        </Form>

        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            padding: 16,
            background: '#f6f8fa',
            borderRadius: 6,
            color: '#666',
            fontSize: 12,
          }}
        >
          <p style={{ margin: 0, marginBottom: 4 }}>
            <strong>注册说明：</strong>
          </p>
          <p style={{ margin: 0 }}>
            注册后需要管理员审核激活账户，如需帮助请联系系统管理员
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;