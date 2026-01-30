import React from 'react';
import { useSsrData, Link } from '@riktajs/react';
import { styles } from '../components/styles.js';

interface UserPageData {
  page: string;
  user: { id: string; name: string; bio: string } | null;
  notFound: boolean;
}

export function UserPage() {
  const ssrData = useSsrData<UserPageData>();
  const user = ssrData?.data?.user ?? null;
  const notFound = ssrData?.data?.notFound ?? false;

  if (notFound || !user) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>User Not Found</h2>
        <p style={{ color: '#888' }}>
          The user you're looking for doesn't exist.
        </p>
        <Link href="/user/1" style={styles.link}>Try User #1</Link>
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
            <Link
              key={id}
              href={`/user/${id}`}
              style={{
                ...styles.navLink,
                background: user.id === id ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
              }}
            >
              User {id}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
