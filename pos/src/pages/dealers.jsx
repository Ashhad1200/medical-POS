import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { customerServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { date } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function CustomerDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', phone: '', email: '', city: '', address: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => customerServices.create(f),
    onSuccess: () => {
      toast.success('Customer added');
      qc.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
      setF({ name: '', phone: '', email: '', city: '', address: '' });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={f.name} onChange={set('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={f.phone} onChange={set('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={f.city} onChange={set('city')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={f.email} onChange={set('email')} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={f.address} onChange={set('address')} />
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

export function DealersPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ['customers', { search }],
    queryFn: async () =>
      (await customerServices.getAll({ search: search || undefined, limit: 100 }))
        .data.data,
  });
  const rows = q.data?.customers || q.data || [];

  return (
    <>
      <PageHeader title="Dealers & customers" description="Your customer directory.">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New customer
        </Button>
      </PageHeader>

      <div className="mb-4 relative w-72">
        <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-8"
          placeholder="Search name, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone || '—'}</TableCell>
                <TableCell>{c.city || '—'}</TableCell>
                <TableCell>{date(c.created_at || c.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <CustomerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
