import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PublicationImport from '../../components/publications/PublicationImport';
import JournalImport from '../../components/journals/JournalImport';
import { AuthContext } from '../../contexts/AuthContext';
import { publicationAPI, journalAPI } from '../../services/api';
import tokenManager from '../../utils/tokenManager';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('../../utils/tokenManager');
jest.mock('../../hooks/useApiMode', () => ({
  useApiMode: () => ({
    mode: 'real',
    status: { isAvailable: true, mode: 'real', lastChecked: Date.now() },
    isLoading: false,
    isRealApiMode: true,
    isDemoMode: false,
    switchToRealApi: jest.fn(),
    setMode: jest.fn(),
    checkHealth: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const mockPublicationAPI = publicationAPI as jest.Mocked<typeof publicationAPI>;
const mockJournalAPI = journalAPI as jest.Mocked<typeof journalAPI>;
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

// Create mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      ui: (state = { sidebarCollapsed: false, breadcrumbs: [] }) => state,
      auth: (state = { user: null, isAuthenticated: false }) => state,
      publications: (state = { items: [], loading: false }) => state,
      journals: (state = { items: [], loading: false }) => state,
      statistics: (state = { overview: null, loading: false }) => state,
    },
  });
};

// Mock auth context
const mockAuthState = {
  isAuthenticated: true,
  user: {
    id: 1,
    username: 'testuser',
    role: 'admin',
    departmentId: 1,
    department: { id: 1, name: '心内科' },
  },
  token: 'mock-token',
  isLoading: false,
};

const mockAuthContext = {
  state: mockAuthState,
  login: jest.fn(),
  logout: jest.fn(),
  hasPermission: jest.fn(() => true),
  hasRole: jest.fn(() => true),
  updateUser: jest.fn(),
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = createMockStore();
  
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          {children}
        </AuthContext.Provider>
      </BrowserRouter>
    </Provider>
  );
};

