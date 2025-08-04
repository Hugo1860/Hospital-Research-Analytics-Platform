import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from 'antd';

const UserManagement: React.FC = () => {
  return (
    <Card title="用户管理">
      <p>用户管理功能待实现</p>
    </Card>
  );
};

const SystemSettings: React.FC = () => {
  return (
    <Card title="系统设置">
      <p>系统设置功能待实现</p>
    </Card>
  );
};

const Settings: React.FC = () => {
  return (
    <Routes>
      <Route index element={<SystemSettings />} />
      <Route path="users" element={<UserManagement />} />
    </Routes>
  );
};

export default Settings;