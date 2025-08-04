import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { statisticsAPI } from '../../services/api';

// 统计数据接口
interface StatisticsState {
  dashboardStats: any;
  departmentStats: any;
  overviewStats: any;
  yearlyTrends: any;
  departmentComparison: any;
  loading: boolean;
  error: string | null;
}

// 初始状态
const initialState: StatisticsState = {
  dashboardStats: null,
  departmentStats: null,
  overviewStats: null,
  yearlyTrends: null,
  departmentComparison: null,
  loading: false,
  error: null,
};

// 异步操作 - 获取仪表板统计
export const fetchDashboardStats = createAsyncThunk(
  'statistics/fetchDashboardStats',
  async () => {
    const response = await statisticsAPI.getDashboardStats();
    return response.data;
  }
);

// 异步操作 - 获取科室统计
export const fetchDepartmentStatistics = createAsyncThunk(
  'statistics/fetchDepartmentStatistics',
  async ({ departmentId, params }: { departmentId: number; params?: any }) => {
    const response = await statisticsAPI.getDepartmentStatistics(departmentId, params);
    return response.data;
  }
);

// 异步操作 - 获取概览统计
export const fetchOverviewStatistics = createAsyncThunk(
  'statistics/fetchOverviewStatistics',
  async (params: any = {}) => {
    const response = await statisticsAPI.getOverviewStatistics(params);
    return response.data;
  }
);

// 异步操作 - 获取年度趋势
export const fetchYearlyTrends = createAsyncThunk(
  'statistics/fetchYearlyTrends',
  async (params: any = {}) => {
    const response = await statisticsAPI.getYearlyTrends(params);
    return response.data;
  }
);

// 异步操作 - 获取科室对比
export const fetchDepartmentComparison = createAsyncThunk(
  'statistics/fetchDepartmentComparison',
  async (params: any) => {
    const response = await statisticsAPI.getDepartmentsComparison(params);
    return response.data;
  }
);

// 创建slice
const statisticsSlice = createSlice({
  name: 'statistics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 仪表板统计
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardStats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取仪表板统计失败';
      })
      
      // 科室统计
      .addCase(fetchDepartmentStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartmentStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.departmentStats = action.payload;
      })
      .addCase(fetchDepartmentStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取科室统计失败';
      })
      
      // 概览统计
      .addCase(fetchOverviewStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOverviewStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.overviewStats = action.payload;
      })
      .addCase(fetchOverviewStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取概览统计失败';
      })
      
      // 年度趋势
      .addCase(fetchYearlyTrends.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchYearlyTrends.fulfilled, (state, action) => {
        state.loading = false;
        state.yearlyTrends = action.payload;
      })
      .addCase(fetchYearlyTrends.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取年度趋势失败';
      })
      
      // 科室对比
      .addCase(fetchDepartmentComparison.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartmentComparison.fulfilled, (state, action) => {
        state.loading = false;
        state.departmentComparison = action.payload;
      })
      .addCase(fetchDepartmentComparison.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取科室对比失败';
      });
  },
});

export const { clearError } = statisticsSlice.actions;
export default statisticsSlice.reducer;