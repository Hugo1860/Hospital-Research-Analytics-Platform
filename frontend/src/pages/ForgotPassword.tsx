import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { formRules } from '../utils/validators';

interface ForgotPasswordForm {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // 处理忘记密码提交
  const handleSubmit = async (values: ForgotPasswordForm) => {
    setLoading(true);
    try {
      // 这里应该调用忘记密码API
      // await authAPI.forgotPassword(values.email);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEmailSent(true);
      message.success('重置密码邮件已发送');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '发送失败，请重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
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
            width: 450,
            maxWidth: '100%',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: 8,
          }}
          styles={{ body: { padding: '40px 32px' } }}
        >
          <Result
            status="success"
            title="邮件已发送"
            subTitle="我们已向您的邮箱发送了重置密码的链接，请查收邮件并按照说明操作。"
            extra={[
              <Link key="login" to="/login">
                <Button type="primary">
                  <ArrowLeftOutlined />
                  返回登录
                </Button>
              </Link>,
            ]}
          />
          
          <div
            style={{
              textAlign: 'center',
              marginTop: 24,
              color: '#666',
              fontSize: 12,
            }}
          >
            <p>如果您没有收到邮件，请检查垃圾邮件文件夹</p>
            <p>或联系系统管理员获取帮助</p>
          </div>
        </Card>
      </div>
    );
  }

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
          width: 400,
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
            忘记密码
          </h1>
          <p
            style={{
              color: '#666',
              marginTop: 8,
              fontSize: 14,
            }}
          >
            输入您的邮箱地址，我们将发送重置密码链接
          </p>
        </div>

        <Form
          form={form}
          name="forgotPassword"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              formRules.required,
              formRules.email,
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入您的邮箱地址"
              autoComplete="email"
            />
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
              发送重置链接
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Link
              to="/login"
              style={{
                color: '#1890ff',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <ArrowLeftOutlined style={{ marginRight: 4 }} />
              返回登录
            </Link>
          </div>
        </Form>

        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            color: '#666',
            fontSize: 12,
          }}
        >
          <p>如需帮助，请联系系统管理员</p>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;