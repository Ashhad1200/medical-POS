import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <div className="text-3xl font-bold text-foreground">404</div>
      <p className="text-muted-foreground">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to PharmaFlow
      </Link>
    </div>
  );
}
