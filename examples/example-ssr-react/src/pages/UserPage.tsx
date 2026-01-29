import React from 'react';
import { styles } from '../components/styles.js';

interface UserPageProps {
  serverData: Record<string, unknown>;
}

export function UserPage({ serverData }: UserPageProps) {
  const user = serverData.user as { id: string; name: string; bio: string } | null;
  const notFound = serverData.notFound as boolean;

  if (notFound || !user) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>User Not Found</h2>
        <p style={{ color: '#888' }}>
          The user you're looking for doesn't exist.
        </p>
        <a href="/user/1" style={styles.link}>Try User #1</a>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>👤 {user.name}</h2>
      <p style={{ color: '#888', marginBottom: '1rem' }}>{user.bio}</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <span style={styles.badge}>ID: {user.id}</span>
      </div>
      
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Try other users:</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          {['1', '2', '3'].map((id) => (
            <a
              key={id}
              href={`/user/${id}`}
              style={{
                ...styles.navLink,
                background: user.id === id ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
              }}
            >
              User {id}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
