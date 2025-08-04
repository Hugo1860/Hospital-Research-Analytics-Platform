import { message } from 'antd';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'department_admin' | 'user';
  departmentId?: number;
  departmentName?: string;
  status: 'active' | 'inactive' | 'locked';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  loginCount: number;
  avatar?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'department_admin' | 'user';
  departmentId?: number;
  status?: 'active' | 'inactive' | 'locked';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: 'admin' | 'department_admin' | 'user';
  departmentId?: number;
  status?: 'active' | 'inactive' | 'locked';
}

export interface OperationLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  details: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  status: 'success' | 'failed';
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: string;
  status?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * 用户管理服务类
 */
class UserService {
  /**
   * 获取用户列表
   */
  async getUserList(params?: UserListParams): Promise<{
    data: User[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      // 这里应该调用真实的API
      // const response = await userAPI.getUserList(params);
      // return response.data;

      // 模拟数据
      const mockUsers: User[] = [
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
          avatar: '',
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
        {
          id: '3',
          username: '李主任',
          email: 'li@hospital.com',
          role: 'department_admin',
          departmentId: 2,
          departmentName: '神经内科',
          status: 'active',
          lastLoginAt: '2024-01-13 14:20:00',
          createdAt: '2023-02-20 14:30:00',
          updatedAt: '2024-01-13 14:20:00',
          createdBy: 'admin',
          loginCount: 67,
        },
        {
          id: '4',
          username: '王医生',
          email: 'wang@hospital.com',
          role: 'user',
          departmentId: 1,
          departmentName: '心内科',
          status: 'inactive',
          lastLoginAt: '2023-12-20 11:15:00',
          createdAt: '2023-06-10 09:00:00',
          updatedAt: '2023-12-20 11:15:00',
          createdBy: '张医生',
          loginCount: 23,
        },
        {
          id: '5',
          username: '赵护士',
          email: 'zhao@hospital.com',
          role: 'user',
          departmentId: 2,
          departmentName: '神经内科',
          status: 'locked',
          lastLoginAt: '2024-01-10 08:30:00',
          createdAt: '2023-08-05 15:45:00',
          updatedAt: '2024-01-10 08:30:00',
          createdBy: '李主任',
          loginCount: 45,
        },
      ];

      // 模拟筛选
      let filteredData = mockUsers;
      if (params?.role) {
        filteredData = filteredData.filter(user => user.role === params.role);
      }
      if (params?.status) {
        filteredData = filteredData.filter(user => user.status === params.status);
      }
      if (params?.keyword) {
        filteredData = filteredData.filter(user => 
          user.username.toLowerCase().includes(params.keyword!.toLowerCase()) ||
          user.email.toLowerCase().includes(params.keyword!.toLowerCase())
        );
      }
      if (params?.departmentId) {
        filteredData = filteredData.filter(user => 
          user.departmentId?.toString() === params.departmentId
        );
      }

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 800));

