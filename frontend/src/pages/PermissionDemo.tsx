import React from 'react';
import { Card, Space, Button, Divider, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import PermissionWrapper from '../components/common/PermissionWrapper';
import PermissionButton from '../components/common/PermissionButton';
import RouteGuard from '../components/common/RouteGuard';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS, ROLES } from '../constants/permissions';

const { Title, Text } = Typography;

/**
 * 权限控制演示页面
 */
const PermissionDemo: React.FC = () => {
  const permissions = usePermissions();

  return (
    <RouteGuard roles={[ROLES.ADMIN]}>
      <div style={{ padding: '24px' }}>
        <Title level={2}>权限控制演示</Title>
        <Text type="secondary">
          此页面展示了各种权限控制组件的使用方法
        </Text>

        <Divider />

        {/* 用户信息展示 */}
        <Card title="当前用户信息" style={{ marginBottom: 24 }}>
          <Space direction="vertical">
            <Text>用户名: {permissions.user?.username}</Text>
            <Text>角色: {permissions.user?.role}</Text>
            <Text>科室: {permissions.user?.department?.name}</Text>
            <Text>是否管理员: {permissions.isAdmin() ? '是' : '否'}</Text>
            <Text>是否科室管理员: {permissions.isDepartmentAdmin() ? '是' : '否'}</Text>
          </Space>
        </Card>

        {/* PermissionWrapper 演示 */}
        <Card title="PermissionWrapper 组件演示" style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="middle">
            <div>
              <Text strong>只有管理员可见:</Text>
              <PermissionWrapper roles={[ROLES.ADMIN]}>
                <Text type="success"> ✓ 您是管理员，可以看到这段文字</Text>
              </PermissionWrapper>
              <PermissionWrapper 
                roles={[ROLES.USER]} 
                fallback={<Text type="secondary"> - 您不是普通用户</Text>}
              >
                <Text type="success"> ✓ 您是普通用户</Text>
              </PermissionWrapper>
            </div>

            <div>
              <Text strong>需要文献管理权限:</Text>
              <PermissionWrapper permissions={[PERMISSIONS.PUBLICATION_CREATE]}>
                <Text type="success"> ✓ 您有文献创建权限</Text>
              </PermissionWrapper>
              <PermissionWrapper 
                permissions={[PERMISSIONS.PUBLICATION_DELETE]}
                fallback={<Text type="warning"> - 您没有文献删除权限</Text>}
              >
                <Text type="success"> ✓ 您有文献删除权限</Text>
              </PermissionWrapper>
            </div>
          </Space>
        </Card>

        {/* PermissionButton 演示 */}
        <Card title="PermissionButton 组件演示" style={{ marginBottom: 24 }}>
          <Space wrap>
            <PermissionButton
              type="primary"
              icon={<PlusOutlined />}
              permissions={[PERMISSIONS.PUBLICATION_CREATE]}
              noPermissionTooltip="需要文献创建权限"
            >
              创建文献
            </PermissionButton>

            <PermissionButton
              icon={<EditOutlined />}
              permissions={[PERMISSIONS.PUBLICATION_UPDATE]}
              noPermissionTooltip="需要文献编辑权限"
            >
              编辑文献
            </PermissionButton>

            <PermissionButton
              danger
              icon={<DeleteOutlined />}
              permissions={[PERMISSIONS.PUBLICATION_DELETE]}
              noPermissionTooltip="需要文献删除权限"
            >
              删除文献
            </PermissionButton>

            <PermissionButton
              icon={<DownloadOutlined />}
              roles={[ROLES.ADMIN, ROLES.DEPARTMENT_ADMIN]}
              requireAll={false}
              noPermissionTooltip="需要管理员或科室管理员权限"
            >
              导出数据
            </PermissionButton>
          </Space>
        </Card>

        {/* 权限检查函数演示 */}
        <Card title="权限检查函数演示" style={{ marginBottom: 24 }}>
          <Space direction="vertical">
            <Text>可以管理用户: {permissions.canManageUsers() ? '是' : '否'}</Text>
            <Text>可以管理文献: {permissions.canManagePublications() ? '是' : '否'}</Text>
            <Text>可以管理期刊: {permissions.canManageJournals() ? '是' : '否'}</Text>
            <Text>可以查看统计: {permissions.canViewStatistics() ? '是' : '否'}</Text>
            <Text>可以生成报告: {permissions.canGenerateReports() ? '是' : '否'}</Text>
          </Space>
        </Card>

        {/* 复合权限演示 */}
        <Card title="复合权限演示">
          <Space direction="vertical" size="middle">
            <div>
              <Text strong>需要多个权限（AND 关系）:</Text>
              <PermissionWrapper
                permissions={[PERMISSIONS.PUBLICATION_CREATE, PERMISSIONS.PUBLICATION_UPDATE]}
                requireAll={true}
                fallback={<Text type="warning"> - 需要同时拥有创建和编辑权限</Text>}
              >
                <Text type="success"> ✓ 您同时拥有创建和编辑权限</Text>
              </PermissionWrapper>
            </div>

            <div>
              <Text strong>需要任一权限（OR 关系）:</Text>
              <PermissionWrapper
                roles={[ROLES.ADMIN, ROLES.DEPARTMENT_ADMIN]}
                requireAll={false}
                fallback={<Text type="warning"> - 需要管理员或科室管理员权限</Text>}
              >
                <Text type="success"> ✓ 您是管理员或科室管理员</Text>
              </PermissionWrapper>
            </div>
          </Space>
        </Card>
      </div>
    </RouteGuard>
  );
};

export default PermissionDemo;