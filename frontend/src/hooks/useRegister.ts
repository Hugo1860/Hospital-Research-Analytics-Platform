import { useState } from 'react';
import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

interface RegisterData {
  username: string;
  password: string;
  email: string;
  role: string;
  departmentId?: number;
}

interface UseRegisterOptions {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useRegister = (options: UseRegisterOptions = {}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (values: RegisterData) => {
    setLoading(true);
    try {
      await authAPI.register(values);
      
      message.success('注册成功！请联系管理员激活账户后登录');
      
      if (options.onSuccess) {
        options.onSuccess();
      } else {
        navigate('/login');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '注册失败，请重试';
      message.error(errorMessage);
      
      if (options.onError) {
        options.onError(error);
      }
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
    handleRegister,
    resetForm,
  };
};