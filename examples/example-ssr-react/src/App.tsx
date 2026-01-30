import React from 'react';
import { useSsrData, useLocation } from '@riktajs/react';
import { Layout } from './components/Layout.js';
import { HomePage } from './pages/HomePage.js';
import { AboutPage } from './pages/AboutPage.js';
import { UserPage } from './pages/UserPage.js';
import { SearchPage } from './pages/SearchPage.js';

interface SsrDataType {
  page?: string;
  title?: string;
  [key: string]: unknown;
}

export function App() {
  const ssrData = useSsrData<SsrDataType>();
  const { search } = useLocation();
  
  // Title comes from ssrData root level (set by @Ssr decorator)
  const title = ssrData?.title || 'Rikta SSR + React';
  
  // Use URL from ssrData for routing - this ensures data and route are in sync
  const ssrUrl = ssrData?.url ?? '/';
  const pathname = ssrUrl.split('?')[0];
  const url = search ? `${pathname}?${search}` : pathname;

  // Render the appropriate page based on ssrData URL (not from separate context)
  const renderPage = () => {
    if (pathname === '/about') {
      return <AboutPage />;
    }
    if (pathname.startsWith('/user/')) {
      return <UserPage />;
    }
    if (pathname === '/search') {
      return <SearchPage />;
    }
    // Default to home
    return <HomePage />;
  };

  return (
    <Layout url={url} title={title}>
      {renderPage()}
    </Layout>
  );
}
