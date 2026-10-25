// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventParams, track } from './analytics';

describe('analytics', () => {
  afterEach(() => {
    delete window.gtag;
  });

  it('keeps only product, plan and location', () => {
    expect(eventParams({ product: 'pharmaflow', plan: 'pro', location: 'hero' })).toEqual({ product: 'pharmaflow', plan: 'pro', location: 'hero' });
    // @ts-expect-error: unknown keys are not part of the type and are dropped
    expect(eventParams({ product: 'pharmaflow', email: 'a@b.co', name: 'Ali' })).toEqual({ product: 'pharmaflow' });
  });

  it('drops values that are not short slugs, so an address or phone number cannot leak', () => {
    expect(eventParams({ product: 'pharmaflow', plan: 'owner@pharmacy.com', location: '+1 555 0100' })).toEqual({ product: 'pharmaflow' });
  });

  it('sends nothing when the Google tag is not on the page', () => {
    expect(() => track('click_cta', { product: 'pharmaflow', location: 'hero' })).not.toThrow();
  });

  it('sends the event with the cleaned parameters', () => {
    window.gtag = vi.fn();
    track('sign_up', { product: 'pharmaflow', plan: 'basic' });
    expect(window.gtag).toHaveBeenCalledWith('event', 'sign_up', { product: 'pharmaflow', plan: 'basic' });
  });
});
