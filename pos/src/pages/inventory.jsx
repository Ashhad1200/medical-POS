import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Search, Upload } from 'lucide-react';
import { medicineServices } from '@/lib/services';
import { InventoryImportDialog } from './inventory-import';
import { apiError } from '@/lib/api';
import { int, money } from '@/lib/format';
import { useAuth } from '@/auth/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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

const CATEGORIES = [
  'tablet',
  'capsule',
  'syrup',
  'injection',
  'cream',
  'drops',
  'other',
];

function stockBadge(qty, threshold) {
  if (qty <= 0)
    return (
      <Badge variant="destructive" appearance="light">
        out of stock
      </Badge>
    );
  if (qty <= (threshold ?? 10))
    return (
      <Badge variant="warning" appearance="light">
        low
      </Badge>
    );
  return (
    <Badge variant="success" appearance="light">
      in stock
    </Badge>
  );
}

const emptyNew = {
  name: '',
  generic_name: '',
  manufacturer: '',
  category: 'tablet',
  batch_number: '',
  expiry_date: '',
  cost_price: '',
  selling_price: '',
  quantity: '',
  low_stock_threshold: 10,
  prescription_required: false,
};

function ProductDialog({ open, onOpenChange, product }) {
  const qc = useQueryClient();
  const isEdit = !!product;
  const [f, setF] = useState(
    product
      ? {
          name: product.name || '',
          generic_name: product.generic_name || '',
          manufacturer: product.manufacturer || '',
          category: product.category || 'other',
          low_stock_threshold: product.low_stock_threshold ?? 10,
          prescription_required: !!product.prescription_required,
        }
      : emptyNew,
  );
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return medicineServices.update(product.id, {
          name: f.name,
          generic_name: f.generic_name || null,
          manufacturer: f.manufacturer,
          category: f.category,
          low_stock_threshold: Number(f.low_stock_threshold),
          prescription_required: f.prescription_required,
        });
      }
      return medicineServices.create({
        name: f.name,
        generic_name: f.generic_name || undefined,
        manufacturer: f.manufacturer,
        category: f.category,
        batch_number: f.batch_number || undefined,
        expiry_date: f.expiry_date || undefined,
        cost_price: Number(f.cost_price) || 0,
        selling_price: Number(f.selling_price) || 0,
        quantity: Number(f.quantity) || 0,
        low_stock_threshold: Number(f.low_stock_threshold),
        prescription_required: f.prescription_required,
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated' : 'Product added');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${product.name}` : 'New product'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={f.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Manufacturer</Label>
              <Input
                value={f.manufacturer}
                onChange={(e) => set('manufacturer', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Generic name</Label>
              <Input
                value={f.generic_name}
                onChange={(e) => set('generic_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={f.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isEdit && (
            <div className="rounded-md border border-border p-3">
              <div className="mb-2 text-sm font-medium">Opening batch</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Batch number</Label>
                  <Input
                    value={f.batch_number}
                    onChange={(e) => set('batch_number', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry date</Label>
                  <Input
                    type="date"
                    value={f.expiry_date}
                    onChange={(e) => set('expiry_date', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cost price</Label>
                  <Input
                    type="number"
                    value={f.cost_price}
                    onChange={(e) => set('cost_price', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Selling price</Label>
                  <Input
                    type="number"
                    value={f.selling_price}
                    onChange={(e) => set('selling_price', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={f.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Low-stock at</Label>
                  <Input
                    type="number"
                    value={f.low_stock_threshold}
                    onChange={(e) => set('low_stock_threshold', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {isEdit && (
            <div className="space-y-1.5">
              <Label>Low-stock threshold</Label>
              <Input
                type="number"
                className="w-32"
                value={f.low_stock_threshold}
                onChange={(e) => set('low_stock_threshold', e.target.value)}
              />
            </div>
          )}

          <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
            <span>
              <span className="font-medium">Prescription required</span>
              <span className="block text-xs text-muted-foreground">
                Rx items are hidden from the online storefront
              </span>
            </span>
            <Switch
              checked={f.prescription_required}
              onCheckedChange={(v) => set('prescription_required', v)}
            />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !f.name || !f.manufacturer}
          >
            {mut.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryPage() {
  const { role } = useAuth();
  const canEdit = ['admin', 'warehouse', 'manager'].includes(role);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [dialog, setDialog] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [importOpen, setImportOpen] = useState(false);

  const q = useQuery({
    queryKey: ['inventory', { search, stockFilter }],
    queryFn: async () =>
      (
        await medicineServices.getAll({
          search: search || undefined,
          stockFilter,
          limit: 100,
        })
      ).data.data,
  });

  const rows = q.data?.medicines || [];

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Products and batch-level stock (FEFO)."
      >
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" /> Import
            </Button>
            <Button onClick={() => setDialog(null)}>
              <Plus className="size-4" /> New product
            </Button>
          </div>
        )}
      </PageHeader>
      {canEdit && (
        <InventoryImportDialog open={importOpen} onOpenChange={setImportOpen} />
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-72">
          <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder="Search name or manufacturer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['all', 'in-stock', 'low-stock', 'out-of-stock'].map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('-', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-end">Qty</TableHead>
              <TableHead className="text-end">Price</TableHead>
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
            {rows.map((m) => {
              const qty = Number(m.total_quantity ?? m.quantity ?? 0);
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{m.name}</span>
                      {m.prescription_required && (
                        <Badge variant="info" appearance="light">
                          Rx
                        </Badge>
                      )}
                    </div>
                    {m.generic_name && (
                      <div className="text-xs text-muted-foreground">
                        {m.generic_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{m.manufacturer}</TableCell>
                  <TableCell className="capitalize">{m.category || '—'}</TableCell>
                  <TableCell className="text-end">{int(qty)}</TableCell>
                  <TableCell className="text-end">
                    {money(m.max_price ?? m.selling_price ?? 0)}
                  </TableCell>
                  <TableCell>{stockBadge(qty, m.low_stock_threshold)}</TableCell>
                  {canEdit && (
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDialog(m)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No products match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {dialog !== undefined && (
        <ProductDialog
          open
          onOpenChange={(v) => !v && setDialog(undefined)}
          product={dialog || undefined}
        />
      )}
    </>
  );
}
