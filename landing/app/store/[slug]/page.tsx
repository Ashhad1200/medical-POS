import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStore } from '@/lib/storefront';
import StoreClient from './store-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStore(slug).catch(() => null);
  return { title: data ? `${data.store.displayName} — Order online` : 'Store' };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getStore(slug).catch(() => null);
  if (!data) notFound();

  return (
    <StoreClient
      slug={slug}
      store={data.store}
      products={data.products}
      banners={data.banners ?? []}
      featured={data.featured ?? []}
    />
  );
}
