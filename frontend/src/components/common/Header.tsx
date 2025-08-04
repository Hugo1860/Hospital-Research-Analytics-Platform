import React from 'react';
import { Layout, Button, Breadcrumb, Avatar, Dropdown, Space, Badge, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { toggleSidebar } from '../../store/slices/uiSlice';
import ApiModeIndicator from './ApiModeIndicator';

const { Header: AntdHeader } = Layout;

interface HeaderProps {
  colorBgContainer: string;
}

const Header: React.FC<HeaderProps> = ({ colorBgContainer }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { state: authState, logout } = useAuth();
  const { sidebarCollapsed, breadcrumbs } = useSelector((state: RootState) => state.ui);

  // 用户下拉菜单项
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人设置',
      onClick: () => navigate('/settings/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ];

  // 通知菜单项（暂时为空，后续可以添加实际通知功能）
  const notificationItems = [
    {
      key: 'no-notifications',
      label: '暂无新通知',
      disabled: true,
    },
  ];

  return (
    <AntdHeader
      style={{
        padding: '0 16px',
        background: colorBgContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      {/* 左侧：折叠按钮和面包屑 */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <Button
          type="text"
          icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => dispatch(toggleSidebar())}
          style={{
            fontSize: '16px',
            width: 64,
            height: 64,
          }}
        />

        <Breadcrumb
          style={{ marginLeft: 16 }}
          items={breadcrumbs.map(item => ({
            title: item.path ? (
              <span
                style={{ cursor: 'pointer', color: '#1890ff' }}
                onClick={() => navigate(item.path!)}
              >
                {item.title}
              </span>
            ) : (
              item.title
            ),
          }))}
        />
      </div>

      {/* 右侧：用户信息和操作 */}
      <Space size="middle">
        {/* API模式指示器 */}
        <ApiModeIndicator showSwitchButton={true} />

        {/* 通知铃铛 */}
        <Tooltip title="通知">
          <Dropdown
            menu={{ items: notificationItems }}
            placement="bottomRight"
            arrow
          >
            <Badge count={0} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: '16px' }}
              />
            </Badge>
          </Dropdown>
        </Tooltip>

        {/* 用户信息 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {authState.user?.department?.name && (
            <span style={{ color: '#666', marginRight: 8, fontSize: '14px' }}>
              {authState.user.department.name}
            </span>
          )}
          <span style={{ marginRight: 12, fontSize: '14px' }}>
            欢迎，{authState.user?.username}
          </span>

          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Avatar
              style={{ cursor: 'pointer', backgroundColor: '#1890ff' }}
              icon={<UserOutlined />}
            />
          </Dropdown>
        </div>
      </Space>
    </AntdHeader>
  );
};

export default Header;