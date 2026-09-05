import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { date, int, money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function Stat({ label, value, tone }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={`mt-1 text-xl font-semibold ${
            tone === 'red' ? 'text-red-600' : 'text-foreground'
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

const URGENCY = { expired: 'destructive', critical: 'destructive', urgent: 'warning' };

export function RtvSuggestionsPage() {
  const q = useQuery({
    queryKey: ['rtv-suggestions'],
    queryFn: async () =>
      (await api.get('/reports/rtv-suggestions')).data.data,
  });

  const d = q.data;
  const groups = d?.supplierGroups || [];

  return (
    <>
      <PageHeader
        title="RTV suggestions"
        description={`Batches within ${d?.daysThreshold ?? 60} days of expiry, grouped by supplier.`}
      />

      {q.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Batches" value={int(d?.summary?.totalBatches)} />
            <Stat
              label="Potential loss"
              value={money(d?.summary?.totalPotentialLoss)}
              tone="red"
            />
            <Stat label="Suppliers" value={int(d?.summary?.supplierCount)} />
            <Stat
              label="Expired / critical"
              value={`${int(d?.summary?.expired)} / ${int(d?.summary?.critical)}`}
              tone="red"
            />
          </div>

          {groups.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Nothing to return right now.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <Card key={g.supplierId || g.supplier_name}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-border p-4">
                      <div className="font-medium">
                        {g.supplierName || g.supplier_name || 'Unknown supplier'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {money(g.potentialLoss ?? g.potential_loss)} at risk
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead className="text-end">Qty</TableHead>
                          <TableHead>Urgency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(g.batches || g.items || []).map((b, idx) => (
                          <TableRow key={b.batchId || b.id || idx}>
                            <TableCell>{b.productName || b.product_name || b.name}</TableCell>
                            <TableCell>{b.batchNumber || b.batch_number}</TableCell>
                            <TableCell>{date(b.expiryDate || b.expiry_date)}</TableCell>
                            <TableCell className="text-end">
                              {int(b.quantity)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={URGENCY[b.urgency] || 'secondary'}
                                appearance="light"
                              >
                                {b.urgency || '—'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