      return {
        data: filteredData,
        total: filteredData.length,
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建用户
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // 这里应该调用真实的API
      // const response = await userAPI.createUser(userData);
      // return response.data;

      // 模拟创建用户
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newUser: User = {
        id: Date.now().toString(),
        ...userData,
        status: userData.status || 'active',
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString(),
        createdBy: 'admin', // 当前用户
        loginCount: 0,
      };

      return newUser;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户
   */
  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    try {
      // 这里应该调用真实的API
      // const response = await userAPI.updateUser(userId, userData);
      // return response.data;

      // 模拟更新用户
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 这里应该返回更新后的用户数据
      const updatedUser: User = {
        id: userId,
        username: userData.username || '',
        email: userData.email || '',
        role: userData.role || 'user',
        departmentId: userData.departmentId,
        status: userData.status || 'active',
        createdAt: '2023-01-01 00:00:00',
        updatedAt: new Date().toLocaleString(),
        createdBy: 'admin',
        loginCount: 0,
      };

      return updatedUser;
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // 这里应该调用真实的API
      // await userAPI.deleteUser(userId);

      // 模拟删除用户
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 锁定/解锁用户
   */
  async toggleUserStatus(userId: string, status: 'active' | 'locked'): Promise<void> {
    try {
      // 这里应该调用真实的API
      // await userAPI.updateUserStatus(userId, status);

      // 模拟状态切换
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('切换用户状态失败:', error);
      throw error;
    }
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(userId: string): Promise<{ tempPassword: string }> {
    try {
      // 这里应该调用真实的API
      // const response = await userAPI.resetPassword(userId);
      // return response.data;

      // 模拟重置密码
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        tempPassword: 'temp123456',
      };
    } catch (error) {
      console.error('重置密码失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户操作日志
   */
  async getUserOperationLogs(userId: string, params?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    action?: string;
  }): Promise<{
    data: OperationLog[];
    total: number;
  }> {
    try {
      // 这里应该调用真实的API
      // const response = await userAPI.getUserLogs(userId, params);
      // return response.data;

      // 模拟操作日志数据
      const mockLogs: OperationLog[] = [
        {
          id: '1',
          userId: userId,
          username: '张医生',
          action: '登录系统',
          resource: 'auth',
          details: '用户成功登录系统',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: '2024-01-15 09:30:00',
          status: 'success',
        },
        {
          id: '2',
          userId: userId,
          username: '张医生',
          action: '创建文献',
          resource: 'publication',
          details: '创建文献：《心血管疾病研究进展》',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: '2024-01-15 10:15:00',
          status: 'success',
        },
        {
          id: '3',
          userId: userId,
          username: '张医生',
          action: '生成报告',
          resource: 'report',
          details: '生成科室年度报告',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: '2024-01-14 16:20:00',
          status: 'success',
        },
        {
          id: '4',
          userId: userId,
          username: '张医生',
          action: '登录失败',
          resource: 'auth',
          details: '密码错误，登录失败',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: '2024-01-14 08:45:00',
          status: 'failed',
        },
      ];

      await new Promise(resolve => setTimeout(resolve, 800));

      return {
        data: mockLogs,
        total: mockLogs.length,
      };
    } catch (error) {
      console.error('获取用户操作日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    lockedUsers: number;
    adminUsers: number;
    departmentAdminUsers: number;
    normalUsers: number;
    todayLoginUsers: number;
    weeklyActiveUsers: number;
  }> {
    try {
      // 这里应该调用真实的API
      // const response = await userAPI.getUserStatistics();
      // return response.data;

      // 模拟统计数据
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        totalUsers: 156,
        activeUsers: 142,
        inactiveUsers: 8,
        lockedUsers: 6,
        adminUsers: 2,
        departmentAdminUsers: 12,
        normalUsers: 142,
        todayLoginUsers: 45,
        weeklyActiveUsers: 89,
      };
    } catch (error) {
      console.error('获取用户统计失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作用户
   */
  async batchUpdateUsers(userIds: string[], operation: {
    type: 'status' | 'role' | 'department';
    value: any;
  }): Promise<void> {
    try {
      // 这里应该调用真实的API
      // await userAPI.batchUpdateUsers(userIds, operation);

      // 模拟批量操作
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('批量操作用户失败:', error);
      throw error;
    }
  }

  /**
   * 导出用户列表
   */
  async exportUserList(params?: UserListParams): Promise<void> {
    try {
      // 这里应该调用真实的API
      // const response = await userAPI.exportUserList(params);
      
      // 模拟导出
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 创建模拟的Excel文件下载
      const csvContent = `用户名,邮箱,角色,状态,所属科室,创建时间
admin,admin@hospital.com,系统管理员,正常,-,2023-01-01 00:00:00
张医生,zhang@hospital.com,科室管理员,正常,心内科,2023-03-15 10:20:00
李主任,li@hospital.com,科室管理员,正常,神经内科,2023-02-20 14:30:00`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `用户列表_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('用户列表导出成功');
    } catch (error) {
      console.error('导出用户列表失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const userService = new UserService();
export default userService;