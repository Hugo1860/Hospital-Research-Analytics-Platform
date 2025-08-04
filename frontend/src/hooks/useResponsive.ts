import { useState, useEffect } from 'react';

interface BreakpointMap {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  xxl: boolean;
}

const useResponsive = (): BreakpointMap => {
  const [breakpoints, setBreakpoints] = useState<BreakpointMap>({
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    xxl: false,
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      
      setBreakpoints({
        xs: width < 576,
        sm: width >= 576 && width < 768,
        md: width >= 768 && width < 992,
        lg: width >= 992 && width < 1200,
        xl: width >= 1200 && width < 1600,
        xxl: width >= 1600,
      });
    };

    // 初始化
    updateBreakpoints();

    // 监听窗口大小变化
    window.addEventListener('resize', updateBreakpoints);

    return () => {
      window.removeEventListener('resize', updateBreakpoints);
    };
  }, []);

  return breakpoints;
};

export default useResponsive;