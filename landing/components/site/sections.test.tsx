// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BatchLife from './batch-life';
import Faq from './faq';
import { faqItems } from './faq-data';
import Header from './header';
import StorePreview from './store-preview';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StorePreview', () => {
  it('recolours the store when the owner picks a colour', async () => {
    const user = userEvent.setup();
    const { container } = render(<StorePreview />);
    const phone = container.querySelector<HTMLElement>('[style*="--acc"]')!;
    expect(phone.style.getPropertyValue('--acc')).toBe('#23507a');
    await user.click(screen.getByLabelText('Teal'));
    expect(phone.style.getPropertyValue('--acc')).toBe('#0f6b6b');
    expect(screen.getByLabelText('Teal')).toBeChecked();
  });
});

describe('Faq', () => {
  it('opens an answer when its question is pressed', async () => {
    const user = userEvent.setup();
    render(<Faq items={faqItems([])} />);
    const q = screen.getByText(
      'Does the online store sell prescription medicines?',
    );
    const details = q.closest('details')!;
    expect(details.open).toBe(false);
    await user.click(q);
    expect(details.open).toBe(true);
  });

  it('keeps every answer in the page, open or not', () => {
    render(<Faq items={faqItems([])} />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(10);
    // closed answers are still in the DOM (and so in the server HTML)
    expect(
      screen.getByText(/never appear on your online store/),
    ).toBeInTheDocument();
  });
});

describe('BatchLife', () => {
  it('fills the batch ledger as each step scrolls into view', () => {
    const observers: IntersectionObserverCallback[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          observers.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<BatchLife />);
    const ledger = screen.getByRole('list', { name: 'Batch history' });
    expect(ledger.children).toHaveLength(1);

    const step = document.querySelector('[data-step="3"]')!;
    act(() => {
      observers[0](
        [{ isIntersecting: true, target: step } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(ledger.children).toHaveLength(4);
    expect(ledger).toHaveTextContent(
      'Three weeks of sales, reorder level reached',
    );
  });
});

describe('Header', () => {
  it('opens the mobile menu and closes it when a link is chosen', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    // the menu code loads on demand
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getAllByRole('link', { name: 'Pricing' }).at(-1)!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the mobile menu with Escape', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
