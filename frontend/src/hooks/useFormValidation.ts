import { useState, useCallback } from 'react';
import { Form } from 'antd';

interface ValidationState {
  [key: string]: {
    status: 'validating' | 'success' | 'error' | '';
    message: string;
  };
}

export const useFormValidation = () => {
  const [form] = Form.useForm();
  const [validationState, setValidationState] = useState<ValidationState>({});

  // 设置字段验证状态
  const setFieldValidation = useCallback((
    field: string,
    status: 'validating' | 'success' | 'error' | '',
    message: string = ''
  ) => {
    setValidationState(prev => ({
      ...prev,
      [field]: { status, message }
    }));
  }, []);

  // 清除字段验证状态
  const clearFieldValidation = useCallback((field: string) => {
    setValidationState(prev => {
      const newState = { ...prev };
      delete newState[field];
      return newState;
    });
  }, []);

  // 获取字段验证状态
  const getFieldValidation = useCallback((field: string) => {
    return validationState[field] || { status: '', message: '' };
  }, [validationState]);

  // 检查是否有验证错误
  const hasValidationErrors = useCallback(() => {
    return Object.values(validationState).some(state => state.status === 'error');
  }, [validationState]);

  // 重置所有验证状态
  const resetValidation = useCallback(() => {
    setValidationState({});
  }, []);

  return {
    form,
    validationState,
    setFieldValidation,
    clearFieldValidation,
    getFieldValidation,
    hasValidationErrors,
    resetValidation,
  };
};