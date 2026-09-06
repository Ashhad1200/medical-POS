import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { OrderReceipt } from './order-receipt';

const order = {
  order_number: 'ORD-42',
  created_at: '2026-09-06T10:00:00Z',
  customer_name: 'Sana',
  customer_phone: '03001234567',
  subtotal: 300,
  discount: 20,
  tax_amount: 0,
  total_amount: 280,
  order_items: [
    { id: '1', medicine_name: 'Panadol', quantity: 2, unit_price: 50, total_price: 100 },
    { id: '2', medicine_name: 'ORS', quantity: 4, unit_price: 50, total_price: 200 },
  ],
};

describe('OrderReceipt', () => {
  it('renders the order number, customer, every line item and the totals', () => {
    render(<OrderReceipt order={order} shopName="Noor Pharmacy" />);

    expect(screen.getByText('Noor Pharmacy')).toBeInTheDocument();
    expect(screen.getByText(/ORD-42/)).toBeInTheDocument();
    expect(screen.getByText(/Sana/)).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Panadol')).toBeInTheDocument();
    expect(within(table).getByText('ORS')).toBeInTheDocument();

    // discount shows (non-zero) and total is the net
    expect(screen.getByText('Discount')).toBeInTheDocument();
    expect(screen.getByText(/280/)).toBeInTheDocument();
  });

  it('hides a zero discount / tax line', () => {
    render(
      <OrderReceipt
        order={{ ...order, discount: 0, tax_amount: 0 }}
      />,
    );
    expect(screen.queryByText('Discount')).not.toBeInTheDocument();
    expect(screen.queryByText('Tax')).not.toBeInTheDocument();
  });

  it('renders nothing without an order', () => {
    const { container } = render(<OrderReceipt order={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
