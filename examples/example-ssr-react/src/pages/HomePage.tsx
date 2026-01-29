import React, { useState } from 'react';
import { styles } from '../components/styles.js';

interface HomePageProps {
  serverData: Record<string, unknown>;
}

export function HomePage({ serverData }: HomePageProps) {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');

  const features = [
    { icon: '⚡', title: 'Vite-powered', desc: 'Blazing fast HMR and builds' },
    { icon: '⚛️', title: 'React 19', desc: 'Latest React with SSR support' },
    { icon: '🚀', title: 'Fastify', desc: 'High-performance HTTP server' },
    { icon: '🎯', title: 'TypeScript', desc: 'Full type safety' },
    { icon: '💎', title: '@riktajs/ssr', desc: 'Decorator-based SSR routing' },
  ];

  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/hello');
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Error fetching from API');
    }
  };

  return (
    <>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🎉 Decorator-Based SSR</h2>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          This page is rendered using the new <code>@SsrController()</code> and <code>@Ssr()</code> decorators.
          Define SSR routes just like API routes!
        </p>
        <pre style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          color: '#00ff88',
          fontSize: '0.85rem',
        }}>
{`@SsrController()
class PageController {
  @Get('/')
  @Ssr({ title: 'Home Page' })
  home() {
    return { page: 'home', user: null };
  }
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
        <h2 style={styles.cardTitle}>API Integration</h2>
        <button style={styles.button} onClick={handleApiCall}>
          Call /api/hello
        </button>
        {message && (
          <p style={{ marginTop: '1rem', color: '#00ff88' }}>Response: {message}</p>
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
        <h2 style={styles.cardTitle}>Server Data (from @Ssr context)</h2>
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
