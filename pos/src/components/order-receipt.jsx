import { dateTime, money } from '@/lib/format';

// Printable receipt for a completed sale. Rendered hidden on screen; a
// print-only stylesheet reveals just this block when window.print() runs.
export function OrderReceipt({ order, shopName = 'Medical Store' }) {
  if (!order) return null;
  const items = order.order_items || order.items || [];
  const line = (label, value) => (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );

  return (
    <div id="order-receipt" className="hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #order-receipt, #order-receipt * { visibility: visible; }
          #order-receipt { position: absolute; inset: 0; padding: 16px; }
        }
      `}</style>
      <div className="mx-auto max-w-sm text-sm">
        <div className="text-center">
          <div className="text-base font-bold">{shopName}</div>
          <div className="text-xs">Receipt {order.order_number}</div>
          <div className="text-xs">{dateTime(order.created_at)}</div>
        </div>

        <div className="my-2 border-y border-black py-1 text-xs">
          <div>Customer: {order.customer_name || 'Walk-in'}</div>
          {order.customer_phone && <div>Phone: {order.customer_phone}</div>}
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left">Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id || i}>
                <td className="text-left">{it.medicine_name || it.name || '—'}</td>
                <td className="text-right">{it.quantity}</td>
                <td className="text-right">{money(it.unit_price)}</td>
                <td className="text-right">{money(it.total_price ?? it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 space-y-0.5 border-t border-black pt-1 text-xs">
          {line('Subtotal', order.subtotal)}
          {Number(order.discount) > 0 && line('Discount', order.discount)}
          {Number(order.tax_amount) > 0 && line('Tax', order.tax_amount)}
          <div className="flex justify-between border-t border-black pt-1 font-bold">
            <span>Total</span>
            <span>{money(order.total_amount ?? order.total)}</span>
          </div>
        </div>

        <div className="mt-3 text-center text-xs">Thank you!</div>
      </div>
    </div>
  );
}
