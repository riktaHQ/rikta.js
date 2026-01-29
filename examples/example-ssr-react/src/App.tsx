import React from 'react';
import { Layout } from './components/Layout.js';
import { HomePage } from './pages/HomePage.js';
import { AboutPage } from './pages/AboutPage.js';
import { UserPage } from './pages/UserPage.js';
import { SearchPage } from './pages/SearchPage.js';

interface AppProps {
  url?: string;
  serverData?: Record<string, unknown>;
}

export function App({ url = '/', serverData = {} }: AppProps) {
  const page = serverData.page as string | undefined;
  const title = (serverData.title as string) || 'Rikta SSR + React';

  // Render the appropriate page based on the page prop from server
  const renderPage = () => {
    switch (page) {
      case 'about':
        return <AboutPage serverData={serverData} />;
      case 'user':
        return <UserPage serverData={serverData} />;
      case 'search':
        return <SearchPage serverData={serverData} />;
      case 'home':
      default:
        return <HomePage serverData={serverData} />;
    }
  };

  return (
    <Layout url={url} title={title}>
      {renderPage()}
    </Layout>
  );
}
