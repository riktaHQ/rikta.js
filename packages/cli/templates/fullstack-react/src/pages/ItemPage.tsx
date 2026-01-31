import React from 'react';
import { useSsrData } from '@riktajs/react';
import { styles } from '../components/styles.js';

interface ItemData {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
}

interface ItemPageData {
  page: string;
  item: ItemData | null;
  notFound: boolean;
}

export function ItemPage() {
  const ssrData = useSsrData<ItemPageData>();
  const item = ssrData?.data.item ?? null;
  const notFound = ssrData?.data.notFound ?? false;

  if (notFound || !item) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>❌ Item Not Found</h2>
        <p style={{ color: '#888', marginBottom: '1.5rem' }}>
          The item you're looking for doesn't exist.
        </p>
        <a href="/item/1" style={styles.link}>← Back to Item #1</a>
      </div>
    );
  }

  const availableItems = ['1', '2', '3'];

  return (
    <>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
          <h2 style={styles.cardTitle}>📦 {item.title}</h2>
          <span style={styles.badge}>{item.category}</span>
        </div>
        
        <p style={{ color: '#888', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          {item.description}
        </p>

        <div style={{ 
          background: 'rgba(0, 217, 255, 0.1)', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>Price</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff88' }}>
            ${item.price.toFixed(2)}
          </div>
        </div>

        <div style={{ 
          padding: '1rem', 
          background: 'rgba(0, 0, 0, 0.3)', 
          borderRadius: '8px',
          marginTop: '1rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.5rem' }}>Item ID</div>
          <code style={{ color: '#00ff88', fontSize: '1rem' }}>{item.id}</code>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={{ ...styles.cardTitle, fontSize: '1.2rem' }}>Browse Other Items</h3>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          Using native <code>&lt;a&gt;</code> tags for navigation:
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {availableItems.map((id) => (
            <a
              key={id}
              href={`/item/${id}`}
              style={{
                ...styles.button,
                background: item.id === id 
                  ? 'linear-gradient(90deg, #00d9ff, #00ff88)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: item.id === id ? '#1a1a2e' : '#00d9ff',
                border: item.id === id ? 'none' : '1px solid rgba(0, 217, 255, 0.3)',
                textDecoration: 'none',
                display: 'inline-block',
                textAlign: 'center',
              }}
            >
              Item #{id}
            </a>
          ))}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <a href="/" style={styles.link}>← Back to Home</a>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={{ ...styles.cardTitle, fontSize: '1.2rem' }}>Server Data (useSsrData hook)</h3>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          This data was fetched on the server and accessed via <code>useSsrData()</code>:
        </p>
        <pre style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          color: '#00ff88',
          fontSize: '0.875rem'
        }}>
          {JSON.stringify(ssrData?.data, null, 2)}
        </pre>
      </div>
    </>
  );
}
