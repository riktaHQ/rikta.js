import React from 'react';
import { useLocation } from '@riktajs/react';
import { styles } from './styles.js';

export function Navigation() {
  const { pathname } = useLocation();

  const links = [
    { href: '/', label: 'Home', id: 'home' },
    { href: '/about', label: 'About', id: 'about' },
    { href: '/user/1', label: 'User', id: 'user' },
    { href: '/search', label: 'Search', id: 'search' },
  ];

  return (
    <nav style={styles.nav}>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.href}
          style={{
            ...styles.navLink,
            background: pathname === link.href ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
          }}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
