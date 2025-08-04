import { useState, useEffect, useCallback } from 'react';
import ApiModeService, { ApiStatus } from '../services/apiModeService';

interface UseApiModeReturn {
  mode: 'demo' | 'real';
  status: ApiStatus | null;
  isLoading: boolean;
  isRealApiMode: boolean;
  isDemoMode: boolean;
  switchToRealApi: () => Promise<boolean>;
  setMode: (mode: 'demo' | 'real') => Promise<boolean>;
  checkHealth: () => Promise<ApiStatus>;
  refresh: () => void;
}

export const useApiMode = (): UseApiModeReturn => {
  const [mode, setModeState] = useState<'demo' | 'real'>('real');
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const apiModeService = ApiModeService.getInstance();

  // 初始化状态
  useEffect(() => {
    const currentMode = apiModeService.getCurrentMode();
    const lastStatus = apiModeService.getLastStatus();
    
    setModeState(currentMode);
    setStatus(lastStatus);
  }, [apiModeService]);

  // 检查健康状态
  const checkHealth = useCallback(async (): Promise<ApiStatus> => {
    setIsLoading(true);
    try {
      const healthStatus = await apiModeService.checkApiHealth();
      setStatus(healthStatus);
      
      // 如果API不可用且当前是真实模式，自动切换到演示模式
      if (!healthStatus.isAvailable && mode === 'real') {
        const config = apiModeService.getConfig();
        if (config.fallbackToDemo) {
          await setModeInternal('demo');
        }
      }
      
      return healthStatus;
    } finally {
      setIsLoading(false);
    }
  }, [apiModeService, mode]);

  // 设置模式的内部方法
  const setModeInternal = useCallback(async (newMode: 'demo' | 'real'): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = await apiModeService.setMode(newMode);
      if (success) {
        setModeState(newMode);
        
        // 如果切换到真实模式，检查健康状态
        if (newMode === 'real') {
          await checkHealth();
        }
      }
      return success;
    } catch (error) {
      console.error('设置API模式失败:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiModeService, checkHealth]);

  // 切换到真实API
  const switchToRealApi = useCallback(async (): Promise<boolean> => {
    return await setModeInternal('real');
  }, [setModeInternal]);

  // 刷新状态
  const refresh = useCallback(() => {
    checkHealth();
  }, [checkHealth]);

  // 定期检查健康状态
  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'real') {
        checkHealth();
      }
    }, 60000); // 每分钟检查一次

    return () => clearInterval(interval);
  }, [mode, checkHealth]);

  return {
    mode,
    status,
    isLoading,
    isRealApiMode: mode === 'real',
    isDemoMode: mode === 'demo',
    switchToRealApi,
    setMode: setModeInternal,
    checkHealth,
    refresh
  };
};