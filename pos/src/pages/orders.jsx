import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderServices } from '@/lib/services';
import { dateTime, money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
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
  processing: 'info',
  cancelled: 'destructive',
  refunded: 'secondary',
};

export function OrdersPage() {
  const q = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await orderServices.getAll({ limit: 100 })).data.data,
  });
  const rows = q.data?.orders || [];

  return (
    <>
      <PageHeader title="Orders" description="Sales transactions." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-end">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link
                    to={`/orders/${o.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {o.order_number || o.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{o.customer_name || o.customerName || 'Walk-in'}</TableCell>
                <TableCell>{dateTime(o.created_at || o.createdAt)}</TableCell>
                <TableCell className="capitalize">
                  {o.payment_method || o.paymentMethod || '—'}
                </TableCell>
                <TableCell className="text-end">
                  {money(o.total_amount ?? o.totalAmount)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS[o.status] || 'secondary'}
                    appearance="light"
                  >
                    {o.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
