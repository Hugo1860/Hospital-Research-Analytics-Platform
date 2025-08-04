import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 如果已经登录，重定向到目标页面
  useEffect(() => {
    if (state.isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [state.isAuthenticated, navigate, location]);

  // 处理登录提交
  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);
    try {
      const success = await login(values.username, values.password);
      if (success) {
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (error) {
      // 错误已在AuthContext中处理
    } finally {
      setLoading(false);
    }
  };

  // 如果正在初始化认证状态，显示加载
  if (state.isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <Spin size="large" tip="初始化中..." />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: 8,
        }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: '#1890ff',
            margin: 0,
          }}>
            协和医院SCI期刊分析系统
          </h1>
          <p style={{ 
            color: '#666', 
            marginTop: 8,
            fontSize: 14,
          }}>
            请登录您的账户
          </p>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
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
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ color: '#666', fontSize: 14 }}>还没有账户？</span>
            <a
              href="/register"
              style={{
                color: '#1890ff',
                marginLeft: 8,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              立即注册
            </a>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <a
              href="/forgot-password"
              style={{
                color: '#1890ff',
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              忘记密码？
            </a>
          </div>
        </div>

        <div style={{ 
          textAlign: 'center', 
          marginTop: 24,
          color: '#666',
          fontSize: 12,
        }}>
          <p style={{ color: '#1890ff', fontWeight: 'bold' }}>演示账户：admin / password123</p>
          <p>后端服务未启动时，请使用演示账户登录查看界面效果</p>
          <p>如需帮助，请联系系统管理员</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;