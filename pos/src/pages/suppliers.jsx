import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { supplierServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/auth/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function SupplierDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', email: '', phone: '', city: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => supplierServices.create(f),
    onSuccess: () => {
      toast.success('Supplier added');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      onOpenChange(false);
      setF({ name: '', email: '', phone: '', city: '' });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New supplier</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={f.name} onChange={set('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={f.email} onChange={set('email')} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={f.phone} onChange={set('phone')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={f.city} onChange={set('city')} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !f.name}>
            {mut.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SuppliersPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const canEdit = ['admin', 'manager'].includes(role);

  const q = useQuery({
    queryKey: ['suppliers', { search }],
    queryFn: async () =>
      (await supplierServices.getAll({ search: search || undefined, limit: 100 }))
        .data.data,
  });

  const toggle = useMutation({
    mutationFn: (id) => supplierServices.toggleStatus(id),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const rows = Array.isArray(q.data) ? q.data : q.data?.suppliers || [];

  return (
    <>
      <PageHeader title="Suppliers" description="Vendors and payment terms.">
        {canEdit && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New supplier
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 relative w-72">
        <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-8"
          placeholder="Search name, city"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="text-end">Credit limit</TableHead>
              <TableHead className="text-end">Terms</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead />}
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
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.supplierCode || s.supplier_code}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{s.email || '—'}</div>
                  <div className="text-xs text-muted-foreground">{s.phone}</div>
                </TableCell>
                <TableCell>{s.city || '—'}</TableCell>
                <TableCell className="text-end">
                  {money(s.creditLimit ?? s.credit_limit)}
                </TableCell>
                <TableCell className="text-end">
                  {s.paymentTerms ?? s.payment_terms ?? 30}d
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      (s.isActive ?? s.is_active) ? 'success' : 'secondary'
                    }
                    appearance="light"
                  >
                    {(s.isActive ?? s.is_active) ? 'active' : 'inactive'}
                  </Badge>
                </TableCell>
                {canEdit && (
                  <TableCell className="text-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle.mutate(s.id)}
                    >
                      {(s.isActive ?? s.is_active) ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No suppliers yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <SupplierDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
