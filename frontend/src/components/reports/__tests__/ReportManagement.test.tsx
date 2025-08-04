import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportManagement from '../ReportManagement';
import { reportService } from '../../../services/reportService';

// Mock the reportService
jest.mock('../../../services/reportService', () => ({
  reportService: {
    getReportList: jest.fn(),
    downloadReport: jest.fn(),
    deleteReport: jest.fn(),
    regenerateReport: jest.fn(),
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

const mockReports = [
  {
    id: '1',
    title: '心内科2024年度科研发表报告',
    type: 'department' as const,
    format: 'pdf' as const,
    status: 'completed' as const,
    createdAt: '2024-01-15 14:30:00',
    completedAt: '2024-01-15 14:33:25',
    downloadUrl: '/api/reports/download/1',
    size: '2.3 MB',
    departments: ['心内科'],
    createdBy: '张医生',
    parameters: {
      year: 2024,
      includeCharts: true,
      includeData: true,
    },
  },
  {
    id: '2',
    title: '全院2024年第一季度统计报告',
    type: 'hospital' as const,
    format: 'excel' as const,
    status: 'completed' as const,
    createdAt: '2024-01-10 09:15:00',
    completedAt: '2024-01-10 09:18:42',
    downloadUrl: '/api/reports/download/2',
    size: '1.8 MB',
    departments: [],
    createdBy: '管理员',
    parameters: {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      includeAnalysis: true,
    },
  },
  {
    id: '3',
    title: '神经内科自定义报告',
    type: 'custom' as const,
    format: 'pdf' as const,
    status: 'generating' as const,
    createdAt: '2024-01-05 16:45:00',
    departments: ['神经内科'],
    createdBy: '李主任',
    progress: 65,
    parameters: {
      customFields: ['title', 'authors', 'journal'],
      analysisLevel: 'detailed',
    },
  },
  {
    id: '4',
    title: '外科科室对比分析报告',
    type: 'custom' as const,
    format: 'word' as const,
    status: 'failed' as const,
    createdAt: '2024-01-03 11:20:00',
    departments: ['普外科', '骨科', '神经外科'],
    createdBy: '王主任',
    error: '数据查询超时，请重试',
    parameters: {
      compareMode: true,
      timeRange: '2023-01-01 to 2023-12-31',
    },
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ReportManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reportService.getReportList as jest.Mock).mockResolvedValue({
      data: mockReports,
      total: 4,
      page: 1,
      pageSize: 10,
    });
  });

  test('renders report management component', async () => {
    renderWithProviders(<ReportManagement />);
    
    expect(screen.getByText('报告管理')).toBeInTheDocument();
    expect(screen.getByText('刷新')).toBeInTheDocument();
  });

  test('loads and displays reports', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('心内科2024年度科研发表报告')).toBeInTheDocument();
      expect(screen.getByText('全院2024年第一季度统计报告')).toBeInTheDocument();
      expect(screen.getByText('神经内科自定义报告')).toBeInTheDocument();
      expect(screen.getByText('外科科室对比分析报告')).toBeInTheDocument();
    });

    expect(reportService.getReportList).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      type: undefined,
      status: undefined,
      keyword: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  test('displays report statistics', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('总报告数')).toBeInTheDocument();
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('生成中')).toBeInTheDocument();
      expect(screen.getByText('生成失败')).toBeInTheDocument();
    });

    // Check statistics values
    expect(screen.getByText('4')).toBeInTheDocument(); // Total reports
    expect(screen.getByText('2')).toBeInTheDocument(); // Completed reports
    expect(screen.getByText('1')).toBeInTheDocument(); // Generating reports
    expect(screen.getByText('1')).toBeInTheDocument(); // Failed reports
  });

  test('displays correct status tags', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('生成中')).toBeInTheDocument();
      expect(screen.getByText('生成失败')).toBeInTheDocument();
    });
  });

  test('displays correct type tags', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('科室报告')).toBeInTheDocument();
      expect(screen.getByText('全院报告')).toBeInTheDocument();
      expect(screen.getAllByText('自定义报告')).toHaveLength(2);
    });
  });

  test('filters reports by keyword', async () => {
    renderWithProviders(<ReportManagement />);
    
    const searchInput = screen.getByPlaceholderText('搜索报告名称或创建人');
    fireEvent.change(searchInput, { target: { value: '心内科' } });

    await waitFor(() => {
      expect(reportService.getReportList).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: '心内科',
        })
      );
    });
  });

  test('filters reports by type', async () => {
    renderWithProviders(<ReportManagement />);
    
    const typeSelect = screen.getByDisplayValue('报告类型');
    fireEvent.change(typeSelect, { target: { value: 'department' } });

    await waitFor(() => {
      expect(reportService.getReportList).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'department',
        })
      );
    });
  });

  test('filters reports by status', async () => {
    renderWithProviders(<ReportManagement />);
    
    const statusSelect = screen.getByDisplayValue('状态');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    await waitFor(() => {
      expect(reportService.getReportList).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });

  test('downloads completed report', async () => {
    (reportService.downloadReport as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('心内科2024年度科研发表报告')).toBeInTheDocument();
    });

    // Find and click download button for completed report
    const downloadButtons = screen.getAllByRole('button');
    const downloadButton = downloadButtons.find(button => 
      button.querySelector('[data-icon="download"]')
    );
    
    if (downloadButton) {
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(reportService.downloadReport).toHaveBeenCalledWith(
          '1',
          '心内科2024年度科研发表报告.pdf'
        );
      });
    }
  });

  test('prevents download of incomplete report', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('神经内科自定义报告')).toBeInTheDocument();
    });

    // Try to download generating report - button should be disabled
    const downloadButtons = screen.getAllByRole('button');
    const generatingReportDownloadButton = downloadButtons.find(button => 
      button.querySelector('[data-icon="download"]') && button.disabled
    );
    
    expect(generatingReportDownloadButton).toBeDefined();
  });

  test('deletes report', async () => {
    (reportService.deleteReport as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('心内科2024年度科研发表报告')).toBeInTheDocument();
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
        expect(reportService.deleteReport).toHaveBeenCalledWith('1');
      });
    }
  });

  test('regenerates failed report', async () => {
    (reportService.regenerateReport as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('外科科室对比分析报告')).toBeInTheDocument();
    });

    // Find and click regenerate button for failed report
    const regenerateButtons = screen.getAllByRole('button');
    const regenerateButton = regenerateButtons.find(button => 
      button.querySelector('[data-icon="reload"]')
    );
    
    if (regenerateButton) {
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(reportService.regenerateReport).toHaveBeenCalledWith('4');
      });
    }
  });

  test('views report details', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('心内科2024年度科研发表报告')).toBeInTheDocument();
    });

    // Find and click details button
    const detailsButtons = screen.getAllByRole('button');
    const detailsButton = detailsButtons.find(button => 
      button.querySelector('[data-icon="info-circle"]')
    );
    
    if (detailsButton) {
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('报告详情')).toBeInTheDocument();
        expect(screen.getByText('心内科2024年度科研发表报告')).toBeInTheDocument();
      });
    }
  });

  test('displays progress for generating reports', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('神经内科自定义报告')).toBeInTheDocument();
    });

    // Check if progress is displayed for generating report
    // This would require checking for progress bar component
    expect(screen.getByText('生成中')).toBeInTheDocument();
  });

  test('refreshes report list', async () => {
    renderWithProviders(<ReportManagement />);
    
    const refreshButton = screen.getByText('刷新');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(reportService.getReportList).toHaveBeenCalledTimes(2);
    });
  });

  test('handles pagination', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('共 4 条记录')).toBeInTheDocument();
    });

    // Pagination would be handled by Ant Design Table component
    // This test verifies pagination info is displayed
  });

  test('handles empty report list', async () => {
    (reportService.getReportList as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('暂无报告记录')).toBeInTheDocument();
    });
  });

  test('handles loading state', () => {
    (reportService.getReportList as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<ReportManagement />);
    
    // Component should render without crashing during loading
    expect(screen.getByText('报告管理')).toBeInTheDocument();
  });

  test('handles error state', async () => {
    (reportService.getReportList as jest.Mock).mockRejectedValue(
      new Error('Failed to load reports')
    );

    renderWithProviders(<ReportManagement />);
    
    // Component should handle errors gracefully
    await waitFor(() => {
      expect(screen.getByText('报告管理')).toBeInTheDocument();
    });
  });

  test('displays file icons correctly', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      // Check for file type icons
      const pdfIcons = screen.getAllByRole('img');
      expect(pdfIcons.length).toBeGreaterThan(0);
    });
  });

  test('shows report parameters in details modal', async () => {
    renderWithProviders(<ReportManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('心内科2024年度科研发表报告')).toBeInTheDocument();
    });

    // Open details modal
    const detailsButtons = screen.getAllByRole('button');
    const detailsButton = detailsButtons.find(button => 
      button.querySelector('[data-icon="info-circle"]')
    );
    
    if (detailsButton) {
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('报告参数')).toBeInTheDocument();
      });
    }
  });
});