describe('Template Download Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenManager.isTokenValid.mockReturnValue(true);
  });

  describe('Publication Template Download Flow', () => {
    it('should complete full publication template download flow', async () => {
      const mockResponse = {
        data: new ArrayBuffer(8),
      };
      mockPublicationAPI.downloadTemplate.mockResolvedValue(mockResponse as any);

      render(
        <TestWrapper>
          <PublicationImport />
        </TestWrapper>
      );

      // Find and click the download template button
      const downloadButton = screen.getByRole('button', { name: /下载模板/i });
      expect(downloadButton).toBeInTheDocument();
      expect(downloadButton).not.toBeDisabled();

      fireEvent.click(downloadButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockPublicationAPI.downloadTemplate).toHaveBeenCalled();
      });

      // Verify file download process
      await waitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockLink.click).toHaveBeenCalled();
        expect(mockAppendChild).toHaveBeenCalled();
        expect(mockRemoveChild).toHaveBeenCalled();
      });

      // Verify filename format
      expect(mockLink.download).toMatch(/文献导入模板_\d{8}\.xlsx/);
    });

    it('should handle authentication errors in publication download', async () => {
      const authError = {
        response: { status: 401 },
        message: 'Unauthorized',
      };
      mockPublicationAPI.downloadTemplate.mockRejectedValue(authError);

      render(
        <TestWrapper>
          <PublicationImport />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /下载模板/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockPublicationAPI.downloadTemplate).toHaveBeenCalled();
      });

      // Should not trigger file download on error
      expect(mockLink.click).not.toHaveBeenCalled();
    });

    it('should disable download button when user is not authenticated', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        state: {
          ...mockAuthState,
          isAuthenticated: false,
        },
      };

      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AuthContext.Provider value={unauthenticatedContext}>
              <PublicationImport />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      // Should show authentication warning instead of download button
      expect(screen.getByText(/需要登录/i)).toBeInTheDocument();
    });
  });

  describe('Journal Template Download Flow', () => {
    it('should complete full journal template download flow', async () => {
      const mockResponse = {
        data: new ArrayBuffer(8),
      };
      mockJournalAPI.downloadTemplate.mockResolvedValue(mockResponse as any);

      render(
        <TestWrapper>
          <JournalImport />
        </TestWrapper>
      );

      // Find and click the download template button
      const downloadButton = screen.getByRole('button', { name: /下载导入模板/i });
      expect(downloadButton).toBeInTheDocument();

      fireEvent.click(downloadButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockJournalAPI.downloadTemplate).toHaveBeenCalled();
      });

      // Verify file download process
      await waitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockLink.click).toHaveBeenCalled();
        expect(mockAppendChild).toHaveBeenCalled();
        expect(mockRemoveChild).toHaveBeenCalled();
      });

      // Verify filename format
      expect(mockLink.download).toMatch(/期刊导入模板_\d{8}\.xlsx/);
    });

    it('should handle network errors in journal download', async () => {
      const networkError = new Error('Network Error');
      mockJournalAPI.downloadTemplate.mockRejectedValue(networkError);

      render(
        <TestWrapper>
          <JournalImport />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /下载导入模板/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockJournalAPI.downloadTemplate).toHaveBeenCalled();
      });

      // Should not trigger file download on error
      expect(mockLink.click).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should handle different blob types correctly', async () => {
      const mockResponse = {
        data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      };
      mockPublicationAPI.downloadTemplate.mockResolvedValue(mockResponse as any);

      render(
        <TestWrapper>
          <PublicationImport />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /下载模板/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(
          expect.any(Blob)
        );
      });
    });

    it('should clean up URL objects after download', async () => {
      const mockResponse = {
        data: new ArrayBuffer(8),
      };
      mockPublicationAPI.downloadTemplate.mockResolvedValue(mockResponse as any);

      render(
        <TestWrapper>
          <PublicationImport />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /下载模板/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
      });
    });
  });

  describe('Permission-Based Access', () => {
    it('should show permission denied for users without create permission', () => {
      const restrictedContext = {
        ...mockAuthContext,
        hasPermission: jest.fn(() => false),
        hasRole: jest.fn(() => false),
      };

      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AuthContext.Provider value={restrictedContext}>
              <PublicationImport />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByText(/权限不足/i)).toBeInTheDocument();
    });

    it('should allow department admin to download templates', async () => {
      const deptAdminContext = {
        ...mockAuthContext,
        state: {
          ...mockAuthState,
          user: {
            ...mockAuthState.user,
            role: 'department_admin',
          },
        },
        hasRole: jest.fn((roles) => roles.includes('department_admin')),
      };

      const mockResponse = {
        data: new ArrayBuffer(8),
      };
      mockPublicationAPI.downloadTemplate.mockResolvedValue(mockResponse as any);

      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AuthContext.Provider value={deptAdminContext}>
              <PublicationImport />
            </AuthContext.Provider>
          </BrowserRouter>
        </Provider>
      );

      const downloadButton = screen.getByRole('button', { name: /下载模板/i });
      expect(downloadButton).not.toBeDisabled();

      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockPublicationAPI.downloadTemplate).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after failed download', async () => {
      // First call fails
      mockPublicationAPI.downloadTemplate
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: new ArrayBuffer(8) } as any);

      render(
        <TestWrapper>
          <PublicationImport />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /下载模板/i });
      
      // First attempt - should fail
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockPublicationAPI.downloadTemplate).toHaveBeenCalledTimes(1);
      });

      // Second attempt - should succeed
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockPublicationAPI.downloadTemplate).toHaveBeenCalledTimes(2);
        expect(mockLink.click).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during download', async () => {
      let resolvePromise: (value: any) => void;
      const downloadPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockPublicationAPI.downloadTemplate.mockReturnValue(downloadPromise as any);

      render(
        <TestWrapper>
          <PublicationImport />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /下载模板/i });
      fireEvent.click(downloadButton);

      // Should show loading state
      await waitFor(() => {
        expect(downloadButton).toHaveClass('ant-btn-loading');
      });

      // Resolve the promise
      resolvePromise!({ data: new ArrayBuffer(8) });

      // Loading state should be cleared
      await waitFor(() => {
        expect(downloadButton).not.toHaveClass('ant-btn-loading');
      });
    });
  });
});