import type { ReactNode } from 'react';
import { GoogleAnalytics } from '@/components/site/google-analytics';

// The marketing pages (landing and sign-up) load Google Analytics; the pharmacies' own stores under /store do not.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <GoogleAnalytics product="pharmaflow" />
    </>
  );
}
