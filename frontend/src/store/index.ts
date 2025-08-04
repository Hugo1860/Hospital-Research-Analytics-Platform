import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import publicationSlice from './slices/publicationSlice';
import journalSlice from './slices/journalSlice';
import statisticsSlice from './slices/statisticsSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    publications: publicationSlice,
    journals: journalSlice,
    statistics: statisticsSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;