export const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem',
  },
  logo: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2.5rem',
    background: 'linear-gradient(90deg, #00d9ff, #00ff88)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#888',
    fontSize: '1.2rem',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
    color: '#00d9ff',
  },
  button: {
    background: 'linear-gradient(90deg, #00d9ff, #00ff88)',
    color: '#1a1a2e',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    marginRight: '0.5rem',
    transition: 'transform 0.2s',
  },
  counter: {
    fontSize: '3rem',
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    margin: '1rem 0',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
  },
  featureItem: {
    padding: '0.75rem 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  badge: {
    background: 'rgba(0, 217, 255, 0.2)',
    color: '#00d9ff',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: '3rem',
    color: '#666',
  },
  link: {
    color: '#00d9ff',
    textDecoration: 'none',
  },
};
