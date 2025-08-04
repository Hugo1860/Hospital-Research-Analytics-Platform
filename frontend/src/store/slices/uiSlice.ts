import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// UI状态接口
interface UIState {
  sidebarCollapsed: boolean;
  currentPage: string;
  breadcrumbs: Array<{ title: string; path?: string }>;
  loading: boolean;
  theme: 'light' | 'dark';
}

// 初始状态
const initialState: UIState = {
  sidebarCollapsed: false,
  currentPage: 'dashboard',
  breadcrumbs: [{ title: '首页' }],
  loading: false,
  theme: 'light',
};

// 创建slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<string>) => {
      state.currentPage = action.payload;
    },
    setBreadcrumbs: (state, action: PayloadAction<Array<{ title: string; path?: string }>>) => {
      state.breadcrumbs = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setCurrentPage,
  setBreadcrumbs,
  setLoading,
  setTheme,
} = uiSlice.actions;

export default uiSlice.reducer;