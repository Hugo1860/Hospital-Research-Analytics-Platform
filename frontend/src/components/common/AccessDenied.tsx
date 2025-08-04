import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LockOutlined, HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';

interface AccessDeniedProps {
  title?: string;
  subTitle?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

/**
 * 访问拒绝页面组件
 */
const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = '访问被拒绝',
  subTitle = '抱歉，您没有权限访问此页面',
  showHomeButton = true,
  showBackButton = true,
  onBack,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const extra = [];

  if (showBackButton) {
    extra.push(
      <Button key="back" onClick={handleBack}>
        <ArrowLeftOutlined />
        返回上页
      </Button>
    );
  }

  if (showHomeButton) {
    extra.push(
      <Button key="home" type="primary" onClick={handleGoHome}>
        <HomeOutlined />
        返回首页
      </Button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '20px',
      }}
    >
      <Result
        status="403"
        title={title}
        subTitle={subTitle}
        icon={<LockOutlined style={{ color: '#ff4d4f' }} />}
        extra={extra}
      />
    </div>
  );
};

export default AccessDenied;