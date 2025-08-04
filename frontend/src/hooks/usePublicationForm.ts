import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { publicationAPI } from '../services/api';

interface Journal {
  id: number;
  name: string;
  impactFactor: number;
  quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  category: string;
  issn?: string;
}

interface PublicationFormData {
  title: string;
  authors: string;
  journalId: number;
  departmentId: number;
  publishYear: number;
  publishDate?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pmid?: string;
  keywords?: string;
  abstract?: string;
  notes?: string;
}

interface UsePublicationFormOptions {
  mode: 'create' | 'edit';
  publicationId?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const usePublicationForm = (options: UsePublicationFormOptions) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { mode, publicationId, onSuccess, onError } = options;

  const [loading, setLoading] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);

  // 提交表单
  const handleSubmit = useCallback(async (values: PublicationFormData) => {
    setLoading(true);
    try {
      if (mode === 'edit' && publicationId) {
        await publicationAPI.updatePublication(Number(publicationId), values);
        message.success('文献更新成功');
      } else {
        await publicationAPI.createPublication(values);
        message.success('文献录入成功');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/publications');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '操作失败，请重试';
      message.error(errorMessage);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, publicationId, onSuccess, onError, navigate]);

  // 重置表单
  const handleReset = useCallback(() => {
    form.resetFields();
    setSelectedJournal(null);
  }, [form]);

  // 选择期刊
  const handleJournalSelect = useCallback((journal: Journal) => {
    setSelectedJournal(journal);
    form.setFieldsValue({
      journalId: journal.id,
      journalName: journal.name,
    });
  }, [form]);

  // 验证DOI格式
  const validateDOI = useCallback((doi: string): boolean => {
    if (!doi) return true; // DOI是可选的
    const doiRegex = /^10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+$/;
    return doiRegex.test(doi);
  }, []);

  // 验证PMID格式
  const validatePMID = useCallback((pmid: string): boolean => {
    if (!pmid) return true; // PMID是可选的
    const pmidRegex = /^\d+$/;
    return pmidRegex.test(pmid);
  }, []);

  // 验证页码格式
  const validatePages = useCallback((pages: string): boolean => {
    if (!pages) return true; // 页码是可选的
    // 支持多种页码格式：123-130, 123, e123456, 等
    const pagesRegex = /^[\d\-e,\s]+$/i;
    return pagesRegex.test(pages);
  }, []);

  // 自动填充年份（从DOI或其他信息推断）
  const autoFillYear = useCallback((doi?: string) => {
    if (doi) {
      // 尝试从DOI中提取年份信息
      const yearMatch = doi.match(/20\d{2}/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        const currentYear = new Date().getFullYear();
        if (year >= 1900 && year <= currentYear + 1) {
          form.setFieldsValue({ publishYear: year });
        }
      }
    }
  }, [form]);

  return {
    form,
    loading,
    selectedJournal,
    handleSubmit,
    handleReset,
    handleJournalSelect,
    validateDOI,
    validatePMID,
    validatePages,
    autoFillYear,
  };
};