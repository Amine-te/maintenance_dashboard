'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Data Explorer' },
    { href: '/kpis', label: 'KPIs & Analytics' },
    { href: '/raw-data', label: 'Raw Data' },
    { href: '/predictive-model', label: 'Predictive Model' },
  ];

  return (
    <header className={styles.navbar}>
      <div className={styles.logo}>
        PM<span>Dashboard</span>
      </div>
      <nav className={styles.nav}>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
