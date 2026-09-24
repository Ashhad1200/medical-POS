'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckIcon, SpinnerIcon } from '@/components/site/icons';
import { Wordmark } from '@/components/site/mark';
import { appUrls } from '@/config/site';
import { getPublicPlans, signup, type PublicPlan } from '@/lib/api';
import { enabledFeatures, formatPrice, isFree, limitLabel } from '@/lib/plans';
import { cn } from '@/lib/utils';

const input =
  'block h-12 w-full rounded-[10px] border border-foil-deep bg-white px-4 text-[1rem] text-ink placeholder:text-ink-soft/60 transition-colors focus:border-cross focus:outline-none focus:ring-2 focus:ring-cross/25';
const label = 'mb-1.5 block text-[0.9rem] font-semibold';

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
  const [done, setDone] = useState<{ email: string; plan: string } | null>(
    null,
  );

  useEffect(() => {
    getPublicPlans()
      .then((p) => {
        const sorted = [...p].sort(
          (a, b) => Number(a.price_monthly) - Number(b.price_monthly),
        );
        setPlans(sorted);
        if (!sorted.some((x) => x.code === planFromUrl) && sorted[0]) {
          setForm((f) => ({ ...f, planCode: sorted[0].code }));
        }
      })
      .catch(() => {});
  }, [planFromUrl]);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
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
      <div className="mx-auto w-full max-w-md py-10" role="status">
        <div className="grid size-12 place-items-center rounded-full bg-cross text-white">
          <CheckIcon className="size-6" strokeWidth={3} aria-hidden="true" />
        </div>
        <h1 className="pf-display pf-h2 mt-6">Your pharmacy is ready.</h1>
        <p className="pf-body mt-4 text-ink-soft">
          We set up your workspace on the{' '}
          <span className="font-semibold capitalize text-ink">{done.plan}</span>{' '}
          plan. Sign in with{' '}
          <span className="font-semibold text-ink">{done.email}</span> and the
          password you just chose.
        </p>
        <a href={appUrls.pos} className="pf-btn mt-8 w-full">
          Go to your dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="grid w-full lg:grid-cols-12 lg:gap-6">
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-md space-y-5 lg:col-span-6 lg:mx-0 lg:max-w-none lg:pr-12"
        noValidate={false}
      >
        <div>
          <h1 className="pf-display pf-h2">Start your free trial</h1>
          <p className="mt-3 text-ink-soft">
            No card needed. You can change plans later.
          </p>
        </div>

        <div>
          <label htmlFor="organizationName" className={label}>
            Pharmacy or store name
          </label>
          <input
            id="organizationName"
            className={input}
            autoComplete="organization"
            value={form.organizationName}
            onChange={set('organizationName')}
            required
          />
        </div>
        <div>
          <label htmlFor="fullName" className={label}>
            Your name
          </label>
          <input
            id="fullName"
            className={input}
            autoComplete="name"
            value={form.fullName}
            onChange={set('fullName')}
            required
          />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Work email
          </label>
          <input
            id="email"
            type="email"
            className={input}
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className={label}>
            Password
          </label>
          <input
            id="password"
            type="password"
            className={input}
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={set('password')}
            required
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="mt-1.5 text-[0.85rem] text-ink-soft">
            At least 8 characters.
          </p>
        </div>

        {plans.length > 0 && (
          <fieldset>
            <legend className={label}>Plan</legend>
            <div className="divide-y divide-foil overflow-hidden rounded-[10px] border border-foil-deep bg-white">
              {plans.map((p) => (
                <label
                  key={p.code}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
                    form.planCode === p.code && 'bg-cross-tint/60',
                  )}
                >
                  <input
                    type="radio"
                    name="planCode"
                    value={p.code}
                    checked={form.planCode === p.code}
                    onChange={() =>
                      setForm((f) => ({ ...f, planCode: p.code }))
                    }
                    className="size-4 accent-[var(--color-cross)]"
                  />
                  <span className="flex-1 font-semibold">{p.name}</span>
                  <span className="pf-num text-[0.9rem] text-ink-soft">
                    {isFree(p)
                      ? 'Free'
                      : `${formatPrice(Number(p.price_monthly), p.currency)}/month`}
                    {p.trial_days ? `, ${p.trial_days} days free` : ''}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-[10px] bg-amber-tint px-4 py-3 text-[0.95rem] text-amber-ink"
          >
            {error}
          </p>
        )}

        <button type="submit" className="pf-btn w-full" disabled={busy}>
          {busy && (
            <SpinnerIcon className="size-4 animate-spin" aria-hidden="true" />
          )}
          {busy ? 'Setting up your pharmacy…' : 'Create my pharmacy'}
        </button>

        <p className="text-center text-[0.95rem] text-ink-soft">
          Already using PharmaFlow?{' '}
          <a href={appUrls.pos} className="pf-link font-semibold text-ink">
            Sign in
          </a>
        </p>
      </form>

      <aside
        className="on-ink mt-12 hidden rounded-[14px] bg-ink p-10 text-paper lg:col-span-6 lg:mt-0 lg:block"
        aria-label="What you get"
      >
        <p className="text-[0.9rem] font-semibold text-ink-mute">
          {chosenPlan ? `On ${chosenPlan.name}` : 'On every plan'}
        </p>
        <p
          className="pf-display mt-3 text-[2.4rem]"
          style={{ fontStretch: '80%' }}
        >
          {chosenPlan && !isFree(chosenPlan)
            ? `${chosenPlan.trial_days} days free, then ${formatPrice(Number(chosenPlan.price_monthly), chosenPlan.currency)} a month.`
            : 'Free for as long as you like.'}
        </p>
        <ul className="mt-8 space-y-3">
          {(chosenPlan
            ? [
                limitLabel(chosenPlan.max_users, 'staff logins'),
                limitLabel(chosenPlan.max_products, 'products'),
                'Counter checkout and receipts',
                'Batch and expiry tracking, earliest expiry sold first',
                ...enabledFeatures(chosenPlan),
              ]
            : [
                'Counter checkout and receipts',
                'Batch and expiry tracking, earliest expiry sold first',
                'Staff roles',
              ]
          ).map((l) => (
            <li key={l} className="flex gap-3">
              <CheckIcon
                className="mt-1 size-4 shrink-0 text-cross-tint"
                strokeWidth={3}
                aria-hidden="true"
              />
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <p className="mt-10 border-t border-white/15 pt-6 text-[0.9rem] text-ink-mute">
          After you sign up: bring in your product list, add your staff, and
          make your first sale the same day.
        </p>
      </aside>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="pf min-h-screen">
      <header className="pf-wrap flex h-[var(--pf-header-h)] items-center">
        <Link href="/" aria-label="PharmaFlow home" className="rounded-md">
          <Wordmark />
        </Link>
      </header>
      <main className="pf-wrap pb-20 pt-6 lg:pt-12">
        <Suspense
          fallback={
            <SpinnerIcon
              className="mx-auto mt-24 size-6 animate-spin text-ink-soft"
              aria-label="Loading"
            />
          }
        >
          <SignupForm />
        </Suspense>
      </main>
    </div>
  );
}
