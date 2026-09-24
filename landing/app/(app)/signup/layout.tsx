import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Start your free trial',
  description:
    'Set up your pharmacy on PharmaFlow in a few minutes: counter checkout, batch and expiry tracking, and on Pro your own online store.',
  alternates: { canonical: '/signup' },
};

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}
