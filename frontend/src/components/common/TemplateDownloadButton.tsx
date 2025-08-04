import React, { useState } from 'react';
import { Button, message, Progress, Modal } from 'antd';
import { DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { publicationAPI, journalAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useApiMode } from '../../hooks/useApiMode';
import tokenManager from '../../utils/tokenManager';

export type TemplateType = 'publication' | 'journal';

interface TemplateDownloadButtonProps {
  type: TemplateType;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  block?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}

interface DownloadProgress {
  percent: number;
  status: 'active' | 'success' | 'exception';
  message: string;
}

const TemplateDownloadButton: React.FC<TemplateDownloadButtonProps> = ({
  type,
  disabled = false,
  size = 'middle',
  block = false,
  onSuccess,
  onError,
  children
}) => {
  const { state: authState } = useAuth();
  const { isDemoMode, switchToRealApi } = useApiMode();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const getApiFunction = () => {
    switch (type) {
      case 'publication':
        return publicationAPI.downloadTemplate;
      case 'journal':
        return journalAPI.downloadTemplate;
      default:
        throw new Error(`Unsupported template type: ${type}`);
    }
  };

  const getFileName = () => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    switch (type) {
      case 'publication':
        return `文献导入模板_${timestamp}.xlsx`;
      case 'journal':
        return `期刊导入模板_${timestamp}.xlsx`;
      default:
        return `模板_${timestamp}.xlsx`;
    }
  };

  const getButtonText = () => {
    if (children) return children;
    
    switch (type) {
      case 'publication':
        return '下载文献模板';
      case 'journal':
        return '下载期刊模板';
      default:
        return '下载模板';
    }
  };

  const checkPrerequisites = (): boolean => {
    // 检查认证状态
    if (!authState.isAuthenticated || !tokenManager.isTokenValid()) {
      message.error('登录状态已过期，请重新登录');
      return false;
    }

    return true;
  };

  const showDemoModeWarning = (): Promise<boolean> => {
    return new Promise((resolve) => {
      Modal.confirm({
        title: '当前为演示模式',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>系统当前运行在演示模式下，模板下载功能可能不可用。</p>
            <p>是否切换到真实API模式？</p>
          </div>
        ),
        okText: '切换到真实API',
        cancelText: '继续演示模式',
        onOk: async () => {
          const success = await switchToRealApi();
          resolve(success);
        },
        onCancel: () => {
          resolve(false);
        }
      });
    });
  };

  const downloadFile = (blob: Blob, filename: string) => {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL对象
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('文件下载失败:', error);
      return false;
    }
  };

  const handleDownload = async () => {
    // 检查前置条件
    if (!checkPrerequisites()) {
      return;
    }

    // 如果是演示模式，询问是否切换
    if (isDemoMode) {
      const shouldSwitch = await showDemoModeWarning();
      if (!shouldSwitch) {
        return;
      }
    }

    setLoading(true);
    setProgress({
      percent: 0,
      status: 'active',
      message: '正在准备下载...'
    });

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev || prev.percent >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return {
            ...prev,
            percent: prev.percent + 10,
            message: '正在生成模板文件...'
          };
        });
      }, 100);

      const apiFunction = getApiFunction();
      const response = await apiFunction();

      clearInterval(progressInterval);
      setProgress({
        percent: 100,
        status: 'active',
        message: '正在下载文件...'
      });

      // 创建正确的Blob对象
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const filename = getFileName();
      const downloadSuccess = downloadFile(blob, filename);

      if (downloadSuccess) {
        setProgress({
          percent: 100,
          status: 'success',
          message: '下载完成'
        });
        
        message.success('模板下载成功');
        onSuccess?.();
      } else {
        throw new Error('文件下载失败');
      }

    } catch (error: any) {
      setProgress({
        percent: 0,
        status: 'exception',
        message: '下载失败'
      });

      const errorMessage = getErrorMessage(error);
      message.error(errorMessage);
      onError?.(error);
    } finally {
      setLoading(false);
      
      // 3秒后清除进度显示
      setTimeout(() => {
        setProgress(null);
      }, 3000);
    }
  };

  const getErrorMessage = (error: any): string => {
    if (error.response?.status === 401) {
      return '登录已过期，请重新登录';
    } else if (error.response?.status === 403) {
      return '权限不足，无法下载模板';
    } else if (error.response?.status === 404) {
      return '模板文件不存在，请联系管理员';
    } else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return '网络连接失败，请检查网络后重试';
    } else if (error.message?.includes('not supported')) {
      return '浏览器不支持文件下载，请使用现代浏览器';
    } else {
      return '模板下载失败：' + (error.response?.data?.message || error.message || '未知错误');
    }
  };

  return (
    <div>
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        onClick={handleDownload}
        loading={loading}
        disabled={disabled}
        size={size}
        block={block}
      >
        {getButtonText()}
      </Button>
      
      {progress && (
        <div style={{ marginTop: 8 }}>
          <Progress
            percent={progress.percent}
            status={progress.status}
            size="small"
            format={() => progress.message}
          />
        </div>
      )}
    </div>
  );
};

export default TemplateDownloadButton;