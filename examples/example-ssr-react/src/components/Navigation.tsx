import React from 'react';
import { styles } from './styles.js';

interface NavigationProps {
  currentPath: string;
}

export function Navigation({ currentPath }: NavigationProps) {
  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/user/1', label: 'User' },
    { href: '/search', label: 'Search' },
  ];

  return (
    <nav style={styles.nav}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          style={{
            ...styles.navLink,
            background: currentPath === link.href ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
          }}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
