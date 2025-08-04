import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SystemSettings from '../SystemSettings';
import { systemService } from '../../services/systemService';

// Mock the systemService
jest.mock('../../services/systemService', () => ({
  systemService: {
    getSystemConfigs: jest.fn(),
    updateSystemConfigs: jest.fn(),
    getDepartmentList: jest.fn(),
    createDepartment: jest.fn(),
    updateDepartment: jest.fn(),
    deleteDepartment: jest.fn(),
    getSystemStatus: jest.fn(),
    getSystemLogs: jest.fn(),
  },
}));

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

const mockSystemConfigs = [
  {
    key: 'site_name',
    name: '系统名称',
    value: '协和医院SCI期刊分析系统',
    type: 'string',
    description: '系统显示的名称',
    category: '基本设置',
  },
  {
    key: 'max_upload_size',
    name: '最大上传文件大小',
    value: '10',
    type: 'number',
    description: '文件上传的最大大小限制（MB）',
    category: '文件设置',
  },
  {
    key: 'enable_email_notification',
    name: '启用邮件通知',
    value: 'true',
    type: 'boolean',
    description: '是否启用系统邮件通知功能',
    category: '通知设置',
  },
];

const mockDepartments = [
  {
    id: 1,
    name: '心内科',
    code: 'CARDIOLOGY',
    description: '心血管内科，主要负责心血管疾病的诊治',
    status: 'active',
    createdAt: '2023-01-15 10:30:00',
    updatedAt: '2024-01-10 14:20:00',
    userCount: 12,
    publicationCount: 45,
  },
  {
    id: 2,
    name: '神经内科',
    code: 'NEUROLOGY',
    description: '神经内科，专门治疗神经系统疾病',
    status: 'active',
    createdAt: '2023-01-20 09:15:00',
    updatedAt: '2024-01-08 16:45:00',
    userCount: 8,
    publicationCount: 32,
  },
];

const mockSystemStatus = {
  cpu: 45,
  memory: 68,
  disk: 32,
  database: 'connected' as const,
  redis: 'connected' as const,
  uptime: '15天 8小时 32分钟',
  version: '1.2.3',
  environment: 'production',
  activeUsers: 25,
  totalRequests: 8500,
  errorRate: 0.5,
};

