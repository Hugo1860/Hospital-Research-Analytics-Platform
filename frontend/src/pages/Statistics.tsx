import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card } from 'antd';
import DepartmentStatisticsComponent from '../components/statistics/DepartmentStatistics';

const StatisticsOverview: React.FC = () => {
  return (
    <Card title="统计概览">
      <p>统计概览功能待实现</p>
    </Card>
  );
};

const DepartmentStatistics: React.FC = () => {
  return <DepartmentStatisticsComponent />;
};

const Statistics: React.FC = () => {
  return (
    <Routes>
      <Route index element={<StatisticsOverview />} />
      <Route path="department" element={<DepartmentStatistics />} />
    </Routes>
  );
};

export default Statistics;