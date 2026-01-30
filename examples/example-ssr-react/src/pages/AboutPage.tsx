import React from 'react';
import { useSsrData, Link } from '@riktajs/react';
import { styles } from '../components/styles.js';

interface AboutPageData {
  page: string;
  features: string[];
}

export function AboutPage() {
  const ssrData = useSsrData<AboutPageData>();
  const features = ssrData?.data?.features ?? [];

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>About Rikta SSR</h2>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>
        Rikta is a modern TypeScript framework that makes building fullstack applications simple and fast.
        With the new SSR decorators, you can define server-rendered pages using the same familiar patterns as API routes.
      </p>
      
      <h3 style={{ color: '#00d9ff', marginBottom: '1rem' }}>Key Features</h3>
      <ul style={styles.featureList}>
        {features.map((feature, index) => (
          <li key={index} style={styles.featureItem}>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0, 217, 255, 0.1)', borderRadius: '8px' }}>
        <h4 style={{ color: '#00d9ff', marginBottom: '0.5rem' }}>Example Usage</h4>
        <pre style={{ color: '#00ff88', fontSize: '0.85rem', margin: 0 }}>
{`@Get('/about')
@Ssr({ title: 'About', description: 'Learn more' })
about() {
  return { page: 'about', features: [...] };
}`}
        </pre>
      </div>
    </div>
  );
}