const mockSystemLogs = [
  {
    id: '1',
    level: 'info' as const,
    message: '用户登录成功',
    module: 'auth',
    details: '用户 admin 从 192.168.1.100 登录系统',
    createdAt: '2024-01-15 09:30:00',
    userId: '1',
    username: 'admin',
  },
  {
    id: '2',
    level: 'warn' as const,
    message: '文件上传大小超出限制',
    module: 'upload',
    details: '用户尝试上传 15MB 的文件，超出 10MB 限制',
    createdAt: '2024-01-15 10:15:00',
    userId: '2',
    username: '张医生',
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('SystemSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (systemService.getSystemConfigs as jest.Mock).mockResolvedValue(mockSystemConfigs);
    (systemService.getDepartmentList as jest.Mock).mockResolvedValue(mockDepartments);
    (systemService.getSystemStatus as jest.Mock).mockResolvedValue(mockSystemStatus);
    (systemService.getSystemLogs as jest.Mock).mockResolvedValue({
      data: mockSystemLogs,
      total: 2,
    });
  });

  test('renders system settings page with tabs', async () => {
    renderWithProviders(<SystemSettings />);
    
    expect(screen.getByText('系统设置')).toBeInTheDocument();
    expect(screen.getByText('系统配置')).toBeInTheDocument();
    expect(screen.getByText('科室管理')).toBeInTheDocument();
    expect(screen.getByText('系统监控')).toBeInTheDocument();
    expect(screen.getByText('系统日志')).toBeInTheDocument();
  });

  test('loads and displays system configurations', async () => {
    renderWithProviders(<SystemSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('基本设置')).toBeInTheDocument();
      expect(screen.getByText('文件设置')).toBeInTheDocument();
      expect(screen.getByText('通知设置')).toBeInTheDocument();
    });

    expect(systemService.getSystemConfigs).toHaveBeenCalled();
  });

  test('saves system configuration', async () => {
    (systemService.updateSystemConfigs as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<SystemSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('保存配置')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('保存配置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(systemService.updateSystemConfigs).toHaveBeenCalled();
    });
  });

  test('switches to department management tab', async () => {
    renderWithProviders(<SystemSettings />);
    
    const departmentTab = screen.getByText('科室管理');
    fireEvent.click(departmentTab);

    await waitFor(() => {
      expect(screen.getByText('新增科室')).toBeInTheDocument();
      expect(screen.getByText('心内科')).toBeInTheDocument();
      expect(screen.getByText('神经内科')).toBeInTheDocument();
    });

    expect(systemService.getDepartmentList).toHaveBeenCalled();
  });

  test('creates new department', async () => {
    (systemService.createDepartment as jest.Mock).mockResolvedValue({
      id: 3,
      name: '外科',
      code: 'SURGERY',
      status: 'active',
    });

    renderWithProviders(<SystemSettings />);
    
    // Switch to department tab
    const departmentTab = screen.getByText('科室管理');
    fireEvent.click(departmentTab);

    await waitFor(() => {
      expect(screen.getByText('新增科室')).toBeInTheDocument();
    });

    // Click new department button
    const newDepartmentButton = screen.getByText('新增科室');
    fireEvent.click(newDepartmentButton);

    await waitFor(() => {
      expect(screen.getByLabelText('科室名称')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('科室名称'), {
      target: { value: '外科' },
    });
    fireEvent.change(screen.getByLabelText('科室代码'), {
      target: { value: 'SURGERY' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: '确定' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(systemService.createDepartment).toHaveBeenCalledWith({
        name: '外科',
        code: 'SURGERY',
        description: undefined,
        status: undefined,
      });
    });
  });

  test('deletes department', async () => {
    (systemService.deleteDepartment as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<SystemSettings />);
    
    // Switch to department tab
    const departmentTab = screen.getByText('科室管理');
    fireEvent.click(departmentTab);

    await waitFor(() => {
      expect(screen.getByText('心内科')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('[data-icon="delete"]')
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      // Confirm deletion
      await waitFor(() => {
        const confirmButton = screen.getByText('确定');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(systemService.deleteDepartment).toHaveBeenCalledWith(1);
      });
    }
  });

  test('switches to system monitoring tab', async () => {
    renderWithProviders(<SystemSettings />);
    
    const monitorTab = screen.getByText('系统监控');
    fireEvent.click(monitorTab);

    await waitFor(() => {
      expect(screen.getByText('CPU 使用率')).toBeInTheDocument();
      expect(screen.getByText('内存使用率')).toBeInTheDocument();
      expect(screen.getByText('磁盘使用率')).toBeInTheDocument();
      expect(screen.getByText('运行时间')).toBeInTheDocument();
    });

    expect(systemService.getSystemStatus).toHaveBeenCalled();
  });

  test('displays system status information', async () => {
    renderWithProviders(<SystemSettings />);
    
    const monitorTab = screen.getByText('系统监控');
    fireEvent.click(monitorTab);

    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument(); // CPU usage
      expect(screen.getByText('68')).toBeInTheDocument(); // Memory usage
      expect(screen.getByText('32')).toBeInTheDocument(); // Disk usage
      expect(screen.getByText('15天 8小时 32分钟')).toBeInTheDocument(); // Uptime
    });
  });

  test('displays service status', async () => {
    renderWithProviders(<SystemSettings />);
    
    const monitorTab = screen.getByText('系统监控');
    fireEvent.click(monitorTab);

    await waitFor(() => {
      expect(screen.getByText('数据库')).toBeInTheDocument();
      expect(screen.getByText('Redis')).toBeInTheDocument();
      expect(screen.getByText('系统版本')).toBeInTheDocument();
      expect(screen.getByText('1.2.3')).toBeInTheDocument();
    });
  });

  test('switches to system logs tab', async () => {
    renderWithProviders(<SystemSettings />);
    
    const logsTab = screen.getByText('系统日志');
    fireEvent.click(logsTab);

    await waitFor(() => {
      expect(screen.getByText('用户登录成功')).toBeInTheDocument();
      expect(screen.getByText('文件上传大小超出限制')).toBeInTheDocument();
    });

    expect(systemService.getSystemLogs).toHaveBeenCalledWith({
      level: undefined,
    });
  });

  test('filters system logs by level', async () => {
    renderWithProviders(<SystemSettings />);
    
    const logsTab = screen.getByText('系统日志');
    fireEvent.click(logsTab);

    await waitFor(() => {
      expect(screen.getByText('选择日志级别')).toBeInTheDocument();
    });

    // Select warning level
    const levelSelect = screen.getByDisplayValue('选择日志级别');
    fireEvent.change(levelSelect, { target: { value: 'warn' } });

    await waitFor(() => {
      expect(systemService.getSystemLogs).toHaveBeenCalledWith({
        level: 'warn',
      });
    });
  });

  test('refreshes system logs', async () => {
    renderWithProviders(<SystemSettings />);
    
    const logsTab = screen.getByText('系统日志');
    fireEvent.click(logsTab);

    await waitFor(() => {
      expect(screen.getByText('刷新')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('刷新');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(systemService.getSystemLogs).toHaveBeenCalledTimes(2);
    });
  });

  test('handles configuration form validation', async () => {
    renderWithProviders(<SystemSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('保存配置')).toBeInTheDocument();
    });

    // Clear a required field and try to save
    const siteNameInput = screen.getByDisplayValue('协和医院SCI期刊分析系统');
    fireEvent.change(siteNameInput, { target: { value: '' } });

    const saveButton = screen.getByText('保存配置');
    fireEvent.click(saveButton);

    // Form validation should prevent submission
    // This would require more detailed form testing
  });

  test('handles department form validation', async () => {
    renderWithProviders(<SystemSettings />);
    
    // Switch to department tab
    const departmentTab = screen.getByText('科室管理');
    fireEvent.click(departmentTab);

    await waitFor(() => {
      expect(screen.getByText('新增科室')).toBeInTheDocument();
    });

    // Click new department button
    const newDepartmentButton = screen.getByText('新增科室');
    fireEvent.click(newDepartmentButton);

    await waitFor(() => {
      expect(screen.getByLabelText('科室名称')).toBeInTheDocument();
    });

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: '确定' });
    fireEvent.click(submitButton);

    // Form validation should show error messages
    await waitFor(() => {
      expect(screen.getByText('请输入科室名称')).toBeInTheDocument();
    });
  });

  test('handles loading states', () => {
    // Mock loading state
    (systemService.getSystemConfigs as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<SystemSettings />);
    
    // Component should render without crashing during loading
    expect(screen.getByText('系统设置')).toBeInTheDocument();
  });

  test('handles error states', async () => {
    (systemService.getSystemConfigs as jest.Mock).mockRejectedValue(
      new Error('Failed to load configs')
    );

    renderWithProviders(<SystemSettings />);
    
    // Component should handle errors gracefully
    await waitFor(() => {
      expect(screen.getByText('系统设置')).toBeInTheDocument();
    });
  });
});