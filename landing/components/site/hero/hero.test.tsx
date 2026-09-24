// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Hero from './hero';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const live = () =>
  document.querySelector('[aria-live="polite"]')?.textContent ?? '';

// jsdom has no IntersectionObserver; this one reports "on screen" at once.
class OnScreenObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    this.cb(
      [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => setReducedMotion(false));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Hero', () => {
  it('states what the product does in three lines', () => {
    render(<Hero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Sell a strip at the counter.');
    expect(h1).toHaveTextContent('Your online store already knows.');
    expect(h1).toHaveTextContent('So does your reorder list.');
    expect(
      screen.getByRole('link', { name: 'Start free trial' }),
    ).toHaveAttribute('href', '/signup');
  });

  it('sells from the earliest-expiring batch and prints it on the receipt', async () => {
    const user = userEvent.setup();
    render(<Hero />);
    await user.click(
      screen.getByRole('button', { name: 'Sell 1 at the counter' }),
    );
    expect(live()).toBe('Sold 1 at the counter from batch B-2407. 13 left.');
    const receipt = screen.getByRole('figure', { name: 'Counter receipt' });
    expect(within(receipt).getByText('1 x BATCH B-2407')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Batch B-2407.*3 of 10 left/ }),
    ).toBeInTheDocument();
  });

  it('shows an online order on the store, from the same stock', async () => {
    const user = userEvent.setup();
    render(<Hero />);
    await user.click(screen.getByRole('button', { name: 'Order 1 online' }));
    expect(live()).toBe('Sold 1 online from batch B-2407. 13 left.');
    const store = screen.getByRole('figure', { name: 'Online store listing' });
    expect(within(store).getByText('13 in stock')).toBeInTheDocument();
  });

  it('runs the reorder loop: level reached, order placed, delivery received', async () => {
    const user = userEvent.setup();
    render(<Hero />);
    const sell = screen.getByRole('button', { name: 'Sell 1 at the counter' });
    for (let i = 0; i < 8; i++) await user.click(sell);
    expect(live()).toContain('Reached the reorder level.');

    // the full slip and the phone version both offer the order; either works
    await user.click(
      screen.getAllByRole('button', { name: 'Order 10 from Indus' })[0],
    );
    expect(live()).toBe('Order sent to the supplier.');

    await user.click(
      screen.getAllByRole('button', { name: 'Mark delivery received' })[0],
    );
    expect(live()).toBe('Delivery received as batch B-2502. 16 in stock.');
  });

  it('plays by itself while on screen', async () => {
    vi.stubGlobal('IntersectionObserver', OnScreenObserver);
    vi.useFakeTimers();
    render(<Hero />);
    expect(live()).toBe('');
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
    expect(live()).toBe('Sold 1 at the counter from batch B-2407. 13 left.');
  });

  it('stops playing for good once someone presses a button', async () => {
    vi.stubGlobal('IntersectionObserver', OnScreenObserver);
    vi.useFakeTimers();
    render(<Hero />);
    await act(async () => {
      screen.getByRole('button', { name: 'Order 1 online' }).click();
    });
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(live()).toBe('Sold 1 online from batch B-2407. 13 left.');
    expect(screen.getByText(/Your turn\./)).toBeInTheDocument();
  });

  it('never plays by itself when reduced motion is requested', async () => {
    setReducedMotion(true);
    vi.stubGlobal('IntersectionObserver', OnScreenObserver);
    vi.useFakeTimers();
    render(<Hero />);
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(live()).toBe('');
  });
});
