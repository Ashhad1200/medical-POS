'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { GA_ID, track } from '@/lib/analytics';

// The Google tag, as on treevoxa.com (cookie_domain 'auto' shares sessions across *.treevoxa.com), plus one
// delegated listener: any link or button with data-cta="<location>" sends click_cta for this product.
export function GoogleAnalytics({ product }: { product: string }) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-cta]');
      if (el) track('click_cta', { product, location: el.getAttribute('data-cta') });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [product]);

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
