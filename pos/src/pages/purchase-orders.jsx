import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { purchaseOrderServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { date, money } from '@/lib/format';
import { useAuth } from '@/auth/auth-context';
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

const STATUS = {
  draft: 'secondary',
  pending: 'warning',
  ordered: 'info',
  received: 'success',
  cancelled: 'destructive',
};

export function PurchaseOrdersPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const canAct = ['admin', 'manager'].includes(role);

  const q = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () =>
      (await purchaseOrderServices.getAll({ limit: 100 })).data.data,
  });

  const act = useMutation({
    mutationFn: ({ id, action }) => purchaseOrderServices[action](id),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const rows = q.data?.purchaseOrders || q.data?.orders || [];

  return (
    <>
      <PageHeader title="Purchase orders" description="Restocking from suppliers." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Order date</TableHead>
              <TableHead className="text-end">Total</TableHead>
              <TableHead>Status</TableHead>
              {canAct && <TableHead />}
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
            {rows.map((po) => {
              const status = po.status;
              return (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">
                    {po.po_number || po.poNumber}
                  </TableCell>
                  <TableCell>
                    {po.supplier_name || po.supplierName || '—'}
                  </TableCell>
                  <TableCell>{date(po.order_date || po.orderDate)}</TableCell>
                  <TableCell className="text-end">
                    {money(po.total_amount ?? po.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS[status] || 'secondary'}
                      appearance="light"
                    >
                      {status}
                    </Badge>
                  </TableCell>
                  {canAct && (
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              act.mutate({ id: po.id, action: 'approve' })
                            }
                          >
                            Approve
                          </Button>
                        )}
                        {status === 'ordered' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              act.mutate({ id: po.id, action: 'receive' })
                            }
                          >
                            Receive
                          </Button>
                        )}
                        {['draft', 'pending', 'ordered'].includes(status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              act.mutate({ id: po.id, action: 'cancel' })
                            }
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No purchase orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
