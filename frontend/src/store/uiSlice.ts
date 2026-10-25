import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  fixHint?: string;
  timestamp: number;
}

export interface UiState {
  isSidebarCollapsed: boolean;
  isMobileDrawerOpen: boolean;
  isMoreSheetOpen: boolean;
  activeProjectId: string;
  toasts: ToastItem[];
}

const initialState: UiState = {
  isSidebarCollapsed: true, // Collapsed by default (icon-only rail)
  isMobileDrawerOpen: false,
  isMoreSheetOpen: false,
  activeProjectId: '',
  toasts: []
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebarCollapse: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    toggleMobileDrawer: (state) => {
      state.isMobileDrawerOpen = !state.isMobileDrawerOpen;
    },
    setMobileDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileDrawerOpen = action.payload;
    },
    toggleMoreSheet: (state) => {
      state.isMoreSheetOpen = !state.isMoreSheetOpen;
    },
    setMoreSheetOpen: (state, action: PayloadAction<boolean>) => {
      state.isMoreSheetOpen = action.payload;
    },
    setActiveProjectId: (state, action: PayloadAction<string>) => {
      state.activeProjectId = action.payload;
    },
    addToast: (
      state,
      action: PayloadAction<{
        id?: string;
        type?: 'success' | 'error' | 'warning' | 'info';
        title?: string;
        message: string;
        fixHint?: string;
      }>
    ) => {
      const id = action.payload.id || Date.now().toString() + Math.random().toString(36).substring(2, 5);
      state.toasts.push({
        id,
        type: action.payload.type || 'info',
        title: action.payload.title || '',
        message: action.payload.message || '',
        fixHint: action.payload.fixHint || '',
        timestamp: Date.now()
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    }
  }
});

export const {
  toggleSidebarCollapse,
  setSidebarCollapsed,
  toggleMobileDrawer,
  setMobileDrawerOpen,
  toggleMoreSheet,
  setMoreSheetOpen,
  setActiveProjectId,
  addToast,
  removeToast,
  clearToasts
} = uiSlice.actions;

export default uiSlice.reducer;
