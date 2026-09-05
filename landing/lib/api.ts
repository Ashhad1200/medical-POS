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

export async function getPublicPlans(): Promise<PublicPlan[]> {
  const res = await fetch(`${apiUrl}/public/plans`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load plans');
  const json = await res.json();
  return json.data as PublicPlan[];
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
  organization: { code: string; plan_status: string; access_valid_till: string | null };
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
