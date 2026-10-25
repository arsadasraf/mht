'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import AuthRehydrator from '../components/layout/AuthRehydrator';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthRehydrator />
      {children}
    </Provider>
  );
}
