import { useState } from 'react';
import { Form } from 'antd';
import { useAuth } from '../contexts/AuthContext';

interface UseAuthFormOptions {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useAuthForm = (options: UseAuthFormOptions = {}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const success = await login(values.username, values.password);
      if (success) {
        options.onSuccess?.();
      }
    } catch (error) {
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    form.resetFields();
    setLoading(false);
  };

  return {
    form,
    loading,
    handleLogin,
    resetForm,
  };
};