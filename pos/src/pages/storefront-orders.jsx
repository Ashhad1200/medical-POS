import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bike, Lock } from 'lucide-react';
import { storefrontServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { useAuth } from '@/auth/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STATUS_BADGE = {
  placed: 'warning',
  confirmed: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'destructive',
};
const NEXT = {
  placed: 'confirmed',
  confirmed: 'out_for_delivery',
  out_for_delivery: 'delivered',
};
const NEXT_LABEL = {
  confirmed: 'Confirm',
  out_for_delivery: 'Out for delivery',
  delivered: 'Mark delivered',
};

function RiderDialog({ order, open, onOpenChange, onSave, saving }) {
  const [name, setName] = useState(order?.rider_name || '');
  const [phone, setPhone] = useState(order?.rider_phone || '');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign rider — {order?.order_number}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>Rider name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rider phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave({ riderName: name, riderPhone: phone })}
            disabled={saving}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StorefrontOrdersPage() {
  const { hasFeature } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [riderFor, setRiderFor] = useState(null);

  const q = useQuery({
    queryKey: ['storefront', 'orders', { status }],
    queryFn: async () =>
      (
        await storefrontServices.getOrders(
          status === 'all' ? {} : { status },
        )
      ).data.data,
    enabled: hasFeature('storefront'),
    retry: false,
  });

  const mut = useMutation({
    mutationFn: ({ id, body }) => storefrontServices.updateOrder(id, body),
    onSuccess: () => {
      toast.success('Order updated');
      qc.invalidateQueries({ queryKey: ['storefront', 'orders'] });
      setRiderFor(null);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!hasFeature('storefront'))
    return (
      <>
        <PageHeader title="Store orders" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Lock className="size-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Available on the Pro and Enterprise plans.
            </div>
          </CardContent>
        </Card>
      </>
    );

  const rows = q.data || [];

  return (
    <>
      <PageHeader
        title="Store orders"
        description="Online orders from your storefront."
      />

      <div className="mb-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['all', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-end">Total</TableHead>
              <TableHead>Rider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="font-medium">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {(o.items || []).reduce((n, i) => n + i.quantity, 0)} items ·{' '}
                    {o.payment_method}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{o.customer_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.customer_phone} · {o.customer_city || '—'}
                  </div>
                </TableCell>
                <TableCell>{dateTime(o.placed_at)}</TableCell>
                <TableCell className="text-end">{money(o.total)}</TableCell>
                <TableCell>
                  {o.rider_name ? (
                    <span className="text-xs">
                      {o.rider_name}
                      <br />
                      {o.rider_phone}
                    </span>
                  ) : (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setRiderFor(o)}
                    >
                      assign
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_BADGE[o.status] || 'secondary'}
                    appearance="light"
                  >
                    {o.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-1">
                    {NEXT[o.status] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          mut.mutate({ id: o.id, body: { status: NEXT[o.status] } })
                        }
                      >
                        {NEXT_LABEL[NEXT[o.status]]}
                      </Button>
                    )}
                    {['placed', 'confirmed', 'out_for_delivery'].includes(o.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          mut.mutate({ id: o.id, body: { status: 'cancelled' } })
                        }
                      >
                        Cancel
                      </Button>
                    )}
                    {o.status === 'confirmed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRiderFor(o)}
                      >
                        <Bike className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No store orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {riderFor && (
        <RiderDialog
          order={riderFor}
          open
          saving={mut.isPending}
          onOpenChange={(v) => !v && setRiderFor(null)}
          onSave={(body) => mut.mutate({ id: riderFor.id, body })}
        />
      )}
    </>
  );
}
