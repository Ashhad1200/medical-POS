import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { medicineServices } from '@/lib/services';
import { int, money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

function stockBadge(qty, threshold) {
  if (qty <= 0) return <Badge variant="destructive" appearance="light">out of stock</Badge>;
  if (qty <= (threshold ?? 10))
    return <Badge variant="warning" appearance="light">low</Badge>;
  return <Badge variant="success" appearance="light">in stock</Badge>;
}

export function InventoryPage() {
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

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
      />

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
            {rows.map((m) => {
              const qty = Number(m.total_quantity ?? m.quantity ?? 0);
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.name}</div>
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
                </TableRow>
              );
            })}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No products match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
