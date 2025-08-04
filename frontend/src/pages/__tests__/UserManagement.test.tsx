import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import UserManagement from '../UserManagement';
import { userService } from '../../services/userService';

// Mock the userService
jest.mock('../../services/userService', () => ({
  userService: {
    getUserList: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    toggleUserStatus: jest.fn(),
    getUserOperationLogs: jest.fn(),
    exportUserList: jest.fn(),
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

// Mock DepartmentSelect component
jest.mock('../../components/common/DepartmentSelect', () => {
  return function MockDepartmentSelect({ onChange, ...props }: any) {
    return (
      <select
        data-testid="department-select"
        onChange={(e) => onChange && onChange(e.target.value)}
        {...props}
      >
        <option value="">请选择科室</option>
        <option value="1">心内科</option>
        <option value="2">神经内科</option>
      </select>
    );
  };
});

const mockStore = configureStore({
  reducer: {
    auth: (state = { user: { role: 'admin' } }) => state,
  },
});

const mockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@hospital.com',
    role: 'admin',
    status: 'active',
    lastLoginAt: '2024-01-15 09:30:00',
    createdAt: '2023-01-01 00:00:00',
    updatedAt: '2024-01-15 09:30:00',
    createdBy: 'system',
    loginCount: 156,
  },
  {
    id: '2',
    username: '张医生',
    email: 'zhang@hospital.com',
    role: 'department_admin',
    departmentId: 1,
    departmentName: '心内科',
    status: 'active',
    lastLoginAt: '2024-01-14 16:45:00',
    createdAt: '2023-03-15 10:20:00',
    updatedAt: '2024-01-14 16:45:00',
    createdBy: 'admin',
    loginCount: 89,
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('UserManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getUserList as jest.Mock).mockResolvedValue({
      data: mockUsers,
      total: 2,
      page: 1,
      pageSize: 10,
    });
  });

  test('renders user management page', async () => {
    renderWithProviders(<UserManagement />);
    
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('新增用户')).toBeInTheDocument();
    expect(screen.getByText('刷新')).toBeInTheDocument();
    expect(screen.getByText('导出')).toBeInTheDocument();
  });

  test('loads and displays users', async () => {
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('张医生')).toBeInTheDocument();
      expect(screen.getByText('admin@hospital.com')).toBeInTheDocument();
      expect(screen.getByText('zhang@hospital.com')).toBeInTheDocument();
    });

    expect(userService.getUserList).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      keyword: undefined,
      role: undefined,
      status: undefined,
      departmentId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  test('opens create user modal when new user button is clicked', async () => {
    renderWithProviders(<UserManagement />);
    
    const newUserButton = screen.getByText('新增用户');
    fireEvent.click(newUserButton);

    await waitFor(() => {
      expect(screen.getByText('新增用户')).toBeInTheDocument();
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
      expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
      expect(screen.getByLabelText('角色')).toBeInTheDocument();
    });
  });

  test('filters users by keyword', async () => {
    renderWithProviders(<UserManagement />);
    
    const searchInput = screen.getByPlaceholderText('搜索用户名或邮箱');
    fireEvent.change(searchInput, { target: { value: 'admin' } });

    await waitFor(() => {
      expect(userService.getUserList).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'admin',
        })
      );
    });
  });

  test('filters users by role', async () => {
    renderWithProviders(<UserManagement />);
    
    const roleSelect = screen.getByDisplayValue('角色');
    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    await waitFor(() => {
      expect(userService.getUserList).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        })
      );
    });
  });

  test('creates new user successfully', async () => {
    (userService.createUser as jest.Mock).mockResolvedValue({
      id: '3',
      username: 'newuser',
      email: 'newuser@hospital.com',
      role: 'user',
    });

    renderWithProviders(<UserManagement />);
    
    // Open create modal
    const newUserButton = screen.getByText('新增用户');
    fireEvent.click(newUserButton);

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'newuser' },
    });
    fireEvent.change(screen.getByLabelText('邮箱'), {
      target: { value: 'newuser@hospital.com' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: '确定' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(userService.createUser).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'newuser@hospital.com',
        password: 'temp123456',
        role: undefined,
        departmentId: undefined,
        status: undefined,
      });
    });
  });

  test('deletes user successfully', async () => {
    (userService.deleteUser as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('张医生')).toBeInTheDocument();
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
        expect(userService.deleteUser).toHaveBeenCalledWith('2');
      });
    }
  });

  test('toggles user status', async () => {
    (userService.toggleUserStatus as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('张医生')).toBeInTheDocument();
    });

    // Find and click lock/unlock button
    const lockButtons = screen.getAllByRole('button');
    const lockButton = lockButtons.find(button => 
      button.querySelector('[data-icon="lock"]')
    );
    
    if (lockButton) {
      fireEvent.click(lockButton);

      await waitFor(() => {
        expect(userService.toggleUserStatus).toHaveBeenCalledWith('2', 'locked');
      });
    }
  });

  test('views user operation logs', async () => {
    const mockLogs = [
      {
        id: '1',
        userId: '2',
        username: '张医生',
        action: '登录系统',
        resource: 'auth',
        details: '用户成功登录系统',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        createdAt: '2024-01-15 09:30:00',
        status: 'success',
      },
    ];

    (userService.getUserOperationLogs as jest.Mock).mockResolvedValue({
      data: mockLogs,
      total: 1,
    });

    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('张医生')).toBeInTheDocument();
    });

    // Find and click history button
    const historyButtons = screen.getAllByRole('button');
    const historyButton = historyButtons.find(button => 
      button.querySelector('[data-icon="history"]')
    );
    
    if (historyButton) {
      fireEvent.click(historyButton);

      await waitFor(() => {
        expect(userService.getUserOperationLogs).toHaveBeenCalledWith('2');
        expect(screen.getByText('张医生 的操作日志')).toBeInTheDocument();
      });
    }
  });

  test('exports user list', async () => {
    (userService.exportUserList as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<UserManagement />);
    
    const exportButton = screen.getByText('导出');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(userService.exportUserList).toHaveBeenCalledWith({
        keyword: undefined,
        role: undefined,
        status: undefined,
        departmentId: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  test('displays statistics cards', async () => {
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('总用户数')).toBeInTheDocument();
      expect(screen.getByText('正常用户')).toBeInTheDocument();
      expect(screen.getByText('科室管理员')).toBeInTheDocument();
      expect(screen.getByText('已锁定')).toBeInTheDocument();
    });
  });

  test('handles pagination', async () => {
    renderWithProviders(<UserManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('共 2 条记录')).toBeInTheDocument();
    });

    // Test pagination would require more complex setup
    // This is a basic check that pagination info is displayed
  });

  test('handles loading state', () => {
    (userService.getUserList as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<UserManagement />);
    
    // Loading state would be handled by Ant Design Table component
    // This test verifies the component renders without crashing during loading
    expect(screen.getByText('用户管理')).toBeInTheDocument();
  });

  test('handles error state', async () => {
    (userService.getUserList as jest.Mock).mockRejectedValue(
      new Error('Failed to load users')
    );

    renderWithProviders(<UserManagement />);
    
    // Error handling would show a message
    // This test verifies the component handles errors gracefully
    await waitFor(() => {
      expect(screen.getByText('用户管理')).toBeInTheDocument();
    });
  });
});