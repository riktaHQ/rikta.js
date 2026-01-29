import React from 'react';
import { Layout } from './components/Layout.js';
import { HomePage } from './pages/HomePage.js';
import { ItemPage } from './pages/ItemPage.js';
import './App.css';

interface AppProps {
  url?: string;
  serverData?: Record<string, unknown>;
}

export function App({ url = '/', serverData = {} }: AppProps) {
  const page = serverData.page as string | undefined;
  const title = (serverData.title as string) || 'Rikta App';

  // Render the appropriate page based on the page prop from server
  const renderPage = () => {
    switch (page) {
      case 'item':
        return <ItemPage serverData={serverData} />;
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
