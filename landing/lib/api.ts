import { apiUrl } from '@/config/site';

export type PublicPlan = {
  code: string;
  name: string;
  description: string | null;
  price_monthly: string | number;
  price_yearly: string | number;
  currency: string;
  max_users: number | null;
  max_products: number | null;
  trial_days: number;
  features: Record<string, boolean>;
};

type FetchInit = RequestInit & { next?: { revalidate?: number | false } };

export async function getPublicPlans(
  init: FetchInit = { cache: 'no-store' },
): Promise<PublicPlan[]> {
  const res = await fetch(`${apiUrl}/public/plans`, init);
  if (!res.ok) throw new Error('Failed to load plans');
  const json = await res.json();
  return json.data as PublicPlan[];
}

/**
 * For server rendering the marketing page: cached for 10 minutes, and never
 * throws. An empty list means the pricing section fetches on the client.
 */
export async function getPublicPlansSafe(): Promise<PublicPlan[]> {
  try {
    const plans = await getPublicPlans({ next: { revalidate: 600 } });
    return Array.isArray(plans) ? plans : [];
  } catch {
    return [];
  }
}

export type SignupInput = {
  organizationName: string;
  fullName: string;
  email: string;
  password: string;
  planCode?: string;
  phone?: string;
};

export type SignupResult = {
  token: string;
  user: { id: string; email: string; fullName: string };
  organization: {
    code: string;
    plan_status: string;
    access_valid_till: string | null;
  };
  plan: string;
};

export async function signup(input: SignupInput): Promise<SignupResult> {
  const res = await fetch(`${apiUrl}/public/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Sign-up failed');
  }
  return json.data as SignupResult;
}
