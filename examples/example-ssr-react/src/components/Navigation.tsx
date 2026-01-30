import React from 'react';
import { Link, useLocation } from '@riktajs/react';
import { styles } from './styles.js';

export function Navigation() {
  const { pathname } = useLocation();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/user/1', label: 'User' },
    { href: '/search', label: 'Search' },
  ];

  return (
    <nav style={styles.nav}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          style={{
            ...styles.navLink,
            background: pathname === link.href ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
          }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
