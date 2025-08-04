import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { publicationAPI } from '../../services/api';

// 文献接口定义
export interface Publication {
  id: number;
  title: string;
  authors: string;
  journalId: number;
  departmentId: number;
  publishYear: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pmid?: string;
  journal: {
    id: number;
    name: string;
    impactFactor: number;
    quartile: string;
    category: string;
  };
  department: {
    id: number;
    name: string;
    code: string;
  };
  user: {
    id: number;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 分页参数接口
interface PaginationParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  departmentId?: number;
  journalId?: number;
  publishYear?: number;
  quartile?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// 状态接口
interface PublicationState {
  publications: Publication[];
  currentPublication: Publication | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  searchParams: PaginationParams;
}

// 初始状态
const initialState: PublicationState = {
  publications: [],
  currentPublication: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  },
  searchParams: {},
};

// 异步操作 - 获取文献列表
export const fetchPublications = createAsyncThunk(
  'publications/fetchPublications',
  async (params: PaginationParams = {}) => {
    const response = await publicationAPI.getPublications(params);
    return response.data;
  }
);

// 异步操作 - 获取单个文献
export const fetchPublication = createAsyncThunk(
  'publications/fetchPublication',
  async (id: number) => {
    const response = await publicationAPI.getPublication(id);
    return response.data.data;
  }
);

// 异步操作 - 创建文献
export const createPublication = createAsyncThunk(
  'publications/createPublication',
  async (publicationData: Partial<Publication>) => {
    const response = await publicationAPI.createPublication(publicationData);
    return response.data.data;
  }
);

// 异步操作 - 更新文献
export const updatePublication = createAsyncThunk(
  'publications/updatePublication',
  async ({ id, data }: { id: number; data: Partial<Publication> }) => {
    const response = await publicationAPI.updatePublication(id, data);
    return response.data.data;
  }
);

// 异步操作 - 删除文献
export const deletePublication = createAsyncThunk(
  'publications/deletePublication',
  async (id: number) => {
    await publicationAPI.deletePublication(id);
    return id;
  }
);

// 异步操作 - 期刊匹配
export const matchJournals = createAsyncThunk(
  'publications/matchJournals',
  async (name: string) => {
    const response = await publicationAPI.matchJournals(name);
    return response.data.data;
  }
);

// 创建slice
const publicationSlice = createSlice({
  name: 'publications',
  initialState,
  reducers: {
    setSearchParams: (state, action: PayloadAction<PaginationParams>) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    clearCurrentPublication: (state) => {
      state.currentPublication = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取文献列表
      .addCase(fetchPublications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublications.fulfilled, (state, action) => {
        state.loading = false;
        state.publications = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPublications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取文献列表失败';
      })
      
      // 获取单个文献
      .addCase(fetchPublication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublication.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPublication = action.payload;
      })
      .addCase(fetchPublication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取文献详情失败';
      })
      
      // 创建文献
      .addCase(createPublication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPublication.fulfilled, (state, action) => {
        state.loading = false;
        state.publications.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createPublication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建文献失败';
      })
      
      // 更新文献
      .addCase(updatePublication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePublication.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.publications.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.publications[index] = action.payload;
        }
        if (state.currentPublication?.id === action.payload.id) {
          state.currentPublication = action.payload;
        }
      })
      .addCase(updatePublication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新文献失败';
      })
      
      // 删除文献
      .addCase(deletePublication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePublication.fulfilled, (state, action) => {
        state.loading = false;
        state.publications = state.publications.filter(p => p.id !== action.payload);
        state.pagination.total -= 1;
        if (state.currentPublication?.id === action.payload) {
          state.currentPublication = null;
        }
      })
      .addCase(deletePublication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除文献失败';
      });
  },
});

export const { setSearchParams, clearCurrentPublication, clearError } = publicationSlice.actions;
export default publicationSlice.reducer;