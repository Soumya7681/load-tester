'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'New test' },
  { href: '/reports', label: 'Reports' },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold text-primary">Load Tester</span>
          <span className="hidden text-xs text-muted sm:inline">local capacity checks</span>
        </Link>
        <nav aria-label="Main" className="flex gap-1">
          {LINKS.map(({ href, label }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-primary-soft text-primary' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
