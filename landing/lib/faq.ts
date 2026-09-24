import type { PublicPlan } from './api';
import { isFree, limitLabel } from './plans';

/** "Basic and Pro start with 14 days free, Enterprise with 30." built from the live plans. */
export function trialAnswer(plans: PublicPlan[]): string {
  const paid = plans.filter((p) => !isFree(p) && p.trial_days > 0);
  const free = plans.find((p) => isFree(p));

  // group plan names by trial length, longest-running group last
  const byDays = new Map<number, string[]>();
  for (const p of paid)
    byDays.set(p.trial_days, [...(byDays.get(p.trial_days) ?? []), p.name]);
  const groups = Array.from(byDays.entries()).sort((a, b) => a[0] - b[0]);

  const joinNames = (names: string[]) =>
    names.length <= 1
      ? names.join('')
      : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

  let trial = '';
  if (groups.length) {
    const [first, ...rest] = groups;
    trial = `${joinNames(first[1])} ${first[1].length > 1 ? 'start' : 'starts'} with ${first[0]} days free`;
    for (const [days, names] of rest)
      trial += `, ${joinNames(names)} with ${days}`;
    trial += '. ';
  }

  const freeLine = free
    ? `The ${free.name} plan has no time limit (${limitLabel(free.max_users, 'staff logins').toLowerCase()}, ${limitLabel(free.max_products, 'products').toLowerCase()}). `
    : '';

  return `${trial}${freeLine}You don’t need a card to start, and your data stays when you move to a paid plan.`.trim();
}
