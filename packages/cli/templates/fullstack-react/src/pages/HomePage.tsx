import React, { useState } from 'react';
import { useSsrData, useFetch, Link } from '@riktajs/react';
import { styles } from '../components/styles.js';

interface HomePageData {
  page: string;
  timestamp: string;
  env: string;
}

export function HomePage() {
  const ssrData = useSsrData<HomePageData>();
  const serverData = ssrData?.data ?? {};
  const [count, setCount] = useState(0);
  
  // useFetch example - skip initial fetch, triggered manually
  const { data: apiData, loading, error, refetch } = useFetch<{ message: string }>('/api/hello', { skip: true });

  const features = [
    { icon: '⚡', title: 'Vite-powered', desc: 'Blazing fast HMR and builds' },
    { icon: '⚛️', title: 'React 19', desc: 'Latest React with SSR support' },
    { icon: '🚀', title: 'Fastify', desc: 'High-performance HTTP server' },
    { icon: '🎯', title: 'TypeScript', desc: 'Full type safety' },
    { icon: '💎', title: '@riktajs/react', desc: 'React hooks for SSR & routing' },
  ];

  return (
    <>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🎉 @riktajs/react Integration</h2>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          This page uses <code>useSsrData()</code> hook to access server data.
          Navigation uses <code>&lt;Link&gt;</code> component for client-side routing!
        </p>
        <pre style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          color: '#00ff88',
          fontSize: '0.85rem',
        }}>
{`import { useSsrData, Link, useFetch } from '@riktajs/react';

function HomePage() {
  const ssrData = useSsrData<PageData>();
  const { data, refetch } = useFetch('/api/hello');
  return <Link href="/item/1">View Item</Link>;
}`}
        </pre>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Interactive Counter</h2>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          Server-rendered and hydrated on the client:
        </p>
        <div style={styles.counter}>{count}</div>
        <div style={{ textAlign: 'center' }}>
          <button style={styles.button} onClick={() => setCount(c => c - 1)}>
            - Decrement
          </button>
          <button style={styles.button} onClick={() => setCount(c => c + 1)}>
            + Increment
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>API Integration with useFetch</h2>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          Using the <code>useFetch()</code> hook for data fetching:
        </p>
        <button style={styles.button} onClick={refetch} disabled={loading}>
          {loading ? 'Loading...' : 'Call /api/hello'}
        </button>
        {error && (
          <p style={{ marginTop: '1rem', color: '#ff6b6b' }}>Error: {error}</p>
        )}
        {apiData && (
          <p style={{ marginTop: '1rem', color: '#00ff88' }}>Response: {apiData.message}</p>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Features</h2>
        <ul style={styles.featureList}>
          {features.map((feature, index) => (
            <li key={index} style={styles.featureItem}>
              <span style={{ fontSize: '1.5rem' }}>{feature.icon}</span>
              <div>
                <strong>{feature.title}</strong>
                <span style={{ color: '#888', marginLeft: '0.5rem' }}>— {feature.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🔗 Dynamic Routes with Link</h2>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          Using <code>&lt;Link&gt;</code> component for client-side navigation:
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/item/1" style={{ ...styles.button, textDecoration: 'none', display: 'inline-block' }}>
            View Item #1
          </Link>
          <Link href="/item/2" style={{ ...styles.button, textDecoration: 'none', display: 'inline-block' }}>
            View Item #2
          </Link>
          <Link href="/item/3" style={{ ...styles.button, textDecoration: 'none', display: 'inline-block' }}>
            View Item #3
          </Link>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Server Data (from useSsrData hook)</h2>
        <pre style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          color: '#00ff88'
        }}>
          {JSON.stringify(serverData, null, 2) || '{}'}
        </pre>
      </div>
    </>
  );
}
