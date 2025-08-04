import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { journalAPI } from '../../services/api';

// 期刊接口定义
export interface Journal {
  id: number;
  name: string;
  issn?: string;
  impactFactor: number;
  quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  category: string;
  publisher?: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}

// 搜索参数接口
interface JournalSearchParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  quartile?: string;
  category?: string;
  year?: number;
  impactFactorMin?: number;
  impactFactorMax?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// 状态接口
interface JournalState {
  journals: Journal[];
  currentJournal: Journal | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  searchParams: JournalSearchParams;
  categories: string[];
  statistics: any;
}

// 初始状态
const initialState: JournalState = {
  journals: [],
  currentJournal: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  },
  searchParams: {},
  categories: [],
  statistics: null,
};

// 异步操作 - 获取期刊列表
export const fetchJournals = createAsyncThunk(
  'journals/fetchJournals',
  async (params: JournalSearchParams = {}) => {
    const response = await journalAPI.getJournals(params);
    return response.data;
  }
);

// 异步操作 - 获取单个期刊
export const fetchJournal = createAsyncThunk(
  'journals/fetchJournal',
  async (id: number) => {
    const response = await journalAPI.getJournal(id);
    return response.data.data;
  }
);

// 异步操作 - 创建期刊
export const createJournal = createAsyncThunk(
  'journals/createJournal',
  async (journalData: Partial<Journal>) => {
    const response = await journalAPI.createJournal(journalData);
    return response.data.data;
  }
);

// 异步操作 - 更新期刊
export const updateJournal = createAsyncThunk(
  'journals/updateJournal',
  async ({ id, data }: { id: number; data: Partial<Journal> }) => {
    const response = await journalAPI.updateJournal(id, data);
    return response.data.data;
  }
);

// 异步操作 - 删除期刊
export const deleteJournal = createAsyncThunk(
  'journals/deleteJournal',
  async (id: number) => {
    await journalAPI.deleteJournal(id);
    return id;
  }
);

// 异步操作 - 搜索期刊
export const searchJournals = createAsyncThunk(
  'journals/searchJournals',
  async (keyword: string) => {
    const response = await journalAPI.searchJournals(keyword);
    return response.data.data;
  }
);

// 异步操作 - 获取期刊类别
export const fetchJournalCategories = createAsyncThunk(
  'journals/fetchJournalCategories',
  async () => {
    const response = await journalAPI.getJournalCategories();
    return response.data.data;
  }
);

// 异步操作 - 获取期刊统计
export const fetchJournalStatistics = createAsyncThunk(
  'journals/fetchJournalStatistics',
  async () => {
    const response = await journalAPI.getJournalStatistics();
    return response.data.data;
  }
);

// 创建slice
const journalSlice = createSlice({
  name: 'journals',
  initialState,
  reducers: {
    setSearchParams: (state, action: PayloadAction<JournalSearchParams>) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    clearCurrentJournal: (state) => {
      state.currentJournal = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取期刊列表
      .addCase(fetchJournals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJournals.fulfilled, (state, action) => {
        state.loading = false;
        state.journals = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchJournals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取期刊列表失败';
      })
      
      // 获取单个期刊
      .addCase(fetchJournal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJournal.fulfilled, (state, action) => {
        state.loading = false;
        state.currentJournal = action.payload;
      })
      .addCase(fetchJournal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取期刊详情失败';
      })
      
      // 创建期刊
      .addCase(createJournal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createJournal.fulfilled, (state, action) => {
        state.loading = false;
        state.journals.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createJournal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建期刊失败';
      })
      
      // 更新期刊
      .addCase(updateJournal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateJournal.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.journals.findIndex(j => j.id === action.payload.id);
        if (index !== -1) {
          state.journals[index] = action.payload;
        }
        if (state.currentJournal?.id === action.payload.id) {
          state.currentJournal = action.payload;
        }
      })
      .addCase(updateJournal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新期刊失败';
      })
      
      // 删除期刊
      .addCase(deleteJournal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteJournal.fulfilled, (state, action) => {
        state.loading = false;
        state.journals = state.journals.filter(j => j.id !== action.payload);
        state.pagination.total -= 1;
        if (state.currentJournal?.id === action.payload) {
          state.currentJournal = null;
        }
      })
      .addCase(deleteJournal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除期刊失败';
      })
      
      // 获取期刊类别
      .addCase(fetchJournalCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      
      // 获取期刊统计
      .addCase(fetchJournalStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
      });
  },
});

export const { setSearchParams, clearCurrentJournal, clearError } = journalSlice.actions;
export default journalSlice.reducer;