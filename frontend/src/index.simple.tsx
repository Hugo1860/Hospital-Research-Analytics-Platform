import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// 简单的测试组件
const SimpleApp: React.FC = () => {
  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <h1 style={{ color: '#1890ff', marginBottom: '20px' }}>
          🏥 协和医院SCI期刊分析系统
        </h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
          系统启动成功！
        </p>
        <div style={{ textAlign: 'left', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '4px' }}>
          <h3>✅ 检查项目：</h3>
          <ul>
            <li>✅ React 18 框架加载正常</li>
            <li>✅ TypeScript 编译正常</li>
            <li>✅ 基础样式加载正常</li>
            <li>✅ 前端服务运行正常</li>
          </ul>
        </div>
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
          <p><strong>下一步：</strong></p>
          <p>如果看到此页面，说明前端基础环境正常。现在可以加载完整的应用组件。</p>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<SimpleApp />);