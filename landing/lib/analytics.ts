// Google Analytics 4 (same property as treevoxa.com). Loaded only on the public marketing pages.
// Events carry an allowlist of parameters, so no email, name or phone number can ever be sent.
export const GA_ID = 'G-6MZJQM6PCN';

const ALLOWED = ['product', 'plan', 'location'] as const;
type Param = (typeof ALLOWED)[number];
export type EventName = 'sign_up' | 'generate_lead' | 'click_cta';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Short slugs only (letters, digits, - and _): anything else, such as an address or a phone number, is dropped.
const SAFE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;

export function eventParams(params: Partial<Record<Param, string | null | undefined>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ALLOWED) {
    const value = params[key];
    if (typeof value === 'string' && SAFE.test(value)) out[key] = value.toLowerCase();
  }
  return out;
}

export function track(name: EventName, params: Partial<Record<Param, string | null | undefined>>): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, eventParams(params));
}
