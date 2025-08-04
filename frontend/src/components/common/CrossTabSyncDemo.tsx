/**
 * 跨标签页状态同步演示组件
 * 用于测试和演示跨标签页认证状态同步功能
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Alert, Typography, Divider, Tag, Timeline } from 'antd';
import { 
  LoginOutlined, 
  LogoutOutlined, 
  SyncOutlined, 
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import TokenManager from '../../utils/tokenManager';

const { Title, Text, Paragraph } = Typography;

interface SyncEvent {
  id: string;
  timestamp: number;
  type: string;
  source: string;
  description: string;
  data?: any;
}

const CrossTabSyncDemo: React.FC = () => {
  const { state, login, logout } = useAuth();
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [isListening, setIsListening] = useState(false);

  // 监听跨标签页同步事件
  useEffect(() => {
    const handleTokenEvent = (eventType: string, data?: any) => {
      const event: SyncEvent = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: eventType,
        source: data?.source || 'unknown',
        description: getEventDescription(eventType, data),
        data
      };

      setSyncEvents(prev => [event, ...prev.slice(0, 19)]); // 保留最近20个事件
    };

    if (isListening) {
      TokenManager.addEventListener(handleTokenEvent);
    }

    return () => {
      TokenManager.removeEventListener(handleTokenEvent);
    };
  }, [isListening]);

  const getEventDescription = (eventType: string, data?: any): string => {
    switch (eventType) {
      case 'token_updated':
        return data?.source === 'cross_tab' 
          ? '检测到其他标签页登录' 
          : '本标签页登录/token更新';
      case 'token_removed':
        return data?.source === 'cross_tab' 
          ? '检测到其他标签页登出' 
          : '本标签页登出';
      case 'token_expired':
        return data?.source === 'cross_tab' 
          ? '检测到其他标签页token过期' 
          : '本标签页token过期';
      case 'user_updated':
        return data?.source === 'cross_tab' 
          ? '检测到其他标签页用户信息更新' 
          : '本标签页用户信息更新';
      default:
        return `未知事件: ${eventType}`;
    }
  };

  const getEventIcon = (type: string, source: string) => {
    if (source === 'cross_tab') {
      switch (type) {
        case 'token_updated':
          return <LoginOutlined style={{ color: '#52c41a' }} />;
        case 'token_removed':
          return <LogoutOutlined style={{ color: '#ff4d4f' }} />;
        case 'token_expired':
          return <ClockCircleOutlined style={{ color: '#faad14' }} />;
        case 'user_updated':
          return <UserOutlined style={{ color: '#1890ff' }} />;
        default:
          return <ExclamationCircleOutlined style={{ color: '#666' }} />;
      }
    } else {
      return <CheckCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const handleDemoLogin = async () => {
    await login('admin', 'password123');
  };

  const handleDemoLogout = () => {
    logout();
  };

  const clearEvents = () => {
    setSyncEvents([]);
  };

  const toggleListening = () => {
    setIsListening(!isListening);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <SyncOutlined />
            跨标签页状态同步演示
          </Space>
        }
        extra={
          <Space>
            <Button 
              type={isListening ? 'primary' : 'default'}
              onClick={toggleListening}
              icon={<SyncOutlined spin={isListening} />}
            >
              {isListening ? '停止监听' : '开始监听'}
            </Button>
            <Button onClick={clearEvents}>
              清除事件
            </Button>
          </Space>
        }
      >
        <Alert
          message="使用说明"
          description={
            <div>
              <p>1. 点击"开始监听"按钮开始监听跨标签页同步事件</p>
              <p>2. 在当前标签页进行登录/登出操作，或在其他标签页进行相同操作</p>
              <p>3. 观察下方的事件日志，查看跨标签页状态同步的实时效果</p>
              <p>4. 绿色图标表示来自其他标签页的事件，蓝色图标表示本标签页的事件</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Divider>当前认证状态</Divider>
        
        <div style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>认证状态: </Text>
              <Tag color={state.isAuthenticated ? 'green' : 'red'}>
                {state.isAuthenticated ? '已登录' : '未登录'}
              </Tag>
            </div>
            
            {state.user && (
              <>
                <div>
                  <Text strong>用户名: </Text>
                  <Text code>{state.user.username}</Text>
                </div>
                <div>
                  <Text strong>角色: </Text>
                  <Tag color="blue">{state.user.role}</Tag>
                </div>
                <div>
                  <Text strong>科室: </Text>
                  <Text>{state.user.department?.name || '无'}</Text>
                </div>
              </>
            )}
            
            <div>
              <Text strong>Token有效性: </Text>
              <Tag color={TokenManager.isTokenValid() ? 'green' : 'red'}>
                {TokenManager.isTokenValid() ? '有效' : '无效'}
              </Tag>
            </div>
            
            {TokenManager.getTokenExpiry() && (
              <div>
                <Text strong>Token过期时间: </Text>
                <Text code>
                  {new Date(TokenManager.getTokenExpiry()!).toLocaleString()}
                </Text>
              </div>
            )}
          </Space>
        </div>

        <Divider>操作按钮</Divider>
        
        <Space style={{ marginBottom: 24 }}>
          <Button 
            type="primary" 
            icon={<LoginOutlined />}
            onClick={handleDemoLogin}
            disabled={state.isAuthenticated}
            loading={state.isLoading}
          >
            演示登录
          </Button>
          
          <Button 
            danger
            icon={<LogoutOutlined />}
            onClick={handleDemoLogout}
            disabled={!state.isAuthenticated}
          >
            演示登出
          </Button>
        </Space>

        <Divider>同步事件日志</Divider>
        
        {!isListening && (
          <Alert
            message="请点击'开始监听'按钮开始监听跨标签页同步事件"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {syncEvents.length === 0 && isListening && (
          <Alert
            message="暂无同步事件"
            description="在当前标签页或其他标签页进行登录/登出操作以查看同步效果"
            type="info"
            showIcon
          />
        )}

        {syncEvents.length > 0 && (
          <Timeline
            items={syncEvents.map(event => ({
              dot: getEventIcon(event.type, event.source),
              children: (
                <div>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong>{event.description}</Text>
                    <Tag 
                      color={event.source === 'cross_tab' ? 'green' : 'blue'}
                      style={{ marginLeft: 8 }}
                    >
                      {event.source === 'cross_tab' ? '其他标签页' : '本标签页'}
                    </Tag>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                  {event.data && (
                    <details style={{ marginTop: 4 }}>
                      <summary style={{ cursor: 'pointer', fontSize: '12px' }}>
                        查看详细数据
                      </summary>
                      <pre style={{ 
                        fontSize: '11px', 
                        background: '#f5f5f5', 
                        padding: '8px', 
                        borderRadius: '4px',
                        marginTop: '4px',
                        overflow: 'auto',
                        maxHeight: '100px'
                      }}>
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )
            }))}
          />
        )}
      </Card>
    </div>
  );
};

export default CrossTabSyncDemo;