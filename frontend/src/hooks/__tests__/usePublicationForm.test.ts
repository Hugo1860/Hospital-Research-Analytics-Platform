import { renderHook, act } from '@testing-library/react';
import { usePublicationForm } from '../usePublicationForm';

// Mock the API
jest.mock('../../services/api', () => ({
  publicationAPI: {
    getPublication: jest.fn(),
    createPublication: jest.fn(),
    updatePublication: jest.fn(),
  },
  journalAPI: {
    searchJournals: jest.fn(),
  },
}));

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}));

const mockPublication = {
  id: '1',
  title: 'Test Publication',
  authors: 'John Doe, Jane Smith',
  journalId: 1,
  journalName: 'Nature Medicine',
  departmentId: 1,
  publishYear: 2023,
  volume: '15',
  issue: '3',
  pages: '123-130',
  doi: '10.1038/nm.test.2023',
  pmid: '12345678',
};

const mockJournals = [
  {
    id: 1,
    name: 'Nature Medicine',
    issn: '1078-8956',
    impactFactor: 87.241,
    quartile: 'Q1',
    category: 'Medicine, Research & Experimental',
  },
  {
    id: 2,
    name: 'Science',
    issn: '0036-8075',
    impactFactor: 63.714,
    quartile: 'Q1',
    category: 'Multidisciplinary Sciences',
  },
];

