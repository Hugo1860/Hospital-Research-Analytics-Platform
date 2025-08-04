import React from 'react';
import { Result, Button, Card, Timeline, Typography } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

const { Text, Paragraph } = Typography;

interface LocationState {
  username?: string;
  email?: string;
  department?: string;
}

/**
 * 注册成功页面
 */
const RegisterSuccess: React.FC = () => {
  const location = useLocation();
  const state = location.state as LocationState;

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
          width: 600,
          maxWidth: '100%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: 8,
        }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <Result
          status="success"
          title="注册成功！"
          subTitle="您的账户已成功创建，请等待管理员审核激活。"
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        />

        {state && (
          <div style={{ marginBottom: 32 }}>
            <Text strong style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
              注册信息：
            </Text>
            <div style={{ background: '#f6f8fa', padding: 16, borderRadius: 6 }}>
              {state.username && (
                <div style={{ marginBottom: 8 }}>
                  <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  <Text>用户名：{state.username}</Text>
                </div>
              )}
              {state.email && (
                <div style={{ marginBottom: 8 }}>
                  <Text>邮箱：{state.email}</Text>
                </div>
              )}
              {state.department && (
                <div>
                  <Text>科室：{state.department}</Text>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 32 }}>
          <Text strong style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
            接下来的步骤：
          </Text>
          <Timeline
            items={[
              {
                dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                children: (
                  <div>
                    <Text strong>账户创建完成</Text>
                    <br />
                    <Text type="secondary">您的注册信息已提交</Text>
                  </div>
                ),
              },
              {
                dot: <ClockCircleOutlined style={{ color: '#faad14' }} />,
                children: (
                  <div>
                    <Text strong>等待管理员审核</Text>
                    <br />
                    <Text type="secondary">管理员将在1-2个工作日内审核您的申请</Text>
                  </div>
                ),
              },
              {
                dot: <ClockCircleOutlined style={{ color: '#d9d9d9' }} />,
                children: (
                  <div>
                    <Text strong>账户激活</Text>
                    <br />
                    <Text type="secondary">审核通过后，您将收到激活通知邮件</Text>
                  </div>
                ),
              },
              {
                dot: <ClockCircleOutlined style={{ color: '#d9d9d9' }} />,
                children: (
                  <div>
                    <Text strong>开始使用</Text>
                    <br />
                    <Text type="secondary">使用注册的用户名和密码登录系统</Text>
                  </div>
                ),
              },
            ]}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link to="/login">
            <Button type="primary" size="large">
              返回登录
            </Button>
          </Link>
        </div>

        <div
          style={{
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: 6,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <Paragraph style={{ margin: 0, color: '#0050b3' }}>
            <strong>需要帮助？</strong>
            <br />
            如有疑问，请联系系统管理员或发送邮件至 admin@hospital.com
          </Paragraph>
        </div>
      </Card>
    </div>
  );
};

export default RegisterSuccess;