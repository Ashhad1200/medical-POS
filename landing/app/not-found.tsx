import Link from 'next/link';
import { Mark } from '@/components/site/mark';

export default function NotFound() {
  return (
    <main className="pf flex min-h-screen flex-col items-start justify-center">
      <div className="pf-wrap">
        <Mark className="size-12 text-cross" />
        <h1 className="pf-display pf-h2 mt-8 max-w-[16ch]">
          This page isn’t on the shelf.
        </h1>
        <p className="pf-body mt-4 text-ink-soft">
          The link may be old, or the address may have a typo.
        </p>
        <Link href="/" className="pf-btn mt-8">
          Back to PharmaFlow
        </Link>
      </div>
    </main>
  );
}