describe('usePublicationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default values for create mode', () => {
    const { result } = renderHook(() => usePublicationForm('create'));

    expect(result.current.mode).toBe('create');
    expect(result.current.loading).toBe(false);
    expect(result.current.submitting).toBe(false);
    expect(result.current.formData).toEqual({
      title: '',
      authors: '',
      journalId: null,
      departmentId: null,
      publishYear: new Date().getFullYear(),
      volume: '',
      issue: '',
      pages: '',
      doi: '',
      pmid: '',
    });
  });

  test('should load publication data in edit mode', async () => {
    const { publicationAPI } = require('../../services/api');
    publicationAPI.getPublication.mockResolvedValue({ data: mockPublication });

    const { result } = renderHook(() => usePublicationForm('edit', '1'));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.formData.title).toBe('Test Publication');
    expect(result.current.formData.authors).toBe('John Doe, Jane Smith');
    expect(publicationAPI.getPublication).toHaveBeenCalledWith('1');
  });

  test('should handle form data updates', () => {
    const { result } = renderHook(() => usePublicationForm('create'));

    act(() => {
      result.current.updateFormData('title', 'New Publication Title');
    });

    expect(result.current.formData.title).toBe('New Publication Title');

    act(() => {
      result.current.updateFormData('authors', 'Author One, Author Two');
    });

    expect(result.current.formData.authors).toBe('Author One, Author Two');
  });

  test('should validate required fields', () => {
    const { result } = renderHook(() => usePublicationForm('create'));

    const errors = result.current.validateForm();

    expect(errors.title).toBe('请输入文献标题');
    expect(errors.authors).toBe('请输入作者信息');
    expect(errors.journalId).toBe('请选择期刊');
    expect(errors.departmentId).toBe('请选择所属科室');
  });

  test('should validate year range', () => {
    const { result } = renderHook(() => usePublicationForm('create'));

    act(() => {
      result.current.updateFormData('publishYear', 1800);
    });

    const errors = result.current.validateForm();
    expect(errors.publishYear).toBe('发表年份必须在1900年之后');

    act(() => {
      result.current.updateFormData('publishYear', new Date().getFullYear() + 2);
    });

    const errors2 = result.current.validateForm();
    expect(errors2.publishYear).toBe('发表年份不能超过当前年份');
  });

  test('should validate DOI format', () => {
    const { result } = renderHook(() => usePublicationForm('create'));

    act(() => {
      result.current.updateFormData('doi', 'invalid-doi');
    });

    const errors = result.current.validateForm();
    expect(errors.doi).toBe('DOI格式不正确');

    act(() => {
      result.current.updateFormData('doi', '10.1038/nature12373');
    });

    const errors2 = result.current.validateForm();
    expect(errors2.doi).toBeUndefined();
  });

  test('should validate PMID format', () => {
    const { result } = renderHook(() => usePublicationForm('create'));

    act(() => {
      result.current.updateFormData('pmid', 'not-a-number');
    });

    const errors = result.current.validateForm();
    expect(errors.pmid).toBe('PMID必须是数字');

    act(() => {
      result.current.updateFormData('pmid', '12345678');
    });

    const errors2 = result.current.validateForm();
    expect(errors2.pmid).toBeUndefined();
  });

  test('should search journals', async () => {
    const { journalAPI } = require('../../services/api');
    journalAPI.searchJournals.mockResolvedValue({ data: mockJournals });

    const { result } = renderHook(() => usePublicationForm('create'));

    await act(async () => {
      await result.current.searchJournals('Nature');
    });

    expect(journalAPI.searchJournals).toHaveBeenCalledWith('Nature');
    expect(result.current.journalOptions).toEqual(mockJournals);
  });

  test('should handle journal selection', () => {
    const { result } = renderHook(() => usePublicationForm('create'));

    act(() => {
      result.current.handleJournalSelect(mockJournals[0]);
    });

    expect(result.current.formData.journalId).toBe(1);
    expect(result.current.selectedJournal).toEqual(mockJournals[0]);
  });

  test('should auto-extract year from DOI', () => {
    const { result } = renderHook(() => usePublicationForm('create'));

    act(() => {
      result.current.updateFormData('doi', '10.1038/s41586-2023-06234-6');
    });

    // The hook should automatically extract year 2023 from DOI
    expect(result.current.formData.publishYear).toBe(2023);
  });

  test('should submit form in create mode', async () => {
    const { publicationAPI } = require('../../services/api');
    publicationAPI.createPublication.mockResolvedValue({ data: mockPublication });

    const mockOnSuccess = jest.fn();
    const { result } = renderHook(() => usePublicationForm('create', undefined, mockOnSuccess));

    // Fill required fields
    act(() => {
      result.current.updateFormData('title', 'Test Publication');
      result.current.updateFormData('authors', 'John Doe');
      result.current.updateFormData('journalId', 1);
      result.current.updateFormData('departmentId', 1);
    });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(publicationAPI.createPublication).toHaveBeenCalledWith({
      title: 'Test Publication',
      authors: 'John Doe',
      journalId: 1,
      departmentId: 1,
      publishYear: new Date().getFullYear(),
      volume: '',
      issue: '',
      pages: '',
      doi: '',
      pmid: '',
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(mockPublication);
  });

  test('should submit form in edit mode', async () => {
    const { publicationAPI } = require('../../services/api');
    publicationAPI.getPublication.mockResolvedValue({ data: mockPublication });
    publicationAPI.updatePublication.mockResolvedValue({ data: { ...mockPublication, title: 'Updated Title' } });

    const mockOnSuccess = jest.fn();
    const { result } = renderHook(() => usePublicationForm('edit', '1', mockOnSuccess));

    // Wait for data to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Update title
    act(() => {
      result.current.updateFormData('title', 'Updated Title');
    });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(publicationAPI.updatePublication).toHaveBeenCalledWith('1', expect.objectContaining({
      title: 'Updated Title',
    }));

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  test('should handle form submission errors', async () => {
    const { publicationAPI } = require('../../services/api');
    publicationAPI.createPublication.mockRejectedValue(new Error('Submission failed'));

    const { result } = renderHook(() => usePublicationForm('create'));

    // Fill required fields
    act(() => {
      result.current.updateFormData('title', 'Test Publication');
      result.current.updateFormData('authors', 'John Doe');
      result.current.updateFormData('journalId', 1);
      result.current.updateFormData('departmentId', 1);
    });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(result.current.submitting).toBe(false);
    // Error should be handled internally
  });

  test('should reset form', () => {
    const { result } = renderHook(() => usePublicationForm('create'));

    // Fill some data
    act(() => {
      result.current.updateFormData('title', 'Test Title');
      result.current.updateFormData('authors', 'Test Authors');
    });

    expect(result.current.formData.title).toBe('Test Title');

    // Reset form
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData.title).toBe('');
    expect(result.current.formData.authors).toBe('');
    expect(result.current.selectedJournal).toBeNull();
    expect(result.current.errors).toEqual({});
  });

  test('should handle loading states correctly', async () => {
    const { publicationAPI } = require('../../services/api');
    publicationAPI.getPublication.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: mockPublication }), 100))
    );

    const { result } = renderHook(() => usePublicationForm('edit', '1'));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBe(false);
  });

  test('should handle journal search errors', async () => {
    const { journalAPI } = require('../../services/api');
    journalAPI.searchJournals.mockRejectedValue(new Error('Search failed'));

    const { result } = renderHook(() => usePublicationForm('create'));

    await act(async () => {
      await result.current.searchJournals('Nature');
    });

    // Should handle error gracefully
    expect(result.current.journalOptions).toEqual([]);
  });

  test('should debounce journal search', async () => {
    const { journalAPI } = require('../../services/api');
    journalAPI.searchJournals.mockResolvedValue({ data: mockJournals });

    const { result } = renderHook(() => usePublicationForm('create'));

    // Multiple rapid calls should be debounced
    act(() => {
      result.current.searchJournals('N');
      result.current.searchJournals('Na');
      result.current.searchJournals('Nat');
      result.current.searchJournals('Nature');
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Should only call API once with the final search term
    expect(journalAPI.searchJournals).toHaveBeenCalledTimes(1);
    expect(journalAPI.searchJournals).toHaveBeenCalledWith('Nature');
  });
});