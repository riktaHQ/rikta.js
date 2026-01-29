import React from 'react';
import { styles } from '../components/styles.js';

interface SearchPageProps {
  serverData: Record<string, unknown>;
}

export function SearchPage({ serverData }: SearchPageProps) {
  const query = (serverData.query as string) || '';
  const results = (serverData.results as Array<{ id: number; title: string; type: string }>) || [];
  const total = (serverData.total as number) || 0;

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>🔍 Search</h2>
      
      <form action="/search" method="get">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search..."
          style={styles.searchInput}
        />
        <button type="submit" style={styles.button}>Search</button>
      </form>

      {query && (
        <p style={{ color: '#888', marginTop: '1rem' }}>
          Found {total} result{total !== 1 ? 's' : ''} for "{query}"
        </p>
      )}

      <div style={{ marginTop: '1rem' }}>
        {results.map((item) => (
          <div key={item.id} style={styles.resultItem}>
            <strong>{item.title}</strong>
            <span style={{ ...styles.badge, marginLeft: '0.5rem' }}>{item.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
