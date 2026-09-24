import { ReactNode } from 'react';
import { Inter } from 'next/font/google';

// The consumer storefront is white-label per pharmacy, so it keeps its own
// neutral face instead of the PharmaFlow marketing type.
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function StoreLayout({ children }: { children: ReactNode }) {
  return <div className={inter.className}>{children}</div>;
}
