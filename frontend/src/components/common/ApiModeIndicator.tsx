import React from 'react';
import { Tag, Tooltip, Button, Space, Alert } from 'antd';
import {
  CloudOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { useApiMode } from '../../hooks/useApiMode';

interface ApiModeIndicatorProps {
  showSwitchButton?: boolean;
  showDetails?: boolean;
  size?: 'small' | 'default' | 'large';
}

const ApiModeIndicator: React.FC<ApiModeIndicatorProps> = ({
  showSwitchButton = false,
  showDetails = false,
  size = 'default'
}) => {
  const {
    mode,
    status,
    isLoading,
    isRealApiMode,
    isDemoMode,
    switchToRealApi,
    refresh
  } = useApiMode();

  const getModeIcon = () => {
    if (isRealApiMode) {
      return status?.isAvailable ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />;
    }
    return <ExperimentOutlined />;
  };

  const getModeColor = () => {
    if (isRealApiMode) {
      return status?.isAvailable ? 'green' : 'red';
    }
    return 'orange';
  };

  const getModeText = () => {
    if (isRealApiMode) {
      return status?.isAvailable ? '真实API' : 'API异常';
    }
    return '演示模式';
  };

  const getTooltipContent = () => {
    if (isDemoMode) {
      return (
        <div>
          <div>当前运行在演示模式</div>
          <div>部分功能使用模拟数据</div>
          {showSwitchButton && <div>点击切换到真实API</div>}
        </div>
      );
    }

    if (status) {
      return (
        <div>
          <div>API状态: {status.isAvailable ? '正常' : '异常'}</div>
          <div>最后检查: {new Date(status.lastChecked).toLocaleTimeString()}</div>
          {status.error && <div>错误: {status.error}</div>}
          {status.services && (
            <div>
              服务状态:
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>数据库: {status.services.database || '未知'}</li>
                <li>认证: {status.services.auth || '未知'}</li>
                <li>文件系统: {status.services.filesystem || '未知'}</li>
              </ul>
            </div>
          )}
        </div>
      );
    }

    return '正在检查API状态...';
  };

  const handleSwitchToReal = async () => {
    const success = await switchToRealApi();
    if (!success) {
      // 错误处理已在hook中完成
    }
  };

  return (
    <Space size="small">
      <Tooltip title={getTooltipContent()} placement="bottomRight">
        <Tag
          icon={getModeIcon()}
          color={getModeColor()}
          style={{ cursor: 'pointer' }}
          onClick={refresh}
        >
          {getModeText()}
        </Tag>
      </Tooltip>

      {showSwitchButton && isDemoMode && (
        <Button
          type="link"
          size="small"
          icon={<SwapOutlined />}
          onClick={handleSwitchToReal}
          loading={isLoading}
        >
          切换到真实API
        </Button>
      )}

      <Button
        type="text"
        size="small"
        icon={<ReloadOutlined />}
        onClick={refresh}
        loading={isLoading}
        title="刷新API状态"
      />

      {showDetails && status && !status.isAvailable && (
        <Alert
          message="API服务不可用"
          description={status.error}
          type="warning"
          showIcon
          closable
          style={{ marginTop: 8 }}
          action={
            <Button size="small" onClick={handleSwitchToReal} loading={isLoading}>
              重试连接
            </Button>
          }
        />
      )}
    </Space>
  );
};

export default ApiModeIndicator;