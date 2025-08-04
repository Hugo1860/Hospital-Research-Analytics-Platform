import React, { ReactNode } from 'react';
import { Layout as AntdLayout, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import Header from './Header';
import Sidebar from './Sidebar';
import useResponsive from '../../hooks/useResponsive';

const { Content } = AntdLayout;

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarCollapsed } = useSelector((state: RootState) => state.ui);
  const breakpoints = useResponsive();
  const isMobile = breakpoints.xs || breakpoints.sm;
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // 计算主内容区域的左边距
  const getMainContentMargin = () => {
    if (isMobile) return 0;
    return sidebarCollapsed ? 80 : 200;
  };

  return (
    <AntdLayout style={{ minHeight: '100vh' }}>
      <Sidebar />
      
      <AntdLayout 
        style={{ 
          marginLeft: getMainContentMargin(), 
          transition: 'margin-left 0.2s',
          minHeight: '100vh',
        }}
      >
        <Header colorBgContainer={colorBgContainer} />
        
        <Content
          style={{
            margin: isMobile ? '8px' : '16px',
            padding: isMobile ? 16 : 24,
            minHeight: 'calc(100vh - 112px)',
            background: colorBgContainer,
            borderRadius: 6,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
};

export default Layout;