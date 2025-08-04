// 前端性能优化工具
import React from 'react';

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 图片懒加载
export const lazyLoadImage = (img: HTMLImageElement, src: string) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const image = entry.target as HTMLImageElement;
        image.src = src;
        image.classList.remove('lazy');
        observer.unobserve(image);
      }
    });
  });
  
  observer.observe(img);
};

// 虚拟滚动配置
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const calculateVirtualScrollItems = (
  scrollTop: number,
  totalItems: number,
  config: VirtualScrollConfig
) => {
  const { itemHeight, containerHeight, overscan = 5 } = config;
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    totalItems - 1
  );
  
  const start = Math.max(0, visibleStart - overscan);
  const end = Math.min(totalItems - 1, visibleEnd + overscan);
  
  return {
    start,
    end,
    offsetY: start * itemHeight,
    visibleItems: end - start + 1
  };
};

// 内存泄漏检测
export class MemoryLeakDetector {
  private static instance: MemoryLeakDetector;
  private listeners: Map<string, number> = new Map();
  private timers: Set<NodeJS.Timeout> = new Set();
  
  static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector();
    }
    return MemoryLeakDetector.instance;
  }
  
  trackEventListener(element: Element, event: string) {
    const key = `${element.tagName}-${event}`;
    this.listeners.set(key, (this.listeners.get(key) || 0) + 1);
  }
  
  untrackEventListener(element: Element, event: string) {
    const key = `${element.tagName}-${event}`;
    const count = this.listeners.get(key) || 0;
    if (count > 0) {
      this.listeners.set(key, count - 1);
    }
  }
  
  trackTimer(timer: NodeJS.Timeout) {
    this.timers.add(timer);
  }
  
  clearTimer(timer: NodeJS.Timeout) {
    clearTimeout(timer);
    this.timers.delete(timer);
  }
  
  getReport() {
    return {
      listeners: Object.fromEntries(this.listeners),
      activeTimers: this.timers.size,
      timestamp: new Date().toISOString()
    };
  }
  
  cleanup() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.listeners.clear();
  }
}

// 性能监控
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  startTiming(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      const existing = this.metrics.get(label) || [];
      existing.push(duration);
      
      // 只保留最近100次记录
      if (existing.length > 100) {
        existing.shift();
      }
      
      this.metrics.set(label, existing);
      
      // 记录慢操作
      if (duration > 100) {
        console.warn(`Slow operation: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  
  getMetrics(label: string) {
    const times = this.metrics.get(label) || [];
    if (times.length === 0) return null;
    
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    
    return {
      count: times.length,
      average: avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  getAllMetrics() {
    const result: Record<string, any> = {};
    this.metrics.forEach((_, label) => {
      result[label] = this.getMetrics(label);
    });
    return result;
  }
  
  clear() {
    this.metrics.clear();
  }
}

// 组件性能装饰器
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    const monitor = PerformanceMonitor.getInstance();
    
    React.useEffect(() => {
      const endTiming = monitor.startTiming(`${componentName}-mount`);
      return endTiming;
    }, []);
    
    const endRenderTiming = React.useMemo(() => {
      return monitor.startTiming(`${componentName}-render`);
    }, []);
    
    React.useEffect(() => {
      endRenderTiming();
    });
    
    return React.createElement(WrappedComponent, props);
  });
};

// 资源预加载
export const preloadResource = (url: string, type: 'script' | 'style' | 'image' = 'script') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  
  switch (type) {
    case 'script':
      link.as = 'script';
      break;
    case 'style':
      link.as = 'style';
      break;
    case 'image':
      link.as = 'image';
      break;
  }
  
  document.head.appendChild(link);
};

// 代码分割辅助函数
export const createAsyncComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  return React.lazy(() => {
    const monitor = PerformanceMonitor.getInstance();
    const endTiming = monitor.startTiming('code-split-load');
    
    return importFunc().finally(() => {
      endTiming();
    });
  });
};