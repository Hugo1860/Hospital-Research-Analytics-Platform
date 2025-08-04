/**
 * 内存优化工具
 * 提供内存使用监控、清理和优化功能
 */

// 内存使用信息接口
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// 内存监控配置
interface MemoryMonitorConfig {
  warningThreshold: number; // 警告阈值（百分比）
  criticalThreshold: number; // 危险阈值（百分比）
  checkInterval: number; // 检查间隔（毫秒）
  autoCleanup: boolean; // 是否自动清理
}

// 内存事件类型
type MemoryEventType = 'warning' | 'critical' | 'cleanup' | 'normal';

// 内存事件监听器
type MemoryEventListener = (eventType: MemoryEventType, memoryInfo: MemoryInfo) => void;

// 默认配置
const DEFAULT_CONFIG: MemoryMonitorConfig = {
  warningThreshold: 0.7, // 70%
  criticalThreshold: 0.9, // 90%
  checkInterval: 30000, // 30秒
  autoCleanup: true,
};

/**
 * 内存优化器类
 */
class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private config: MemoryMonitorConfig;
  private listeners: Set<MemoryEventListener> = new Set();
  private monitorInterval: NodeJS.Timeout | null = null;
  private lastMemoryInfo: MemoryInfo | null = null;
  private cleanupTasks: Array<() => void> = [];

  // 性能指标
  private metrics = {
    totalChecks: 0,
    warningCount: 0,
    criticalCount: 0,
    cleanupCount: 0,
    lastCleanupTime: 0,
  };

  private constructor(config: Partial<MemoryMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupDefaultCleanupTasks();
  }

  static getInstance(config?: Partial<MemoryMonitorConfig>): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer(config);
    }
    return MemoryOptimizer.instance;
  }

  /**
   * 开始内存监控
   */
  startMonitoring(): void {
    if (this.monitorInterval) {
      return; // 已经在监控中
    }

    console.log('[MemoryOptimizer] 开始内存监控');
    
    this.monitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.checkInterval);

    // 立即执行一次检查
    this.checkMemoryUsage();
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      console.log('[MemoryOptimizer] 停止内存监控');
    }
  }

  /**
   * 获取当前内存使用情况
   */
  getMemoryInfo(): MemoryInfo | null {
    if (!(performance as any).memory) {
      return null; // 浏览器不支持内存API
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }

  /**
   * 获取内存使用率
   */
  getMemoryUsageRatio(): number {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) {
      return 0;
    }

    return memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) {
      return;
    }

    this.metrics.totalChecks++;
    this.lastMemoryInfo = memoryInfo;

    const usageRatio = this.getMemoryUsageRatio();
    let eventType: MemoryEventType = 'normal';

    if (usageRatio >= this.config.criticalThreshold) {
      eventType = 'critical';
      this.metrics.criticalCount++;
      console.warn('[MemoryOptimizer] 内存使用达到危险水平:', {
        usageRatio: `${(usageRatio * 100).toFixed(1)}%`,
        usedMemory: this.formatBytes(memoryInfo.usedJSHeapSize),
        totalMemory: this.formatBytes(memoryInfo.totalJSHeapSize),
      });

      if (this.config.autoCleanup) {
        this.performCleanup();
      }
    } else if (usageRatio >= this.config.warningThreshold) {
      eventType = 'warning';
      this.metrics.warningCount++;
      console.warn('[MemoryOptimizer] 内存使用达到警告水平:', {
        usageRatio: `${(usageRatio * 100).toFixed(1)}%`,
        usedMemory: this.formatBytes(memoryInfo.usedJSHeapSize),
        totalMemory: this.formatBytes(memoryInfo.totalJSHeapSize),
      });
    }

    // 通知监听器
    this.notifyListeners(eventType, memoryInfo);
  }

  /**
   * 执行内存清理
   */
  performCleanup(): void {
    console.log('[MemoryOptimizer] 开始执行内存清理');
    
    const beforeMemory = this.getMemoryInfo();
    let cleanedTasks = 0;

    // 执行所有清理任务
    this.cleanupTasks.forEach((task, index) => {
      try {
        task();
        cleanedTasks++;
      } catch (error) {
        console.error(`[MemoryOptimizer] 清理任务 ${index} 执行失败:`, error);
      }
    });

    // 强制垃圾回收（如果支持）
    if ((window as any).gc) {
      try {
        (window as any).gc();
        console.log('[MemoryOptimizer] 执行了强制垃圾回收');
      } catch (error) {
        console.warn('[MemoryOptimizer] 强制垃圾回收失败:', error);
      }
    }

    const afterMemory = this.getMemoryInfo();
    this.metrics.cleanupCount++;
    this.metrics.lastCleanupTime = Date.now();

    if (beforeMemory && afterMemory) {
      const memoryFreed = beforeMemory.usedJSHeapSize - afterMemory.usedJSHeapSize;
      console.log('[MemoryOptimizer] 内存清理完成:', {
        cleanedTasks,
        memoryFreed: this.formatBytes(memoryFreed),
        beforeUsage: this.formatBytes(beforeMemory.usedJSHeapSize),
        afterUsage: this.formatBytes(afterMemory.usedJSHeapSize),
      });
    }

    // 通知监听器
    this.notifyListeners('cleanup', afterMemory || beforeMemory!);
  }

  /**
   * 添加清理任务
   */
  addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  /**
   * 移除清理任务
   */
  removeCleanupTask(task: () => void): void {
    const index = this.cleanupTasks.indexOf(task);
    if (index > -1) {
      this.cleanupTasks.splice(index, 1);
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: MemoryEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: MemoryEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentMemoryInfo: this.lastMemoryInfo,
      currentUsageRatio: this.getMemoryUsageRatio(),
      isMonitoring: this.monitorInterval !== null,
      cleanupTasksCount: this.cleanupTasks.length,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MemoryMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[MemoryOptimizer] 配置已更新:', this.config);
  }

  /**
   * 设置默认清理任务
   */
  private setupDefaultCleanupTasks(): void {
    // 清理过期的缓存数据
    this.addCleanupTask(() => {
      // 清理localStorage中的过期数据
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('_cache_') && key.includes('_expiry_')) {
          try {
            const expiryKey = key.replace('_cache_', '_expiry_');
            const expiry = localStorage.getItem(expiryKey);
            if (expiry && Date.now() > parseInt(expiry)) {
              keysToRemove.push(key);
              keysToRemove.push(expiryKey);
            }
          } catch (error) {
            // 忽略解析错误，标记为待删除
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`[MemoryOptimizer] 清理localStorage项失败: ${key}`, error);
        }
      });

      if (keysToRemove.length > 0) {
        console.log(`[MemoryOptimizer] 清理了 ${keysToRemove.length} 个过期的localStorage项`);
      }
    });

    // 清理DOM中的事件监听器（如果有泄漏）
    this.addCleanupTask(() => {
      // 这里可以添加清理DOM事件监听器的逻辑
      // 例如清理已分离的DOM节点上的事件监听器
    });

    // 清理全局变量中的大对象
    this.addCleanupTask(() => {
      // 清理可能存在的全局缓存对象
      if ((window as any).__APP_CACHE__) {
        const cache = (window as any).__APP_CACHE__;
        const now = Date.now();
        let cleanedCount = 0;

        Object.keys(cache).forEach(key => {
          if (cache[key] && cache[key].expiry && now > cache[key].expiry) {
            delete cache[key];
            cleanedCount++;
          }
        });

        if (cleanedCount > 0) {
          console.log(`[MemoryOptimizer] 清理了 ${cleanedCount} 个全局缓存项`);
        }
      }
    });
  }

  /**
   * 通知监听器
   */
  private notifyListeners(eventType: MemoryEventType, memoryInfo: MemoryInfo): void {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, memoryInfo);
      } catch (error) {
        console.error('[MemoryOptimizer] 事件监听器执行失败:', error);
      }
    });
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.stopMonitoring();
    this.listeners.clear();
    this.cleanupTasks.length = 0;
  }
}

// 导出单例实例
export default MemoryOptimizer.getInstance();

// 导出类型
export type { MemoryInfo, MemoryMonitorConfig, MemoryEventType, MemoryEventListener };