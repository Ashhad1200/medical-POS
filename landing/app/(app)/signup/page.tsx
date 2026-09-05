'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/logo';
import { appUrls } from '@/config/site';
import { getPublicPlans, signup, type PublicPlan } from '@/lib/api';

function SignupForm() {
  const params = useSearchParams();
  const planFromUrl = params.get('plan') || 'basic';

  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [form, setForm] = useState({
    organizationName: '',
    fullName: '',
    email: '',
    password: '',
    planCode: planFromUrl,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; plan: string } | null>(null);

  useEffect(() => {
    getPublicPlans()
      .then((p) => {
        setPlans(p);
        if (!p.some((x) => x.code === planFromUrl) && p[0]) {
          setForm((f) => ({ ...f, planCode: p[0].code }));
        }
      })
      .catch(() => {});
  }, [planFromUrl]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const chosenPlan = plans.find((p) => p.code === form.planCode);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await signup(form);
      setDone({ email: res.user.email, plan: res.plan });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="w-full max-w-md text-center space-y-5">
        <CheckCircle2 className="mx-auto size-12 text-green-500" />
        <h1 className="text-2xl font-bold">Your store is ready</h1>
        <p className="text-muted-foreground">
          We created your workspace on the{' '}
          <span className="font-medium capitalize">{done.plan}</span> plan. Sign
          in with <span className="font-medium">{done.email}</span> and the
          password you just chose.
        </p>
        <Button size="lg" className="w-full" asChild>
          <a href={appUrls.pos}>
            Go to your dashboard
            <ArrowRight className="size-4" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Start your free trial</h1>
        <p className="text-sm text-muted-foreground">
          No credit card required.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizationName">Store / pharmacy name</Label>
        <Input
          id="organizationName"
          value={form.organizationName}
          onChange={set('organizationName')}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Your name</Label>
        <Input
          id="fullName"
          value={form.fullName}
          onChange={set('fullName')}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={form.password}
          onChange={set('password')}
          required
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>

      {plans.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="planCode">Plan</Label>
          <select
            id="planCode"
            value={form.planCode}
            onChange={(e) =>
              setForm((f) => ({ ...f, planCode: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} —{' '}
                {Number(p.price_monthly) === 0
                  ? 'Free'
                  : `$${p.price_monthly}/mo`}
                {p.trial_days ? ` · ${p.trial_days}-day trial` : ''}
              </option>
            ))}
          </select>
          {chosenPlan?.max_users && (
            <p className="text-xs text-muted-foreground">
              Up to {chosenPlan.max_users} team members on this plan.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {busy ? 'Creating your store…' : 'Create store'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href={appUrls.pos} className="text-indigo-600 hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-16 bg-gradient-to-br from-gray-50 dark:from-zinc-950 to-indigo-50 dark:to-zinc-950">
      <Link href="/">
        <Logo />
      </Link>
      <Suspense fallback={<Loader2 className="size-5 animate-spin" />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
