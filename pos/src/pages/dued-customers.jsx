import { useQuery } from '@tanstack/react-query';
import { customerServices } from '@/lib/services';
import { money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function DuedCustomersPage() {
  const q = useQuery({
    queryKey: ['customers', 'dued'],
    queryFn: async () => (await customerServices.getDued()).data.data,
  });
  const rows = q.data?.customers || q.data || [];

  return (
    <>
      <PageHeader
        title="Dued customers"
        description="Customers with an outstanding balance."
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-end">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone || '—'}</TableCell>
                <TableCell className="text-end">
                  {money(c.balance ?? c.outstanding ?? c.due_amount ?? 0)}
                </TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No customers with a balance.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
