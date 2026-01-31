import React from 'react';
import { useSsrData, useSearchParams, useNavigate } from '@riktajs/react';
import { styles } from '../components/styles.js';

interface SearchPageData {
  page: string;
  query: string;
  results: Array<{ id: number; title: string; type: string }>;
  total: number;
}

export function SearchPage() {
  const ssrData = useSsrData<SearchPageData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const query = ssrData?.data?.query || '';
  const results = ssrData?.data?.results || [];
  const total = ssrData?.data?.total || 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get('q') as string;
    // Use client-side navigation with search params
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>🔍 Search</h2>
      
      <form onSubmit={handleSubmit}>
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
