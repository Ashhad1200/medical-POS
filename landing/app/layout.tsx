import { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Archivo, Doto } from 'next/font/google';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

import '@/styles/globals.css';

// One variable family carries the whole marketing site: condensed widths for
// display type (like printed medicine packaging), normal width for reading.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

// Dot-matrix, only for batch numbers and expiry dates printed on objects.
const doto = Doto({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-doto',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    template: `%s | ${siteConfig.name}`,
    default: `${siteConfig.name}: pharmacy POS, online store and supplier ordering on one stock record`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'pharmacy POS',
    'medical store software',
    'pharmacy inventory',
    'batch and expiry tracking',
    'FEFO',
    'pharmacy online store',
    'supplier ordering',
    'Pakistan pharmacy software',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    url: '/',
    title: `${siteConfig.name}: sell it at the counter, your online store already knows`,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name}: one stock record for your counter, online store and suppliers`,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: '#f3f5f2',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn('h-full', archivo.variable, doto.variable)}>
      <body className="antialiased text-base">{children}</body>
    </html>
  );
}
