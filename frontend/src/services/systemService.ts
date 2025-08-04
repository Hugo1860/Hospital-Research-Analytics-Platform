import { message } from 'antd';

export interface SystemConfig {
  key: string;
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  options?: string[];
  description: string;
  category: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  userCount: number;
  publicationCount: number;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
}

export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  module: string;
  details?: string;
  createdAt: string;
  userId?: string;
  username?: string;
}

export interface SystemStatus {
  cpu: number;
  memory: number;
  disk: number;
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
  uptime: string;
  version: string;
  environment: string;
  activeUsers: number;
  totalRequests: number;
  errorRate: number;
}

/**
 * 系统管理服务类
 */
class SystemService {
  /**
   * 获取系统配置列表
   */
  async getSystemConfigs(): Promise<SystemConfig[]> {
    try {
      // 这里应该调用真实的API
      // const response = await systemAPI.getConfigs();
      // return response.data;

      // 模拟数据
      const mockConfigs: SystemConfig[] = [
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
        {
          key: 'session_timeout',
          name: '会话超时时间',
          value: '120',
          type: 'number',
          description: '用户会话超时时间（分钟）',
          category: '安全设置',
        },
        {
          key: 'default_language',
          name: '默认语言',
          value: 'zh-CN',
          type: 'select',
          options: ['zh-CN', 'en-US'],
          description: '系统默认显示语言',
          category: '基本设置',
        },
        {
          key: 'backup_enabled',
          name: '启用自动备份',
          value: 'true',
          type: 'boolean',
          description: '是否启用数据库自动备份',
          category: '备份设置',
        },
        {
          key: 'log_level',
          name: '日志级别',
          value: 'info',
          type: 'select',
          options: ['debug', 'info', 'warn', 'error'],
          description: '系统日志记录级别',
          category: '系统设置',
        },
        {
          key: 'max_login_attempts',
          name: '最大登录尝试次数',
          value: '5',
          type: 'number',
          description: '用户连续登录失败后锁定账户的次数',
          category: '安全设置',
        },
      ];

      await new Promise(resolve => setTimeout(resolve, 800));
      return mockConfigs;
    } catch (error) {
      console.error('获取系统配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新系统配置
   */
  async updateSystemConfigs(configs: Record<string, any>): Promise<void> {
    try {
      // 这里应该调用真实的API
      // await systemAPI.updateConfigs(configs);

      // 模拟更新
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('更新系统配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取科室列表
   */
  async getDepartmentList(): Promise<Department[]> {
    try {
      // 这里应该调用真实的API
      // const response = await departmentAPI.getDepartments();
      // return response.data;

      // 模拟数据
      const mockDepartments: Department[] = [
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
        {
          id: 3,
          name: '普外科',
          code: 'SURGERY',
          description: '普通外科，负责各类外科手术',
          status: 'active',
          createdAt: '2023-02-01 11:00:00',
          updatedAt: '2024-01-05 13:30:00',
          userCount: 15,
          publicationCount: 28,
        },
        {
          id: 4,
          name: '儿科',
          code: 'PEDIATRICS',
          description: '儿科，专门治疗儿童疾病',
          status: 'inactive',
          createdAt: '2023-03-10 14:20:00',
          updatedAt: '2023-12-15 10:10:00',
          userCount: 6,
          publicationCount: 15,
        },
      ];

      await new Promise(resolve => setTimeout(resolve, 800));
      return mockDepartments;
    } catch (error) {
      console.error('获取科室列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建科室
   */
  async createDepartment(departmentData: CreateDepartmentRequest): Promise<Department> {
    try {
      // 这里应该调用真实的API
      // const response = await departmentAPI.createDepartment(departmentData);
      // return response.data;

      // 模拟创建
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newDepartment: Department = {
        id: Date.now(),
        ...departmentData,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString(),
        userCount: 0,
        publicationCount: 0,
      };

      return newDepartment;
    } catch (error) {
      console.error('创建科室失败:', error);
      throw error;
    }
  }

  /**
   * 更新科室
   */
  async updateDepartment(departmentId: number, departmentData: UpdateDepartmentRequest): Promise<Department> {
    try {
      // 这里应该调用真实的API
      // const response = await departmentAPI.updateDepartment(departmentId, departmentData);
      // return response.data;

      // 模拟更新
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedDepartment: Department = {
        id: departmentId,
        name: departmentData.name || '',
        code: departmentData.code || '',
        description: departmentData.description,
        status: departmentData.status || 'active',
        createdAt: '2023-01-01 00:00:00',
        updatedAt: new Date().toLocaleString(),
        userCount: 0,
        publicationCount: 0,
      };

      return updatedDepartment;
    } catch (error) {
      console.error('更新科室失败:', error);
      throw error;
    }
  }

  /**
   * 删除科室
   */
  async deleteDepartment(departmentId: number): Promise<void> {
    try {
      // 这里应该调用真实的API
      // await departmentAPI.deleteDepartment(departmentId);

      // 模拟删除
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('删除科室失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      // 这里应该调用真实的API
      // const response = await systemAPI.getStatus();
      // return response.data;

      // 模拟数据
      const mockStatus: SystemStatus = {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        disk: Math.floor(Math.random() * 100),
        database: Math.random() > 0.1 ? 'connected' : 'disconnected',
        redis: Math.random() > 0.05 ? 'connected' : 'disconnected',
        uptime: '15天 8小时 32分钟',
        version: '1.2.3',
        environment: 'production',
        activeUsers: Math.floor(Math.random() * 50) + 10,
        totalRequests: Math.floor(Math.random() * 10000) + 5000,
        errorRate: Math.random() * 5,
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      return mockStatus;
    } catch (error) {
      console.error('获取系统状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统日志
   */
  async getSystemLogs(params?: {
    level?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: SystemLog[];
    total: number;
  }> {
    try {
      // 这里应该调用真实的API
      // const response = await systemAPI.getLogs(params);
      // return response.data;

      // 模拟日志数据
      const mockLogs: SystemLog[] = [
        {
          id: '1',
          level: 'info',
          message: '用户登录成功',
          module: 'auth',
          details: '用户 admin 从 192.168.1.100 登录系统',
          createdAt: '2024-01-15 09:30:00',
          userId: '1',
          username: 'admin',
        },
        {
          id: '2',
          level: 'warn',
          message: '文件上传大小超出限制',
          module: 'upload',
          details: '用户尝试上传 15MB 的文件，超出 10MB 限制',
          createdAt: '2024-01-15 10:15:00',
          userId: '2',
          username: '张医生',
        },
        {
          id: '3',
          level: 'error',
          message: '数据库连接失败',
          module: 'database',
          details: 'Connection timeout after 30 seconds',
          createdAt: '2024-01-15 11:20:00',
        },
        {
          id: '4',
          level: 'info',
          message: '报告生成完成',
          module: 'report',
          details: '科室年度报告生成成功，文件大小 2.3MB',
          createdAt: '2024-01-15 14:45:00',
          userId: '3',
          username: '李主任',
        },
        {
          id: '5',
          level: 'warn',
          message: '内存使用率过高',
          module: 'system',
          details: '系统内存使用率达到 85%，建议检查内存泄漏',
          createdAt: '2024-01-15 15:30:00',
        },
        {
          id: '6',
          level: 'error',
          message: '文献导入失败',
          module: 'import',
          details: 'Excel文件格式错误，第5行数据解析失败',
          createdAt: '2024-01-15 16:45:00',
          userId: '4',
          username: '王医生',
        },
      ];

      // 模拟筛选
      let filteredLogs = mockLogs;
      if (params?.level) {
        filteredLogs = filteredLogs.filter(log => log.level === params.level);
      }
      if (params?.module) {
        filteredLogs = filteredLogs.filter(log => log.module === params.module);
      }

      await new Promise(resolve => setTimeout(resolve, 600));

      return {
        data: filteredLogs,
        total: filteredLogs.length,
      };
    } catch (error) {
      console.error('获取系统日志失败:', error);
      throw error;
    }
  }

  /**
   * 清理系统日志
   */
  async clearSystemLogs(beforeDate?: string): Promise<void> {
    try {
      // 这里应该调用真实的API
      // await systemAPI.clearLogs({ beforeDate });

      // 模拟清理
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success('系统日志清理完成');
    } catch (error) {
      console.error('清理系统日志失败:', error);
      throw error;
    }
  }

  /**
   * 系统备份
   */
  async createSystemBackup(): Promise<{
    backupId: string;
    filename: string;
    size: string;
  }> {
    try {
      // 这里应该调用真实的API
      // const response = await systemAPI.createBackup();
      // return response.data;

      // 模拟备份
      await new Promise(resolve => setTimeout(resolve, 3000));

      return {
        backupId: Date.now().toString(),
        filename: `backup_${new Date().toISOString().split('T')[0]}.sql`,
        size: '15.6 MB',
      };
    } catch (error) {
      console.error('创建系统备份失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统统计信息
   */
  async getSystemStatistics(): Promise<{
    totalUsers: number;
    totalDepartments: number;
    totalPublications: number;
    totalJournals: number;
    todayLogins: number;
    weeklyActiveUsers: number;
    systemHealth: 'good' | 'warning' | 'critical';
  }> {
    try {
      // 这里应该调用真实的API
      // const response = await systemAPI.getStatistics();
      // return response.data;

      // 模拟统计数据
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        totalUsers: 156,
        totalDepartments: 12,
        totalPublications: 1248,
        totalJournals: 456,
        todayLogins: 45,
        weeklyActiveUsers: 89,
        systemHealth: 'good',
      };
    } catch (error) {
      console.error('获取系统统计失败:', error);
      throw error;
    }
  }

  /**
   * 重启系统服务
   */
  async restartSystemService(serviceName: string): Promise<void> {
    try {
      // 这里应该调用真实的API
      // await systemAPI.restartService(serviceName);

      // 模拟重启
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success(`${serviceName} 服务重启成功`);
    } catch (error) {
      console.error('重启系统服务失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const systemService = new SystemService();
export default systemService;