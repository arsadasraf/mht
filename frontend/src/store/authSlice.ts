import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthState } from '../types/auth';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken?: string } | User | null>
    ) => {
      if (!action.payload) {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      } else if ('user' in action.payload) {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken || null;
        state.isAuthenticated = !!action.payload.user;
      } else {
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
      }
      state.isLoading = false;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }
  }
});

export const { setCredentials, clearCredentials, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
