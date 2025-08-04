import React from 'react';
import { 
  Tabs, 
  Space, 
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import ReportConfig from '../components/reports/ReportConfig';
import ReportManagement from '../components/reports/ReportManagement';



const Reports: React.FC = () => {
  return (
    <div>
      <Tabs
        defaultActiveKey="generate"
        items={[
          {
            key: 'generate',
            label: (
              <Space>
                <PlusOutlined />
                生成报告
              </Space>
            ),
            children: <ReportConfig />,
          },
          {
            key: 'history',
            label: (
              <Space>
                <FileTextOutlined />
                报告历史
              </Space>
            ),
            children: <ReportManagement />,
          },
        ]}
      />
    </div>
  );
};

export default Reports;