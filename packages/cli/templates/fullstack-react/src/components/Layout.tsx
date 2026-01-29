import React from 'react';
import { styles } from './styles.js';

interface LayoutProps {
  url: string;
  title: string;
  children: React.ReactNode;
}

export function Layout({ url, title, children }: LayoutProps) {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>🚀</div>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.subtitle}>A fullstack TypeScript framework with SSR</p>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Current route: <code style={{ color: '#00ff88' }}>{url}</code>
        </p>
      </header>

      {children}

      <footer style={styles.footer}>
        <p>
          Built with{' '}
          <a href="https://github.com/riktar/riktajs" style={styles.link}>
            Rikta Framework
          </a>
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <span style={styles.badge}>SSR Enabled</span>
          <span style={{ ...styles.badge, marginLeft: '0.5rem' }}>Decorator-Based</span>
        </p>
      </footer>
    </div>
  );
}
