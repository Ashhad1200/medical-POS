import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { supplierPortalServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const empty = {
  name: '',
  generic_name: '',
  manufacturer: '',
  pack_size: '',
  unit_price: '',
  moq: 1,
  is_active: true,
};

function ItemDialog({ open, onOpenChange, item }) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [f, setF] = useState(item ? { ...empty, ...item } : empty);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        ...f,
        unit_price: Number(f.unit_price) || 0,
        moq: Number(f.moq) || 1,
      };
      return isEdit
        ? supplierPortalServices.updateItem(item.id, payload)
        : supplierPortalServices.createItem(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Item updated' : 'Item added');
      qc.invalidateQueries({ queryKey: ['supplier', 'catalogue'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${item.name}` : 'New catalogue item'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={f.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Generic name</Label>
              <Input value={f.generic_name || ''} onChange={(e) => set('generic_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Manufacturer</Label>
              <Input value={f.manufacturer || ''} onChange={(e) => set('manufacturer', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pack size</Label>
              <Input value={f.pack_size || ''} onChange={(e) => set('pack_size', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit price</Label>
              <Input type="number" value={f.unit_price} onChange={(e) => set('unit_price', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Min order qty</Label>
              <Input type="number" value={f.moq} onChange={(e) => set('moq', e.target.value)} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !f.name}>
            {mut.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SupplierCataloguePage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(undefined);

  const q = useQuery({
    queryKey: ['supplier', 'catalogue'],
    queryFn: async () => (await supplierPortalServices.getCatalogue()).data.data,
  });

  const del = useMutation({
    mutationFn: (id) => supplierPortalServices.deleteItem(id),
    onSuccess: () => {
      toast.success('Removed');
      qc.invalidateQueries({ queryKey: ['supplier', 'catalogue'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const rows = q.data || [];

  return (
    <>
      <PageHeader title="Catalogue" description="What connected pharmacies can order from you.">
        <Button onClick={() => setDialog(null)}>
          <Plus className="size-4" /> New item
        </Button>
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead className="text-end">Unit price</TableHead>
              <TableHead className="text-end">MOQ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {rows.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  <div className="font-medium">{it.name}</div>
                  {it.generic_name && <div className="text-xs text-muted-foreground">{it.generic_name}</div>}
                </TableCell>
                <TableCell>{it.manufacturer || '—'}</TableCell>
                <TableCell className="text-end">{money(it.unit_price)}</TableCell>
                <TableCell className="text-end">{it.moq}</TableCell>
                <TableCell>
                  <Badge variant={it.is_active ? 'success' : 'secondary'} appearance="light">
                    {it.is_active ? 'active' : 'hidden'}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialog(it)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(it.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">Your catalogue is empty.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {dialog !== undefined && (
        <ItemDialog open onOpenChange={(v) => !v && setDialog(undefined)} item={dialog || undefined} />
      )}
    </>
  );
}
