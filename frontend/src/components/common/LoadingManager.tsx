import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Spin, Progress, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

// 加载状态类型
interface LoadingState {
  id: string;
  message?: string;
  progress?: number;
  type: 'spin' | 'progress' | 'silent';
  priority: number;
  startTime: number;
  timeout?: number;
}

// 加载管理器上下文
interface LoadingContextType {
  startLoading: (id: string, options?: Partial<LoadingState>) => void;
  stopLoading: (id: string) => void;
  updateProgress: (id: string, progress: number, message?: string) => void;
  isLoading: (id?: string) => boolean;
  getLoadingStates: () => LoadingState[];
}

const LoadingContext = createContext<LoadingContextType | null>(null);

// 默认配置
const DEFAULT_LOADING_OPTIONS: Omit<LoadingState, 'id' | 'startTime'> = {
  type: 'spin',
  priority: 0,
  timeout: 30000, // 30秒超时
};

// 加载管理器提供者组件
export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 开始加载
  const startLoading = useCallback((id: string, options: Partial<LoadingState> = {}) => {
    const loadingState: LoadingState = {
      id,
      ...DEFAULT_LOADING_OPTIONS,
      ...options,
      startTime: Date.now(),
    };

    setLoadingStates(prev => {
      const newStates = new Map(prev);
      newStates.set(id, loadingState);
      return newStates;
    });

    // 设置超时处理
    if (loadingState.timeout && loadingState.timeout > 0) {
      const timeoutId = setTimeout(() => {
        console.warn(`[LoadingManager] 加载超时: ${id}`);
        stopLoading(id);
        message.warning(`操作超时，请重试`);
      }, loadingState.timeout);

      timeoutRefs.current.set(id, timeoutId);
    }

    console.log(`[LoadingManager] 开始加载: ${id}`, loadingState);
  }, []);

  // 停止加载
  const stopLoading = useCallback((id: string) => {
    setLoadingStates(prev => {
      const newStates = new Map(prev);
      const state = newStates.get(id);
      
      if (state) {
        const duration = Date.now() - state.startTime;
        console.log(`[LoadingManager] 停止加载: ${id}, 耗时: ${duration}ms`);
        newStates.delete(id);
      }
      
      return newStates;
    });

    // 清除超时定时器
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
  }, []);

  // 更新进度
  const updateProgress = useCallback((id: string, progress: number, message?: string) => {
    setLoadingStates(prev => {
      const newStates = new Map(prev);
      const state = newStates.get(id);
      
      if (state) {
        newStates.set(id, {
          ...state,
          progress: Math.max(0, Math.min(100, progress)),
          message: message || state.message,
        });
      }
      
      return newStates;
    });
  }, []);

  // 检查是否正在加载
  const isLoading = useCallback((id?: string) => {
    if (id) {
      return loadingStates.has(id);
    }
    return loadingStates.size > 0;
  }, [loadingStates]);

  // 获取所有加载状态
  const getLoadingStates = useCallback(() => {
    return Array.from(loadingStates.values()).sort((a, b) => b.priority - a.priority);
  }, [loadingStates]);

  // 清理超时定时器
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  const contextValue: LoadingContextType = {
    startLoading,
    stopLoading,
    updateProgress,
    isLoading,
    getLoadingStates,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      <LoadingOverlay />
    </LoadingContext.Provider>
  );
};

// 加载覆盖层组件
const LoadingOverlay: React.FC = () => {
  const context = useContext(LoadingContext);
  if (!context) return null;

  const { getLoadingStates } = context;
  const loadingStates = getLoadingStates();
  
  // 获取最高优先级的加载状态
  const primaryLoading = loadingStates.find(state => state.type !== 'silent');
  
  if (!primaryLoading) return null;

  const renderLoadingContent = () => {
    switch (primaryLoading.type) {
      case 'progress':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Progress
              type="circle"
              percent={primaryLoading.progress || 0}
              size={80}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            {primaryLoading.message && (
              <div style={{ color: '#666', fontSize: '14px', lineHeight: 1.5, marginTop: 16 }}>
                {primaryLoading.message}
              </div>
            )}
          </div>
        );
      
      case 'spin':
      default:
        return (
          <div>
            <Spin
              size="large"
              indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            />
            {primaryLoading.message && (
              <div style={{ color: '#666', fontSize: '14px', lineHeight: 1.5, marginTop: 16 }}>
                {primaryLoading.message}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(2px)'
      }} />
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        padding: '24px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        minWidth: '200px'
      }}>
        {renderLoadingContent()}
      </div>
    </div>
  );
};

// Hook for using loading manager
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// 高阶组件：为组件添加加载状态管理
export const withLoading = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  loadingId?: string
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const loading = useLoading();
    const componentLoadingId = loadingId || WrappedComponent.displayName || WrappedComponent.name || 'component';

    const enhancedProps = {
      ...props,
      startLoading: (options?: Partial<LoadingState>) => loading.startLoading(componentLoadingId, options),
      stopLoading: () => loading.stopLoading(componentLoadingId),
      updateProgress: (progress: number, message?: string) => loading.updateProgress(componentLoadingId, progress, message),
      isLoading: () => loading.isLoading(componentLoadingId),
    } as P & {
      startLoading: (options?: Partial<LoadingState>) => void;
      stopLoading: () => void;
      updateProgress: (progress: number, message?: string) => void;
      isLoading: () => boolean;
    };

    return <WrappedComponent {...enhancedProps} ref={ref} />;
  });
};

// 加载状态装饰器Hook
export const useLoadingState = (id: string) => {
  const loading = useLoading();
  
  return {
    start: (options?: Partial<LoadingState>) => loading.startLoading(id, options),
    stop: () => loading.stopLoading(id),
    updateProgress: (progress: number, message?: string) => loading.updateProgress(id, progress, message),
    isLoading: () => loading.isLoading(id),
  };
};

export default LoadingProvider;