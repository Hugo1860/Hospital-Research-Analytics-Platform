import React from 'react';
import { Layout, Menu, Drawer } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  BookOutlined,
  BarChartOutlined,
  FileSearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setCurrentPage, setBreadcrumbs, setSidebarCollapsed } from '../../store/slices/uiSlice';
import useResponsive from '../../hooks/useResponsive';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { hasPermission } = useAuth();
  const { sidebarCollapsed } = useSelector((state: RootState) => state.ui);
  const breakpoints = useResponsive();
  const permissions = usePermissions();
  
  // 移动端使用抽屉模式
  const isMobile = breakpoints.xs || breakpoints.sm;

  // 菜单项配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: 'publications-menu',
      icon: <FileTextOutlined />,
      label: '文献管理',
      children: [
        {
          key: '/publications',
          label: '文献列表',
        },
        ...(permissions.canManagePublications()
          ? [
              {
                key: '/publications/add',
                label: '录入文献',
              },
              {
                key: '/publications/import',
                label: '批量导入',
              },
            ]
          : []),
      ],
    },
    {
      key: 'journals-menu',
      icon: <BookOutlined />,
      label: '期刊管理',
      children: [
        {
          key: '/journals',
          label: '期刊列表',
        },
        ...(permissions.canManageJournals()
          ? [
              {
                key: '/journals/import',
                label: '批量导入',
              },
            ]
          : []),
      ],
    },
    {
      key: 'statistics-menu',
      icon: <BarChartOutlined />,
      label: '统计分析',
      children: [
        {
          key: '/statistics',
          label: '概览统计',
        },
        {
          key: '/statistics/department',
          label: '科室统计',
        },
      ],
    },
    {
      key: 'reports-menu',
      icon: <FileSearchOutlined />,
      label: '报告生成',
      children: [
        {
          key: '/reports',
          label: '报告列表',
        },
        {
          key: '/reports/generate',
          label: '生成报告',
        },
      ],
    },
    ...(permissions.isAdmin() || permissions.canManageUsers()
      ? [
          {
            key: 'settings-menu',
            icon: <SettingOutlined />,
            label: '系统设置',
            children: [
              ...(permissions.canManageUsers() ? [{
                key: '/settings/users',
                label: '用户管理',
              }] : []),
              {
                key: '/settings',
                label: '系统配置',
              },
            ],
          },
        ]
      : []),
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    dispatch(setCurrentPage(key));

    // 移动端点击菜单后自动收起侧边栏
    if (isMobile) {
      dispatch(setSidebarCollapsed(true));
    }

    // 更新面包屑
    const pathSegments = key.split('/').filter(Boolean);
    const breadcrumbItems = [
      { title: '首页', path: '/dashboard' },
      ...pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const menuItem = findMenuItemByKey(menuItems, path);
        return {
          title: menuItem?.label || getSegmentLabel(segment),
          path: index === pathSegments.length - 1 ? undefined : path,
        };
      }),
    ];
    dispatch(setBreadcrumbs(breadcrumbItems));
  };

  // 递归查找菜单项
  const findMenuItemByKey = (items: any[], key: string): any => {
    for (const item of items) {
      if (item.key === key) {
        return item;
      }
      if (item.children) {
        const found = findMenuItemByKey(item.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  // 获取路径段的中文标签
  const getSegmentLabel = (segment: string): string => {
    const labelMap: { [key: string]: string } = {
      dashboard: '仪表板',
      publications: '文献管理',
      journals: '期刊管理',
      statistics: '统计分析',
      reports: '报告生成',
      settings: '系统设置',
      add: '添加',
      edit: '编辑',
      import: '导入',
      generate: '生成',
      users: '用户管理',
      department: '科室统计',
    };
    return labelMap[segment] || segment;
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const pathname = location.pathname;
    
    // 精确匹配
    if (menuItems.some(item => 
      item.key === pathname || 
      (item.children && item.children.some((child: any) => child.key === pathname))
    )) {
      return [pathname];
    }
    
    // 部分匹配 - 找到最长匹配的路径
    const segments = pathname.split('/').filter(Boolean);
    for (let i = segments.length; i > 0; i--) {
      const partialPath = '/' + segments.slice(0, i).join('/');
      if (menuItems.some(item => 
        item.key === partialPath || 
        (item.children && item.children.some((child: any) => child.key === partialPath))
      )) {
        return [partialPath];
      }
    }
    
    return ['/dashboard'];
  };

  // 获取展开的菜单项
  const getOpenKeys = () => {
    const pathname = location.pathname;
    const openKeys: string[] = [];
    
    menuItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some((child: any) => 
          pathname.startsWith(child.key) || pathname === child.key
        );
        if (hasActiveChild) {
          openKeys.push(item.key);
        }
      }
    });
    
    return openKeys;
  };

  // 侧边栏内容
  const sidebarContent = (
    <>
      {/* Logo区域 */}
      <div
        style={{
          height: 64,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: sidebarCollapsed && !isMobile ? '14px' : '16px',
        }}
      >
        {sidebarCollapsed && !isMobile ? '协和SCI' : '协和医院SCI期刊分析系统'}
      </div>

      {/* 菜单 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={getOpenKeys()}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </>
  );

  // 移动端使用抽屉，桌面端使用固定侧边栏
  if (isMobile) {
    return (
      <Drawer
        title="协和医院SCI期刊分析系统"
        placement="left"
        onClose={() => dispatch(setSidebarCollapsed(true))}
        open={!sidebarCollapsed}
        bodyStyle={{ padding: 0, backgroundColor: '#001529' }}
        headerStyle={{ backgroundColor: '#001529', color: 'white' }}
        width={250}
      >
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Drawer>
    );
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={sidebarCollapsed}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1001,
      }}
    >
      {sidebarContent}
    </Sider>
  );
};

export default Sidebar;