'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckIcon, MinusIcon } from './icons';
import { getPublicPlans, type PublicPlan } from '@/lib/api';
import {
  FEATURE_LABELS,
  INCLUDED_EVERYWHERE,
  bestYearlyMonthsFree,
  formatPrice,
  isFree,
  limitLabel,
  priceFor,
  recommendPlan,
  yearlySaving,
  type BillingPeriod,
  type StoreProfile,
} from '@/lib/plans';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

const PRODUCT_OPTIONS = [150, 1000, 2000, 5000, 20000, 50000];

export default function Pricing({
  initialPlans,
}: {
  initialPlans: PublicPlan[];
}) {
  const [plans, setPlans] = useState<PublicPlan[]>(initialPlans);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>(
    initialPlans.length ? 'ready' : 'loading',
  );
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [profile, setProfile] = useState<StoreProfile>({
    staff: 3,
    products: 1000,
    onlineStore: false,
  });

  // the server couldn't reach the API when the page was built: try from here
  useEffect(() => {
    if (initialPlans.length) return;
    getPublicPlans()
      .then((p) => {
        setPlans(p);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [initialPlans.length]);

  const sorted = useMemo(
    () =>
      [...plans].sort(
        (a, b) => Number(a.price_monthly) - Number(b.price_monthly),
      ),
    [plans],
  );
  const rec = useMemo(() => recommendPlan(sorted, profile), [sorted, profile]);
  const monthsFree = bestYearlyMonthsFree(sorted);
  const featureKeys = Object.keys(FEATURE_LABELS).filter((k) =>
    sorted.some((p) => p.features?.[k]),
  );

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="border-t border-foil-deep/50 bg-paper"
    >
      <div className="pf-wrap py-24 lg:py-36">
        <h2 id="pricing-title" className="pf-display pf-h2 max-w-[20ch]">
          Pay for the size of your shop, not for extra modules.
        </h2>

        {status === 'loading' && (
          <div
            className="mt-16 h-[28rem] animate-pulse rounded-[10px] bg-foil/70"
            aria-label="Loading plans"
          />
        )}

        {status === 'error' && (
          <div className="mt-16 rounded-[10px] bg-paper-bright p-8 pf-shadow-paper">
            <p className="font-semibold">Prices didn’t load.</p>
            <p className="mt-2 text-ink-soft">
              Refresh the page to try again, or email{' '}
              <a
                className="pf-link font-semibold text-ink"
                href={`mailto:${siteConfig.email}?subject=Pricing`}
              >
                {siteConfig.email}
              </a>{' '}
              and we’ll send them over.
            </p>
          </div>
        )}

        {status === 'ready' && sorted.length > 0 && (
          <>
            <PlanFinder
              profile={profile}
              onChange={setProfile}
              rec={rec}
              period={period}
            />

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <PeriodToggle
                period={period}
                onChange={setPeriod}
                monthsFree={monthsFree}
              />
              <p className="pf-small text-ink-soft">
                Prices in {sorted[0].currency}. Per pharmacy, not per user.
              </p>
            </div>

            <div
              className={cn(
                'mt-6 grid overflow-hidden rounded-[10px] bg-paper-bright pf-shadow-paper',
                sorted.length >= 4
                  ? 'md:grid-cols-2 xl:grid-cols-4'
                  : 'md:grid-cols-3',
              )}
            >
              {sorted.map((plan) => {
                const fits = rec?.plan.code === plan.code;
                const price = priceFor(plan, period);
                const saving = yearlySaving(plan);
                return (
                  <article
                    key={plan.code}
                    aria-labelledby={`plan-${plan.code}`}
                    className={cn(
                      'relative flex flex-col border-foil px-6 pb-8 pt-9 [&:not(:first-child)]:border-t md:[&:nth-child(2n)]:border-l xl:[&:not(:first-child)]:border-l xl:[&:not(:first-child)]:border-t-0 md:[&:nth-child(-n+2)]:border-t-0',
                      fits && 'bg-cross-tint/40',
                    )}
                  >
                    {fits && (
                      <span
                        className="absolute inset-x-0 top-0 h-1 bg-cross"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <h3 id={`plan-${plan.code}`} className="pf-h3">
                        {plan.name}
                      </h3>
                      {fits && (
                        <span className="rounded-full bg-cross px-2.5 py-1 text-[0.72rem] font-semibold text-white">
                          Fits your shop
                        </span>
                      )}
                    </div>
                    <p className="mt-1 min-h-[2.8em] text-[0.92rem] text-ink-soft">
                      {plan.description}
                    </p>

                    <div className="mt-5 flex items-baseline gap-1.5">
                      <span className="pf-display pf-num text-[3.2rem] leading-none">
                        {formatPrice(price, plan.currency)}
                      </span>
                      {price > 0 && (
                        <span className="text-[0.9rem] text-ink-soft">
                          /{period === 'yearly' ? 'year' : 'month'}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 min-h-[1.5em] text-[0.84rem] text-ink-soft">
                      {isFree(plan)
                        ? 'Free for as long as you like'
                        : period === 'yearly' && saving.amount > 0
                          ? `Saves ${formatPrice(saving.amount, plan.currency)} a year`
                          : `${plan.trial_days} days free to start`}
                    </p>

                    <ul className="mt-6 space-y-2.5 text-[0.92rem]">
                      <li className="pf-num">
                        {limitLabel(plan.max_users, 'staff logins')}
                      </li>
                      <li className="pf-num">
                        {limitLabel(plan.max_products, 'products')}
                      </li>
                    </ul>

                    <ul className="mt-5 space-y-2.5 border-t border-foil pt-5 text-[0.9rem]">
                      {featureKeys.map((k) => {
                        const on = !!plan.features?.[k];
                        return (
                          <li
                            key={k}
                            className={cn(
                              'flex gap-2.5',
                              !on && 'hidden text-ink-soft md:flex',
                            )}
                          >
                            {on ? (
                              <CheckIcon
                                className="mt-0.5 size-4 shrink-0 text-cross"
                                strokeWidth={3}
                                aria-hidden="true"
                              />
                            ) : (
                              <MinusIcon
                                className="mt-0.5 size-4 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span>
                              <span className="sr-only">
                                {on ? 'Included: ' : 'Not included: '}
                              </span>
                              {FEATURE_LABELS[k]}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-auto pt-8">
                      <Link
                        href={`/signup?plan=${plan.code}`}
                        className={cn(
                          'pf-btn w-full',
                          !fits && 'pf-btn--ghost',
                        )}
                        aria-label={`${isFree(plan) ? 'Start free' : 'Start trial'} on ${plan.name}`}
                      >
                        {isFree(plan)
                          ? 'Start free'
                          : `Start ${plan.trial_days}-day trial`}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 grid gap-6 text-[0.95rem] md:grid-cols-2">
              <div>
                <p className="font-semibold">In every plan</p>
                <ul className="mt-2 space-y-1.5 text-ink-soft">
                  {INCLUDED_EVERYWHERE.map((l) => (
                    <li key={l} className="flex gap-2.5">
                      <CheckIcon
                        className="mt-1 size-4 shrink-0 text-cross"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:text-right">
                <p className="font-semibold">
                  Several branches, or something unusual?
                </p>
                <p className="mt-2 text-ink-soft">
                  Tell us how your shops work and we’ll set it up with you.{' '}
                  <a
                    className="pf-link font-semibold text-ink"
                    href={`mailto:${siteConfig.email}?subject=Setting%20up%20several%20branches`}
                  >
                    Email us
                  </a>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function PeriodToggle({
  period,
  onChange,
  monthsFree,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
  monthsFree: number;
}) {
  const name = useId();
  const opts: { value: BillingPeriod; label: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    {
      value: 'yearly',
      label: monthsFree ? `Yearly, ${monthsFree} months free` : 'Yearly',
    },
  ];
  return (
    <fieldset className="inline-flex rounded-full bg-foil p-1">
      <legend className="sr-only">Billing period</legend>
      {opts.map((o) => (
        <label key={o.value} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={period === o.value}
            onChange={() => onChange(o.value)}
            className="peer sr-only"
          />
          <span className="block rounded-full px-4 py-2 text-[0.9rem] font-semibold text-ink-soft transition-colors duration-200 peer-checked:bg-white peer-checked:text-ink peer-checked:shadow-[0_1px_2px_rgb(14_43_34/0.15)] peer-focus-visible:ring-2 peer-focus-visible:ring-cross">
            {o.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function PlanFinder({
  profile,
  onChange,
  rec,
  period,
}: {
  profile: StoreProfile;
  onChange: (p: StoreProfile) => void;
  rec: ReturnType<typeof recommendPlan>;
  period: BillingPeriod;
}) {
  const staffId = useId();
  const productsId = useId();
  const storeId = useId();
  // fill-in-the-blank fields: amber underline says "you can change this"
  const field =
    'mx-1 inline-block rounded-t-md border-b-[3px] border-amber bg-white/[0.06] px-2 py-0 font-bold text-paper transition-colors hover:bg-white/[0.12] focus:outline-none focus-visible:bg-white/[0.14] [&>option]:text-ink';

  return (
    <div className="mt-16 rounded-[10px] bg-ink px-6 py-8 text-paper on-ink sm:px-10 lg:mt-20 lg:py-10">
      <p className="text-[0.9rem] font-semibold text-ink-mute">
        Which plan fits? Change the underlined parts.
      </p>
      <p
        className="pf-display mt-3 text-[clamp(1.5rem,1.1rem+1.4vw,2.35rem)] leading-[1.35]"
        style={{ fontStretch: '84%', fontWeight: 700 }}
      >
        My shop has
        <label htmlFor={staffId} className="sr-only">
          Number of staff who need a login
        </label>
        <input
          id={staffId}
          type="number"
          min={1}
          max={500}
          inputMode="numeric"
          value={profile.staff}
          onChange={(e) =>
            onChange({
              ...profile,
              staff: Math.max(1, Math.min(500, Number(e.target.value) || 1)),
            })
          }
          className={cn(
            field,
            'w-[3.2ch] text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
          )}
        />
        people who need a login and
        <label htmlFor={productsId} className="sr-only">
          Number of products
        </label>
        <select
          id={productsId}
          value={profile.products}
          onChange={(e) =>
            onChange({ ...profile, products: Number(e.target.value) })
          }
          className={cn(field, 'cursor-pointer appearance-none pr-2')}
        >
          {PRODUCT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === 50000
                ? 'over 20,000'
                : `up to ${n.toLocaleString('en-US')}`}
            </option>
          ))}
        </select>
        products, and
        <label htmlFor={storeId} className="sr-only">
          Do you want an online store?
        </label>
        <select
          id={storeId}
          value={profile.onlineStore ? 'yes' : 'no'}
          onChange={(e) =>
            onChange({ ...profile, onlineStore: e.target.value === 'yes' })
          }
          className={cn(field, 'cursor-pointer appearance-none pr-2')}
        >
          <option value="no">no online store yet</option>
          <option value="yes">an online store</option>
        </select>
        .
      </p>

      <div
        className="mt-8 flex flex-col gap-5 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between"
        aria-live="polite"
      >
        {rec ? (
          <>
            <div>
              <p className="text-[1.15rem] font-semibold">
                {rec.plan.name} fits,{' '}
                <span className="pf-num">
                  {formatPrice(priceFor(rec.plan, period), rec.plan.currency)}
                  {priceFor(rec.plan, period) > 0 &&
                    (period === 'yearly' ? ' a year' : ' a month')}
                </span>
                .
              </p>
              <p className="mt-1 text-[0.92rem] text-ink-mute">
                {rec.reasons.join('. ')}.
              </p>
            </div>
            <Link
              href={`/signup?plan=${rec.plan.code}`}
              className="pf-btn pf-btn--paper shrink-0"
            >
              {isFree(rec.plan)
                ? `Start on ${rec.plan.name}`
                : `Try ${rec.plan.name} free`}
            </Link>
          </>
        ) : (
          <>
            <p className="text-[1.05rem]">
              That’s bigger than our listed plans. Let’s talk it through.
            </p>
            <a
              href={`mailto:${siteConfig.email}?subject=Plan%20for%20a%20larger%20pharmacy`}
              className="pf-btn pf-btn--paper shrink-0"
            >
              Email us
            </a>
          </>
        )}
      </div>
    </div>
  );
}
