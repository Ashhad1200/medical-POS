import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { b2bServices, supplierPortalServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
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

const BADGE = { requested: 'warning', accepted: 'success', rejected: 'destructive' };

export function ReturnsPage() {
  const { orgType } = useAuth();
  const isSupplier = orgType === 'supplier';
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const q = useQuery({
    queryKey: ['returns', orgType],
    queryFn: async () =>
      (isSupplier
        ? await supplierPortalServices.getReturns()
        : await b2bServices.getReturns()
      ).data.data,
  });

  const resolve = useMutation({
    mutationFn: ({ id, action }) =>
      supplierPortalServices.resolveReturn(id, { action }),
    onSuccess: () => {
      toast.success('Return updated');
      qc.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const rows = q.data || [];

  return (
    <>
      <PageHeader
        title="Returns"
        description={
          isSupplier
            ? 'Return requests from your pharmacies.'
            : 'Items you have sent back to suppliers.'
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO</TableHead>
              <TableHead>{isSupplier ? 'Pharmacy' : 'Supplier'}</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-end">Qty</TableHead>
              <TableHead className="text-end">Refund</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Raised</TableHead>
              {isSupplier && <TableHead className="text-end">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.po_number}</TableCell>
                <TableCell>{isSupplier ? r.pharmacy_name : r.supplier_name}</TableCell>
                <TableCell>{r.item_name || '—'}</TableCell>
                <TableCell className="text-end">{r.quantity}</TableCell>
                <TableCell className="text-end">{money(r.refund_amount)}</TableCell>
                <TableCell className="capitalize">{r.reason.replace('_', ' ')}</TableCell>
                <TableCell>
                  <Badge variant={BADGE[r.status] || 'secondary'} appearance="light">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>{dateTime(r.created_at)}</TableCell>
                {isSupplier && (
                  <TableCell className="text-end">
                    {r.status === 'requested' && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => resolve.mutate({ id: r.id, action: 'accept' })}>
                          Accept
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => resolve.mutate({ id: r.id, action: 'reject' })}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">No returns yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
