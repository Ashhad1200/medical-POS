import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { orderServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS = {
  completed: 'success',
  pending: 'warning',
  cancelled: 'destructive',
};
const PAY = { paid: 'success', partial: 'warning', unpaid: 'destructive' };

export function OrderDetailPage() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await orderServices.getById(id)).data.data.order,
  });

  if (q.isLoading)
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (q.isError)
    return <div className="text-sm text-destructive">{apiError(q.error)}</div>;

  const o = q.data;
  const items = o.order_items || [];

  return (
    <>
      <Link
        to="/orders"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Orders
      </Link>
      <PageHeader title={o.order_number} description={dateTime(o.created_at)}>
        <Badge variant={STATUS[o.status] || 'secondary'} appearance="light">
          {o.status}
        </Badge>
        <Badge variant={PAY[o.payment_status] || 'secondary'} appearance="light">
          {o.payment_status}
        </Badge>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 text-sm font-semibold text-foreground">Customer</div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Name</dt>
                <dd>{o.customer_name || 'Walk-in'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{o.customer_phone || '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 text-sm font-semibold text-foreground">Payment</div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Method</dt>
                <dd className="capitalize">{o.payment_method}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paid</dt>
                <dd>{money(o.amount_paid)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Due</dt>
                <dd>{money(o.amount_due)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Change</dt>
                <dd>{money(o.change_given)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 text-sm font-semibold text-foreground">Totals</div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(o.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd>{money(o.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd>{money(o.tax_amount)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <dt>Total</dt>
                <dd>{money(o.total_amount)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-end">Unit price</TableHead>
              <TableHead className="text-end">Qty</TableHead>
              <TableHead className="text-end">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  {it.medicine_name || (
                    <span className="text-muted-foreground">
                      {String(it.medicine_id).slice(0, 8)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-end">{money(it.unit_price)}</TableCell>
                <TableCell className="text-end">{it.quantity}</TableCell>
                <TableCell className="text-end">{money(it.total_price)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
