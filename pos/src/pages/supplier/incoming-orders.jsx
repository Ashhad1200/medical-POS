import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supplierPortalServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const BADGE = {
  pending: 'warning',
  ordered: 'info',
  received: 'success',
  cancelled: 'destructive',
};

export function SupplierOrdersPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['supplier', 'orders'],
    queryFn: async () => (await supplierPortalServices.getIncomingOrders()).data.data,
  });
  const mut = useMutation({
    mutationFn: ({ id, status }) =>
      supplierPortalServices.updateIncomingOrder(id, { status }),
    onSuccess: () => {
      toast.success('Order updated');
      qc.invalidateQueries({ queryKey: ['supplier', 'orders'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const rows = q.data || [];

  return (
    <>
      <PageHeader title="Incoming orders" description="Purchase orders from connected pharmacies." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO</TableHead>
              <TableHead>Pharmacy</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-end">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="font-medium">{o.po_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {(o.items || []).length} lines
                  </div>
                </TableCell>
                <TableCell>{o.pharmacy_name}</TableCell>
                <TableCell>{dateTime(o.created_at)}</TableCell>
                <TableCell className="text-end">{money(o.total_amount)}</TableCell>
                <TableCell>
                  <Badge variant={BADGE[o.status] || 'secondary'} appearance="light">
                    {o.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-1">
                    {o.status === 'pending' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => mut.mutate({ id: o.id, status: 'ordered' })}>
                          Accept
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => mut.mutate({ id: o.id, status: 'cancelled' })}>
                          Reject
                        </Button>
                      </>
                    )}
                    {o.status === 'ordered' && (
                      <Button variant="ghost" size="sm" onClick={() => mut.mutate({ id: o.id, status: 'received' })}>
                        Mark fulfilled
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">No incoming orders yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
