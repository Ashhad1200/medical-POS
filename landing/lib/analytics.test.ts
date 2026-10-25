// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventParams, track } from './analytics';

describe('analytics', () => {
  afterEach(() => {
    delete window.gtag;
  });

  it('keeps only product, plan and location', () => {
    expect(eventParams({ product: 'x', plan: 'pro', location: 'hero' })).toEqual({ product: 'x', plan: 'pro', location: 'hero' });
    // @ts-expect-error: unknown keys are not part of the type and are dropped
    expect(eventParams({ product: 'x', email: 'a@b.co', name: 'Ali' })).toEqual({ product: 'x' });
  });

  it('drops values that are not short slugs, so an address or phone number cannot leak', () => {
    expect(eventParams({ product: 'x', plan: 'owner@example.com', location: '+1 555 0100' })).toEqual({ product: 'x' });
  });

  it('resolves without sending when the Google tag is not on the page', async () => {
    await expect(track('click_cta', { product: 'x', location: 'hero' })).resolves.toBeUndefined();
  });

  it('sends the cleaned parameters and resolves when Google confirms the event', async () => {
    window.gtag = vi.fn((...args: unknown[]) => (args[2] as { event_callback: () => void }).event_callback());
    await track('sign_up', { product: 'x', plan: 'basic' });
    expect(window.gtag).toHaveBeenCalledWith('event', 'sign_up', expect.objectContaining({ product: 'x', plan: 'basic' }));
  });

  it('resolves after a second even if Google never confirms', async () => {
    vi.useFakeTimers();
    window.gtag = vi.fn();
    const done = track('sign_up', { product: 'x' });
    vi.advanceTimersByTime(1000);
    await expect(done).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
