import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { message } from 'antd';
import TemplateDownloadButton from '../TemplateDownloadButton';
import { publicationAPI, journalAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useApiMode } from '../../../hooks/useApiMode';
import tokenManager from '../../../utils/tokenManager';

// Mock dependencies
jest.mock('../../../services/api');
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../hooks/useApiMode');
jest.mock('../../../utils/tokenManager');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Modal: {
    confirm: jest.fn(),
  },
}));

const mockPublicationAPI = publicationAPI as jest.Mocked<typeof publicationAPI>;
const mockJournalAPI = journalAPI as jest.Mocked<typeof journalAPI>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseApiMode = useApiMode as jest.MockedFunction<typeof useApiMode>;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement and appendChild/removeChild
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};
const mockCreateElement = jest.fn(() => mockLink);
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});
Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild,
});
Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild,
});

describe('TemplateDownloadButton', () => {
  const mockAuthState = {
    isAuthenticated: true,
    user: { id: 1, username: 'test' },
    token: 'mock-token',
    isLoading: false,
  };

  const mockApiMode = {
    mode: 'real' as const,
    status: { isAvailable: true, mode: 'real' as const, lastChecked: Date.now() },
    isLoading: false,
    isRealApiMode: true,
    isDemoMode: false,
    switchToRealApi: jest.fn(),
    setMode: jest.fn(),
    checkHealth: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      state: mockAuthState,
      login: jest.fn(),
      logout: jest.fn(),
      hasPermission: jest.fn(() => true),
      hasRole: jest.fn(() => true),
      updateUser: jest.fn(),
    });

    mockUseApiMode.mockReturnValue(mockApiMode);
    mockTokenManager.isTokenValid.mockReturnValue(true);
  });

  describe('Publication Template Download', () => {
    it('should render publication template download button', () => {
      render(<TemplateDownloadButton type="publication" />);
      
      expect(screen.getByRole('button', { name: /下载文献模板/i })).toBeInTheDocument();
    });

    it('should download publication template successfully', async () => {
      const mockResponse = {
        data: new ArrayBuffer(8),
      };
      mockPublicationAPI.downloadTemplate.mockResolvedValue(mockResponse as any);

      render(<TemplateDownloadButton type="publication" />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPublicationAPI.downloadTemplate).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockLink.click).toHaveBeenCalled();
        expect(message.success).toHaveBeenCalledWith('模板下载成功');
      });
    });

    it('should handle download error', async () => {
      const mockError = new Error('Network Error');
      mockPublicationAPI.downloadTemplate.mockRejectedValue(mockError);

      render(<TemplateDownloadButton type="publication" />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith(
          expect.stringContaining('网络连接失败')
        );
      });
    });
  });

  describe('Journal Template Download', () => {
    it('should render journal template download button', () => {
      render(<TemplateDownloadButton type="journal" />);
      
      expect(screen.getByRole('button', { name: /下载期刊模板/i })).toBeInTheDocument();
    });

    it('should download journal template successfully', async () => {
      const mockResponse = {
        data: new ArrayBuffer(8),
      };
      mockJournalAPI.downloadTemplate.mockResolvedValue(mockResponse as any);

      render(<TemplateDownloadButton type="journal" />);
      
      const button = screen.getByRole('button', { name: /下载期刊模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockJournalAPI.downloadTemplate).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockLink.click).toHaveBeenCalled();
        expect(message.success).toHaveBeenCalledWith('模板下载成功');
      });
    });
  });

  describe('Authentication Checks', () => {
    it('should show error when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        state: { ...mockAuthState, isAuthenticated: false },
        login: jest.fn(),
        logout: jest.fn(),
        hasPermission: jest.fn(() => true),
        hasRole: jest.fn(() => true),
        updateUser: jest.fn(),
      });

      render(<TemplateDownloadButton type="publication" />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('登录状态已过期，请重新登录');
      });
    });

    it('should show error when token is invalid', async () => {
      mockTokenManager.isTokenValid.mockReturnValue(false);

      render(<TemplateDownloadButton type="publication" />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('登录状态已过期，请重新登录');
      });
    });
  });

  describe('Demo Mode Handling', () => {
    it('should show demo mode warning in demo mode', async () => {
      const mockModal = require('antd').Modal;
      mockModal.confirm.mockImplementation(({ onCancel }) => {
        onCancel();
      });

      mockUseApiMode.mockReturnValue({
        ...mockApiMode,
        mode: 'demo',
        isDemoMode: true,
        isRealApiMode: false,
      });

      render(<TemplateDownloadButton type="publication" />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockModal.confirm).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '当前为演示模式',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 error', async () => {
      const mockError = {
        response: { status: 401 },
      };
      mockPublicationAPI.downloadTemplate.mockRejectedValue(mockError);

      render(<TemplateDownloadButton type="publication" />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('登录已过期，请重新登录');
      });
    });

    it('should handle 403 error', async () => {
      const mockError = {
        response: { status: 403 },
      };
      mockPublicationAPI.downloadTemplate.mockRejectedValue(mockError);

      render(<TemplateDownloadButton type="publication" />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('权限不足，无法下载模板');
      });
    });

    it('should handle 404 error', async () => {
      const mockError = {
        response: { status: 404 },
      };
      mockPublicationAPI.downloadTemplate.mockRejectedValue(mockError);

      render(<TemplateDownloadButton type="publication" />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('模板文件不存在，请联系管理员');
      });
    });
  });

  describe('Props and Customization', () => {
    it('should render with custom children', () => {
      render(
        <TemplateDownloadButton type="publication">
          自定义下载按钮
        </TemplateDownloadButton>
      );
      
      expect(screen.getByRole('button', { name: /自定义下载按钮/i })).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<TemplateDownloadButton type="publication" disabled />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      expect(button).toBeDisabled();
    });

    it('should render as block button when block prop is true', () => {
      render(<TemplateDownloadButton type="publication" block />);
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      expect(button).toHaveClass('ant-btn-block');
    });

    it('should call onSuccess callback on successful download', async () => {
      const mockOnSuccess = jest.fn();
      const mockResponse = {
        data: new ArrayBuffer(8),
      };
      mockPublicationAPI.downloadTemplate.mockResolvedValue(mockResponse as any);

      render(
        <TemplateDownloadButton type="publication" onSuccess={mockOnSuccess} />
      );
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should call onError callback on download error', async () => {
      const mockOnError = jest.fn();
      const mockError = new Error('Test error');
      mockPublicationAPI.downloadTemplate.mockRejectedValue(mockError);

      render(
        <TemplateDownloadButton type="publication" onError={mockOnError} />
      );
      
      const button = screen.getByRole('button', { name: /下载文献模板/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(mockError);
      });
    });
  });
});