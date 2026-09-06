import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Minus, Plus, Search } from 'lucide-react';
import { b2bServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function ReorderPage() {
  const [supplierId, setSupplierId] = useState('');
  const [cart, setCart] = useState({}); // supplierProductId -> qty
  const [search, setSearch] = useState('');

  const suppliers = useQuery({
    queryKey: ['b2b', 'suppliers'],
    queryFn: async () => (await b2bServices.connectedSuppliers()).data.data,
  });

  const compare = useQuery({
    queryKey: ['b2b', 'search', search],
    queryFn: async () => (await b2bServices.search(search)).data.data,
    enabled: search.trim().length >= 2,
  });

  const chooseOffer = (offer) => {
    setSupplierId(offer.supplierOrgId);
    setSearch('');
    setCart((c) => ({ ...c, [offer.supplierProductId]: offer.moq }));
  };

  const catalogue = useQuery({
    queryKey: ['b2b', 'catalogue', supplierId],
    queryFn: async () => (await b2bServices.catalogue(supplierId)).data.data,
    enabled: !!supplierId,
  });

  const products = catalogue.data?.products || [];
  const conn = catalogue.data?.connection;

  const setQty = (id, q) =>
    setCart((c) => {
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const p = products.find((x) => x.id === id);
          return p ? { ...p, qty, lineTotal: Number(p.unit_price) * qty } : null;
        })
        .filter(Boolean),
    [cart, products],
  );
  const total = lines.reduce((n, l) => n + l.lineTotal, 0);
  const overLimit =
    conn?.credit_limit > 0 && total > Number(conn.credit_limit);
  const belowMoq = lines.some((l) => l.qty < l.moq);

  const place = useMutation({
    mutationFn: () =>
      b2bServices.order(supplierId, {
        items: lines.map((l) => ({ supplierProductId: l.id, quantity: l.qty })),
      }),
    onSuccess: (res) => {
      toast.success(`Order ${res.data.data.poNumber} sent`);
      setCart({});
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <>
      <PageHeader
        title="Reorder"
        description="Compare prices across your connected suppliers, then order."
      />

      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="w-72">
          <Select
            value={supplierId}
            onValueChange={(v) => {
              setSupplierId(v);
              setCart({});
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a supplier" />
            </SelectTrigger>
            <SelectContent>
              {(suppliers.data || []).map((s) => (
                <SelectItem key={s.supplier_org_id} value={s.supplier_org_id}>
                  {s.name}
                  {s.fill_rate != null ? ` · ${s.fill_rate}% fill` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suppliers.data && suppliers.data.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No active supplier connections — add one on the Connections page.
            </p>
          )}
        </div>

        <div className="relative w-72">
          <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder="Compare a product across suppliers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {search.trim().length >= 2 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            {compare.isLoading && (
              <div className="text-sm text-muted-foreground">Searching…</div>
            )}
            {(compare.data || []).map((g) => (
              <div key={g.name} className="border-b border-border py-2 last:border-0">
                <div className="mb-1 text-sm font-medium">{g.name}</div>
                <div className="flex flex-wrap gap-2">
                  {g.offers.map((o) => (
                    <button
                      key={o.supplierProductId}
                      onClick={() => chooseOffer(o)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                    >
                      <span className="font-medium">{o.supplierName}</span>{' '}
                      <span className="text-muted-foreground">
                        {money(o.unitPrice)} · MOQ {o.moq}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {compare.data && compare.data.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No connected supplier stocks that.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {supplierId && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-end">Unit price</TableHead>
                  <TableHead className="text-end">MOQ</TableHead>
                  <TableHead className="text-end">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogue.isLoading && (
                  <TableRow><TableCell colSpan={4} className="text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {products.map((p) => {
                  const qty = cart[p.id] || 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.manufacturer}{p.pack_size ? ` · ${p.pack_size}` : ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-end">{money(p.unit_price)}</TableCell>
                      <TableCell className="text-end">{p.moq}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            aria-label={`decrease ${p.name}`}
                            variant="outline"
                            size="icon"
                            className="size-7"
                            onClick={() => setQty(p.id, qty - (qty === p.moq ? p.moq : 1))}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-8 text-center">{qty}</span>
                          <Button
                            aria-label={`add ${p.name}`}
                            variant="outline"
                            size="icon"
                            className="size-7"
                            onClick={() => setQty(p.id, qty === 0 ? p.moq : qty + 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <Card className="h-fit">
            <CardContent className="space-y-3 p-5">
              <div className="text-sm font-semibold text-foreground">Order</div>
              {lines.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nothing selected.
                </p>
              ) : (
                <>
                  {lines.map((l) => (
                    <div key={l.id} className="flex justify-between text-sm">
                      <span className="truncate">{l.name} × {l.qty}</span>
                      <span>{money(l.lineTotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-2 font-semibold">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                  {conn?.credit_limit > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Credit limit {money(conn.credit_limit)}
                    </p>
                  )}
                  {overLimit && (
                    <p className="text-xs text-destructive">Over your credit limit.</p>
                  )}
                  {belowMoq && (
                    <p className="text-xs text-destructive">Some items are below their MOQ.</p>
                  )}
                </>
              )}
              <Button
                className="w-full"
                disabled={lines.length === 0 || overLimit || belowMoq || place.isPending}
                onClick={() => place.mutate()}
              >
                {place.isPending ? 'Sending…' : `Send order · ${money(total)}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
