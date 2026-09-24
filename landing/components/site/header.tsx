'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { appUrls } from '@/config/site';
import { cn } from '@/lib/utils';
import { Wordmark } from './mark';

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#product', label: 'Product' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'Questions' },
];

const loadMenu = () => import('./mobile-menu');
const MobileMenu = dynamic(loadMenu, { ssr: false });

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openMenu = () => {
    setMenuMounted(true);
    setOpen(true);
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 h-[var(--pf-header-h)] transition-[background-color,box-shadow] duration-300',
        scrolled
          ? 'bg-paper/92 shadow-[0_1px_0_rgb(14_43_34/0.08)] backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <div className="pf-wrap flex h-full items-center justify-between gap-6">
        <Link href="/" aria-label="PharmaFlow home" className="rounded-md">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[0.95rem] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <a
            href={appUrls.pos}
            className="text-[0.95rem] font-medium text-ink-soft hover:text-ink"
          >
            Sign in
          </a>
          <Link href="/signup" className="pf-btn pf-btn--sm">
            Start free trial
          </Link>
        </div>

        <button
          type="button"
          onClick={openMenu}
          // fetch the menu code as soon as a tap or focus looks likely
          onPointerEnter={loadMenu}
          onTouchStart={loadMenu}
          onFocus={loadMenu}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[0.95rem] font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--color-foil-deep)] lg:hidden"
        >
          Menu
        </button>
        {menuMounted && (
          <MobileMenu open={open} onOpenChange={setOpen} items={NAV} />
        )}
      </div>
    </header>
  );
}
