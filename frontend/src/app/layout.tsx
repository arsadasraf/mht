import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import StoreProvider from './StoreProvider';

export const metadata: Metadata = {
  title: 'Machine House - Winding Technologies | ETO ERP & Execution System',
  description: 'Engineer-to-Order Manufacturing Execution & Resource Planning System for Machine House - Winding Technologies ("House of Innovations.....")',
  icons: {
    icon: '/branding/mh_icon.png'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/branding/mh_icon.png" type="image/png" />
      </head>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
