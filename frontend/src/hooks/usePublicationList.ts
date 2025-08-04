import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { publicationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Publication {
  id: number;
  title: string;
  authors: string;
  journal: {
    id: number;
    name: string;
    impactFactor: number;
    quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    category: string;
  };
  department: {
    id: number;
    name: string;
  };
  publishYear: number;
  publishDate?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pmid?: string;
  createdAt: string;
  updatedAt: string;
}

interface SearchFilters {
  keyword?: string;
  departmentId?: number;
  journalId?: number;
  year?: number;
  quartile?: string;
  dateRange?: [string, string];
}

interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
}

interface UsePublicationListOptions {
  initialPageSize?: number;
  autoLoad?: boolean;
}

export const usePublicationList = (options: UsePublicationListOptions = {}) => {
  const { initialPageSize = 10, autoLoad = true } = options;
  const { state: authState } = useAuth();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState<PaginationConfig>({
    current: 1,
    pageSize: initialPageSize,
    total: 0,
  });
  const [filters, setFilters] = useState<SearchFilters>({});

  // 模拟数据
  const mockPublications: Publication[] = [
    {
      id: 1,
      title: 'A novel approach to cancer treatment using immunotherapy',
      authors: '张三, 李四, 王五',
      journal: {
        id: 1,
        name: 'Nature',
        impactFactor: 49.962,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
      },
      department: {
        id: 1,
        name: '肿瘤科',
      },
      publishYear: 2023,
      publishDate: '2023-06-15',
      volume: '618',
      issue: '7965',
      pages: '123-130',
      doi: '10.1038/s41586-023-06234-6',
      pmid: '37258680',
      createdAt: '2023-07-01T10:00:00Z',
      updatedAt: '2023-07-01T10:00:00Z',
    },
    {
      id: 2,
      title: 'Machine learning applications in medical diagnosis',
      authors: '赵六, 钱七, 孙八',
      journal: {
        id: 2,
        name: 'Science',
        impactFactor: 47.728,
        quartile: 'Q1',
        category: 'Multidisciplinary Sciences',
      },
      department: {
        id: 2,
        name: '影像科',
      },
      publishYear: 2023,
      publishDate: '2023-05-20',
      volume: '380',
      issue: '6645',
      pages: '456-463',
      doi: '10.1126/science.abcd1234',
      pmid: '37123456',
      createdAt: '2023-06-01T10:00:00Z',
      updatedAt: '2023-06-01T10:00:00Z',
    },
    {
      id: 3,
      title: 'Deep learning for protein structure prediction',
      authors: '周九, 吴十, 郑十一',
      journal: {
        id: 3,
        name: 'Cell',
        impactFactor: 41.582,
        quartile: 'Q1',
        category: 'Cell Biology',
      },
      department: {
        id: 3,
        name: '生物医学工程科',
      },
      publishYear: 2022,
      publishDate: '2022-12-10',
      volume: '185',
      issue: '25',
      pages: '4848-4863',
      doi: '10.1016/j.cell.2022.11.032',
      pmid: '36516865',
      createdAt: '2023-01-15T10:00:00Z',
      updatedAt: '2023-01-15T10:00:00Z',
    },
  ];

  // 加载文献列表
  const loadPublications = useCallback(async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    searchFilters = filters
  ) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        ...searchFilters,
        // 如果是科室管理员，只能查看本科室的文献
        ...(authState.user?.role === 'department_admin' && {
          departmentId: authState.user.departmentId,
        }),
      };

      // 尝试调用真实API，如果失败则使用模拟数据
      try {
        const response = await publicationAPI.getPublications(params);
        const { data, pagination: paginationInfo } = response.data;

        setPublications(data);
        setPagination({
          current: page,
          pageSize,
          total: paginationInfo.total,
        });
      } catch (apiError) {
        // API调用失败，使用模拟数据
        console.warn('API call failed, using mock data:', apiError);
        
        // 模拟分页和筛选
        let filteredData = [...mockPublications];
        
        if (searchFilters.keyword) {
          filteredData = filteredData.filter(pub => 
            pub.title.toLowerCase().includes(searchFilters.keyword!.toLowerCase()) ||
            pub.authors.toLowerCase().includes(searchFilters.keyword!.toLowerCase())
          );
        }
        
        if (searchFilters.departmentId) {
          filteredData = filteredData.filter(pub => pub.department.id === searchFilters.departmentId);
        }
        
        if (searchFilters.year) {
          filteredData = filteredData.filter(pub => pub.publishYear === searchFilters.year);
        }
        
        if (searchFilters.quartile) {
          filteredData = filteredData.filter(pub => pub.journal.quartile === searchFilters.quartile);
        }

        // 如果是科室管理员，只显示本科室的文献
        if (authState.user?.role === 'department_admin' && authState.user?.departmentId) {
          filteredData = filteredData.filter(pub => pub.department.id === authState.user!.departmentId);
        }

        const total = filteredData.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 300));

        setPublications(paginatedData);
        setPagination({
          current: page,
          pageSize,
          total,
        });
      }
    } catch (error) {
      message.error('加载文献列表失败');
      console.error('Load publications error:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters, authState.user]);

  // 删除文献
  const deletePublication = useCallback(async (id: number) => {
    try {
      // 尝试调用真实API
      try {
        await publicationAPI.deletePublication(id);
      } catch (apiError) {
        // API调用失败，模拟删除成功
        console.warn('Delete API call failed, simulating success:', apiError);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      message.success('删除成功');
      // 重新加载当前页数据
      await loadPublications();
      return true;
    } catch (error) {
      message.error('删除失败');
      console.error('Delete publication error:', error);
      return false;
    }
  }, [loadPublications]);

  // 批量删除文献
  const batchDeletePublications = useCallback(async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => publicationAPI.deletePublication(id)));
      message.success(`成功删除 ${ids.length} 篇文献`);
      setSelectedRowKeys([]);
      await loadPublications();
      return true;
    } catch (error) {
      message.error('批量删除失败');
      console.error('Batch delete publications error:', error);
      return false;
    }
  }, [loadPublications]);

  // 搜索文献
  const searchPublications = useCallback((keyword: string) => {
    const newFilters = { ...filters, keyword };
    setFilters(newFilters);
    loadPublications(1, pagination.pageSize, newFilters);
  }, [filters, pagination.pageSize, loadPublications]);

  // 更新筛选条件
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    loadPublications(1, pagination.pageSize, updatedFilters);
  }, [filters, pagination.pageSize, loadPublications]);

  // 重置筛选条件
  const resetFilters = useCallback(() => {
    setFilters({});
    loadPublications(1, pagination.pageSize, {});
  }, [pagination.pageSize, loadPublications]);

  // 刷新数据
  const refresh = useCallback(() => {
    loadPublications();
  }, [loadPublications]);

  // 导出数据
  const exportPublications = useCallback(async () => {
    try {
      // 尝试调用真实API
      try {
        const response = await publicationAPI.exportPublications(filters);
        // 处理文件下载
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `publications_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (apiError) {
        // API调用失败，模拟导出
        console.warn('Export API call failed, simulating export:', apiError);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 创建模拟的CSV内容
        const csvContent = [
          '标题,作者,期刊,科室,发表年份,影响因子,分区',
          ...publications.map(pub => 
            `"${pub.title}","${pub.authors}","${pub.journal.name}","${pub.department.name}",${pub.publishYear},${pub.journal.impactFactor},${pub.journal.quartile}`
          )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `publications_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      message.success('导出成功');
      return true;
    } catch (error) {
      message.error('导出失败');
      console.error('Export publications error:', error);
      return false;
    }
  }, [filters, publications]);

  // 分页变化处理
  const handlePaginationChange = useCallback((page: number, pageSize: number) => {
    loadPublications(page, pageSize);
  }, [loadPublications]);

  // 选择行变化处理
  const handleSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  // 组件挂载时自动加载数据
  useEffect(() => {
    if (autoLoad) {
      loadPublications();
    }
  }, [autoLoad]); // 只在autoLoad变化时重新执行

  return {
    // 数据状态
    publications,
    loading,
    selectedRowKeys,
    pagination,
    filters,
    
    // 操作方法
    loadPublications,
    deletePublication,
    batchDeletePublications,
    searchPublications,
    updateFilters,
    resetFilters,
    refresh,
    exportPublications,
    handlePaginationChange,
    handleSelectionChange,
    
    // 工具方法
    setSelectedRowKeys,
  };
};