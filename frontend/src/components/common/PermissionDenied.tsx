/**
 * 权限不足页面组件
 */

import React from 'react';
import { Result, Button, Card, Typography } from 'antd';
import { LockOutlined, HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Text, Paragraph } = Typography;

interface PermissionDeniedProps {
  title?: string;
  subTitle?: string;
  requiredRoles?: string[];
  requiredPermissions?: Array<{ resource: string; action: string }>;
  showDetails?: boolean;
  onBack?: () => void;
  onHome?: () => void;
}

const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  title = "访问被拒绝",
  subTitle = "您没有访问此资源的权限",
  requiredRoles,
  requiredPermissions,
  showDetails = true,
  onBack,
  onHome,
}) => {
  const { state } = useAuth();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      window.location.href = '/dashboard';
    }
  };

  const renderDetails = () => {
    if (!showDetails) return null;

    return (
      <Card 
        size="small" 
        style={{ 
          textAlign: 'left', 
          maxWidth: 500, 
          margin: '0 auto',
          background: '#fafafa'
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <Text strong>当前用户信息：</Text>
        </div>
        <Paragraph style={{ marginBottom: 8 }}>
          <Text>用户名：</Text>
          <Text code>{state.user?.username || '未知'}</Text>
        </Paragraph>
        <Paragraph style={{ marginBottom: 8 }}>
          <Text>角色：</Text>
          <Text code>{state.user?.role || '未知'}</Text>
        </Paragraph>
        {state.user?.department && (
          <Paragraph style={{ marginBottom: 8 }}>
            <Text>科室：</Text>
            <Text code>{state.user.department.name}</Text>
          </Paragraph>
        )}

        {requiredRoles && requiredRoles.length > 0 && (
          <>
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <Text strong>需要角色：</Text>
            </div>
            <Paragraph>
              <Text code>{requiredRoles.join(' 或 ')}</Text>
            </Paragraph>
          </>
        )}

        {requiredPermissions && requiredPermissions.length > 0 && (
          <>
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <Text strong>需要权限：</Text>
            </div>
            <ul style={{ marginLeft: 16 }}>
              {requiredPermissions.map(({ resource, action }, index) => (
                <li key={index}>
                  <Text code>{resource}:{action}</Text>
                </li>
              ))}
            </ul>
          </>
        )}

        <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
          <Text type="secondary">
            💡 如需访问此功能，请联系系统管理员申请相应权限
          </Text>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '50px 20px', minHeight: '60vh' }}>
      <Result
        status="403"
        title={title}
        subTitle={subTitle}
        icon={<LockOutlined style={{ color: '#faad14' }} />}
        extra={[
          <div key="details" style={{ marginBottom: 24 }}>
            {renderDetails()}
          </div>,
          <div key="actions" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
            >
              返回上一页
            </Button>
            <Button 
              type="primary" 
              icon={<HomeOutlined />} 
              onClick={handleHome}
            >
              返回首页
            </Button>
          </div>
        ]}
      />
    </div>
  );
};

export default PermissionDenied;