import React from 'react';
import { Layout } from './components/Layout.js';
import { HomePage } from './pages/HomePage.js';
import './App.css';

interface AppProps {
  url?: string;
  serverData?: Record<string, unknown>;
}

export function App({ url = '/', serverData = {} }: AppProps) {
  const title = (serverData.title as string) || 'Rikta App';

  return (
    <Layout url={url} title={title}>
      <HomePage serverData={serverData} />
    </Layout>
  );
}
